import mongoose from 'mongoose';
import { Chat } from '../models/chat.model.js';
import { User } from '../models/user.model.js';
import { Vendor } from '../models/vendor.model.js';
import { VendorFreeMinutes } from '../models/vendorFreeMinutes.model.js';
import { VENDOR_FREE_MINUTES_POOL } from '../services/CallBilling.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';


const chatCommonAggregation = () => {
    return [
        {
            $lookup: {
                from: "users",
                let: { participantIds: "$participants" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $in: ["$_id", "$$participantIds"] }
                        }
                    },
                    {
                        $project: {
                            password: 0,
                            refreshToken: 0,
                            forgotPasswordToken: 0,
                            forgotPasswordExpiry: 0,
                            emailVerificationToken: 0,
                            emailVerificationExpiry: 0,
                        },
                    },
                ],
                as: "userParticipants",
            },
        },
        {
            $lookup: {
                from: "vendors",
                let: { participantIds: "$participants" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $in: ["$_id", "$$participantIds"] }
                        }
                    },

                ],
                as: "vendorParticipants",
            },
        },
        {
            $addFields: {
                participants: { $concatArrays: ["$userParticipants", "$vendorParticipants"] }
            }
        },
        {
            $project: {
                userParticipants: 0,
                vendorParticipants: 0
            }
        },
        {
            // lookup for the chat's admin (the id of whoever created it) -
            // looked up against both users and vendors, same as the
            // participants lookup above, since either side can be the
            // creator. Previously this only checked "users", so any chat
            // an astrologer initiated (admin = a vendor id) resolved to
            // null here - the app then crashed indexing into it.
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "admin",
                as: "adminUser",
                pipeline: [
                    {
                        $project: {
                            password: 0,
                            refreshToken: 0,
                            forgotPasswordToken: 0,
                            forgotPasswordExpiry: 0,
                            emailVerificationToken: 0,
                            emailVerificationExpiry: 0,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "vendors",
                foreignField: "_id",
                localField: "admin",
                as: "adminVendor",
            },
        },
        {
            // lookup for the group chats
            $lookup: {
                from: "chatmessages",
                foreignField: "_id",
                localField: "lastMessage",
                as: "lastMessage",
                pipeline: [
                    {
                        // get details of the sender - same fix as admin
                        // above: a message can be sent by either side, so
                        // this has to check vendors too, not just users.
                        $lookup: {
                            from: "users",
                            foreignField: "_id",
                            localField: "sender",
                            as: "senderUser",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        avatar: 1,
                                        email: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $lookup: {
                            from: "vendors",
                            foreignField: "_id",
                            localField: "sender",
                            as: "senderVendor",
                            pipeline: [
                                {
                                    $project: {
                                        name: 1,
                                        avatar: 1,
                                        email: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            sender: { $first: { $concatArrays: ["$senderUser", "$senderVendor"] } },
                        },
                    },
                    {
                        $project: {
                            senderUser: 0,
                            senderVendor: 0,
                        },
                    },
                ],
            },
        },
        {
            // Single $addFields stage covering both fields - previously
            // this was written as two separate `$addFields` keys in the
            // same object literal, which is invalid: the second silently
            // overwrote the first, so lastMessage never actually got
            // unwrapped from its lookup array into a single object.
            $addFields: {
                lastMessage: { $first: "$lastMessage" },
                admin: { $first: { $concatArrays: ["$adminUser", "$adminVendor"] } },
            },
        },
        {
            $project: {
                adminUser: 0,
                adminVendor: 0,
            },
        },
    ];
};

export const createOrGetAOneOnOneChat = asyncHandler(async (req, res) => {
    const { receiverId } = req.params;

    // Check if it's a valid receiver
    let receiver = await User.findById(receiverId);
    let receiverIsVendor = false;

    if (!receiver) {
        receiver = await Vendor.findById(receiverId);
        receiverIsVendor = true;
    }

    if (!receiver) {
        throw new ApiError(404, "Receiver does not exist");
    }

    // check if receiver is not the user who is requesting a chat
    if (receiver._id.toString() === req.auth._id.toString()) {
        throw new ApiError(400, "You cannot chat with yourself");
    }

    // Server-side balance gate - unlike calls (call.controller.js's
    // /api/call/start), chat had no equivalent check before this: billing
    // only ever happened after the fact via self-reported duration in
    // trans.controller.js, capped at whatever wallet existed (including
    // ₹0) rather than ever refusing to bill. A customer with nothing
    // available could open unlimited free chats. Reject here, before any
    // chat thread is created, mirroring startCall's own gate exactly
    // (same unit handling: freeMinutesRemaining/vendor free minutes are a
    // minute-count bypass, not added arithmetically to the rupee wallet).
    if (req.auth.constructor.modelName === "User" && receiverIsVendor) {
        let vendorFreeAvailable = 0;
        if (receiver.isFreeMinutesEnabled) {
            const usage = await VendorFreeMinutes.findOne({ userId: req.auth._id, vendorId: receiver._id }).select("freeMinutesUsed");
            vendorFreeAvailable = Math.max(0, VENDOR_FREE_MINUTES_POOL - (usage?.freeMinutesUsed || 0));
        }
        const hasFreeMinutes = Number(req.auth.freeMinutesRemaining) > 0 || vendorFreeAvailable >= 1;
        const availableBalance = Number(req.auth.walletAmount);
        if (!hasFreeMinutes && availableBalance < receiver.chatRate) {
            throw new ApiError(402, "Insufficient balance to start this chat");
        }
    }

    const chat = await Chat.aggregate([
        {
            $match: {
                isGroupChat: false, // avoid group chats. This controller is responsible for one on one chats
                // Also, filter chats with participants having receiver and logged in user only
                $and: [
                    {
                        participants: { $elemMatch: { $eq: req.auth._id } },
                    },
                    {
                        participants: {
                            $elemMatch: { $eq: new mongoose.Types.ObjectId(receiverId) },
                        },
                    },
                ],
            },
        },
        ...chatCommonAggregation(),
    ]);

    if (chat.length) {
        // if we find the chat that means user already has created a chat
        return res
            .status(200)
            .json(new ApiResponse(200, chat[0], "Chat retrieved successfully"));
    }

    // if not we need to create a new one on one chat
    const newChatInstance = await Chat.create({
        name: "One on one chat",
        participants: [req.auth._id, new mongoose.Types.ObjectId(receiverId)], // add receiver and logged in user as participants
        admin: req.auth._id,
    });

    // structure the chat as per the common aggregation to keep the consistency
    const createdChat = await Chat.aggregate([
        {
            $match: {
                _id: newChatInstance._id,
            },
        },
        ...chatCommonAggregation(),
    ]);

    const payload = createdChat[0]; // store the aggregation result

    if (!payload) {
        throw new ApiError(500, "Internal server error");
    }

    // logic to emit socket event about the new chat added to the participants
    payload?.participants?.forEach((participant) => {
        if (participant._id.toString() === req.auth._id.toString()) return; // don't emit the event for the logged in use as he is the one who is initiating the chat

        // emit event to other participants with new chat as a payload
        // emitSocketEvent(
        //     req,
        //     participant._id?.toString(),
        //     ChatEventEnum.NEW_CHAT_EVENT,
        //     payload
        // );
    });

    return res
        .status(201)
        .json(new ApiResponse(201, payload, "Chat retrieved successfully"));
});


export const searchAvailableUsers = asyncHandler(async (req, res) => {
    const users = await User.aggregate([
        {
            $match: {
                _id: {
                    $ne: req.auth._id, // avoid logged in user
                },
            },
        },
        {
            $project: {
                avatar: 1,
                name: 1,
                email: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, users, "Users fetched successfully"));
});

export const endChat = asyncHandler(async (req, res) => {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new ApiError(404, "Chat does not exist");
    }
    if (!chat.participants.some((p) => p.toString() === req.auth._id.toString())) {
        throw new ApiError(403, "You are not a participant of this chat");
    }

    chat.endedAt = new Date();
    chat.endedBy = req.auth.constructor.modelName === "Vendor" ? "vendor" : "user";
    await chat.save();

    return res
        .status(200)
        .json(new ApiResponse(200, chat, "Chat session ended"));
});

export const getAllChats = asyncHandler(async (req, res) => {

    console.log(req.auth);

    const chats = await Chat.aggregate([
        {
            $match: {
                participants: { $elemMatch: { $eq: req.auth._id } }, // get all chats that have logged in user as a participant
            },
        },
        {
            $sort: {
                updatedAt: -1,
            },
        },
        ...chatCommonAggregation(),

    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(200, chats || [], "User chats fetched successfully!")
        );
});
