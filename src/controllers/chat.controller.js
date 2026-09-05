import mongoose from 'mongoose';
import { Chat } from '../models/chat.model.js';
import { User } from '../models/user.model.js';
import { Vendor } from '../models/vendor.model.js';
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
            // lookup for the participants present
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "admin",
                as: "admin",
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
            // lookup for the group chats
            $lookup: {
                from: "chatmessages",
                foreignField: "_id",
                localField: "lastMessage",
                as: "lastMessage",
                pipeline: [
                    {
                        // get details of the sender
                        $lookup: {
                            from: "users",
                            foreignField: "_id",
                            localField: "sender",
                            as: "sender",
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
                        $addFields: {
                            sender: { $first: "$sender" },
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                lastMessage: { $first: "$lastMessage" },
            },
            $addFields: {
                admin: { $first: "$admin" },
            },
        },
    ];
};

export const createOrGetAOneOnOneChat = asyncHandler(async (req, res) => {
    const { receiverId } = req.params;

    // Check if it's a valid receiver
    let receiver = await User.findById(receiverId);

    if (!receiver) {
        receiver = await Vendor.findById(receiverId);
    }

    if (!receiver) {
        throw new ApiError(404, "Receiver does not exist");
    }

    // check if receiver is not the user who is requesting a chat
    if (receiver._id.toString() === req.auth._id.toString()) {
        throw new ApiError(400, "You cannot chat with yourself");
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
