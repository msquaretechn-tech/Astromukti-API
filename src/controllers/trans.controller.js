import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { RemedyModel, GiftTransactionModel, TransactionModel, WithdrawTransactionModel } from "../models/trans.model.js";
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Vendor } from '../models/vendor.model.js';
import { CallSession } from '../models/callSession.model.js';
import { logToFile } from '../utils/logger.js';
import { billCallSession } from '../services/CallBilling.js';


// Create Transaction
export const createTransaction = asyncHandler(async (req, res) => {

    const startTime = Date.now();
    const clientIp =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.connection.remoteAddress ||
        "unknown";

    const { userId } = req.query;
    const { vendorId, type, disconnectedBy, isConnected } = req.body;
    let { duration } = req.body;

    // When the client reports which CallSession this billing is for, use the
    // server's own computed duration instead of the client-reported one -
    // durationSeconds is authoritative (derived from startedAt/lastHeartbeatAt
    // on the server), not something the app can misreport. channelId is only
    // sent by app builds updated to use /api/call/* - older installs keep
    // hitting the legacy path below unchanged.
    const { channelId } = req.body;
    let callSession = null;
    if (channelId) {
        callSession = await CallSession.findOne({ channelId });
        if (!callSession) {
            throw new ApiError(404, "Call session not found");
        }
        if (callSession.userId.toString() !== userId) {
            throw new ApiError(403, "You are not a part of this call session");
        }

        // Check for an already-recorded transaction before touching any wallet
        // balance, so a retry (e.g. the client not seeing the first response)
        // can't double-bill. The unique index on callSessionId below is a
        // backstop for the narrow window where two requests race past this
        // check concurrently, not the primary guard.
        const existingForSession = await TransactionModel.findOne({ callSessionId: callSession._id });
        if (existingForSession) {
            logToFile(`🟡 DUPLICATE BILLING PREVENTED (pre-check) | session=${callSession._id}, existingTx=${existingForSession._id}`, "trans");
            return res.json(new ApiResponse(200, existingForSession, "Transaction already recorded for this call"));
        }

        duration = callSession.durationSeconds / 60;
        logToFile(`🔵 USING CALLSESSION DURATION | session=${callSession._id}, durationSeconds=${callSession.durationSeconds}`, "trans");
    } else {
        logToFile(`🟡 LEGACY DURATION | no channelId supplied, trusting client-reported duration=${duration}`, "trans");
    }

    logToFile(
        `🟢 START | user=${userId}, vendor=${vendorId}, ip=${clientIp}, type=${type}, duration=${duration}, isConnected=${isConnected}, disconnectedBy=${disconnectedBy}`,
        "trans"
    );

    // ================= FETCH USER & VENDOR =================

    console.log(userId);

    const user = await User.findById(userId, { walletAmount: 1, freeMinutesRemaining: 1 });

    console.log(user);


    const vendor = await Vendor.findById(vendorId, {
        walletAmount: 1,
        commissionAmount: 1,
        callRate: 1,
        chatRate: 1,
        videoCallRate: 1
    });

    if (!user) {
        logToFile(`❌ USER NOT FOUND | user=${userId}`, "trans");
        throw new ApiError(400, "User not found");
    }

    if (!vendor) {
        logToFile(`❌ VENDOR NOT FOUND | vendor=${vendorId}`, "trans");
        throw new ApiError(400, "Vendor not found");
    }

    // ================= CALL STATUS =================

    let status = "success";

    if (disconnectedBy && isConnected?.toString() === "false") {
        status = "dropped";
    } else if (isConnected?.toString() === "false") {
        status = "failed";
    }

    logToFile(`🔵 STATUS RESOLVED | status=${status}`, "trans");

    // When this billing is for a tracked CallSession and the client agrees
    // it actually connected, delegate to the exact same billing logic
    // endCall already runs the moment the session completes - this call
    // almost always just finds that transaction already made and returns
    // it, rather than being the only thing billing depends on. The legacy
    // path below (no channelId) and the dropped/failed cases are untouched.
    if (callSession && status === "success") {
        const billing = await billCallSession(callSession, { source: "createTransaction" });
        if (billing.transaction) {
            const message = billing.alreadyBilled
                ? "Transaction already recorded for this call"
                : "Transaction completed successfully";
            return res.json(new ApiResponse(200, billing.transaction, message));
        }
        if (billing.reason === "user_or_vendor_not_found") {
            throw new ApiError(400, "User or vendor not found");
        }
        // session_not_billable - the client is reporting a connected call
        // for a session the server hasn't marked ended yet.
        throw new ApiError(409, "This call session has not ended yet");
    }

    // ================= RATE =================

    let currentRate = 1;
    if (type === "audio") currentRate = vendor.callRate;
    if (type === "chat") currentRate = vendor.chatRate;
    if (type === "video") currentRate = vendor.videoCallRate;

    // ================= TIME =================

    const minTime = Math.max(1, Math.ceil(duration));

    // New-user promo: 5 free minutes shared across chat/call/video, applied
    // before any rate math - the astrologer isn't paid for this portion, so
    // it's simplest to just shrink the billable minute count up front. This
    // is separate from (and unrelated to) the freePromoAmount reads/writes
    // below, which are pre-existing dead code (see AstroMukti-FINDINGS.md M6)
    // left untouched.
    const freeMinutesApplied = Math.min(minTime, Number(user.freeMinutesRemaining) || 0);
    const billableMinutes = minTime - freeMinutesApplied;

    // ================= AMOUNTS =================

    const walletAmount = Number(user.walletAmount);
    const freePromoAmount = Number(user.freePromoAmount);


    let usableFreeAmount = 0;
    let finalDeduction = billableMinutes * currentRate;
    let description = "";
    const minAmount = currentRate * billableMinutes;

    logToFile(
        `🔵 BILLING INPUT | rate=${currentRate}, minTime=${minTime}, wallet=${walletAmount}, freePromo=${freePromoAmount}`,
        "trans"
    );

    // ================= BILLING =================

    if (status === "success") {


        // Wallet safety
        if (finalDeduction > walletAmount) {
            logToFile(
                `⚠️ WALLET CAP APPLIED | wallet=${walletAmount}, attempted=${finalDeduction}`,
                "trans"
            );
            finalDeduction = walletAmount;
        }

        description = `
        Total Amount: ₹${minAmount}
        Free Used: ₹${usableFreeAmount}
        User Paid: ₹${finalDeduction}
        Remaining Free: ₹${freePromoAmount - usableFreeAmount}
        `;

    } else {
        finalDeduction = 0;
        usableFreeAmount = 0;
        description = `Call ${status}. No amount deducted.`;
    }
    logToFile(
        `🟢 BILLING RESULT | total=${minAmount}, freeUsed=${usableFreeAmount}, paid=${finalDeduction}`,
        "trans"
    );

    // ================= UPDATE USER & VENDOR =================

    if (status === "success") {

        logToFile(
            `🔵 USER UPDATE | oldWallet=${walletAmount}, oldFree=${freePromoAmount}`,
            "trans"
        );

        await User.findByIdAndUpdate(userId, {
            walletAmount: Math.max(0, walletAmount - finalDeduction).toFixed(2),
            freePromoAmount: Math.max(0, freePromoAmount - usableFreeAmount).toFixed(2),
            freeMinutesRemaining: (Number(user.freeMinutesRemaining) || 0) - freeMinutesApplied,
        });

        logToFile(
            `🟢 USER UPDATED | newWallet=${walletAmount - finalDeduction}, newFree=${freePromoAmount - usableFreeAmount}`,
            "trans"
        );

        await Vendor.findByIdAndUpdate(vendorId, {
            walletAmount: vendor.walletAmount + finalDeduction * 0.4,
            commissionAmount: vendor.commissionAmount + finalDeduction * 0.6
        });

        logToFile(
            `🟢 VENDOR UPDATED | vendorEarned=${finalDeduction * 0.4}, commission=${finalDeduction * 0.6}`,
            "trans"
        );
    }

    // ================= SAVE TRANSACTION =================

    const transaction = await TransactionModel.create({
        userId,
        vendorId,
        status,
        amount: Math.ceil(finalDeduction),
        type,
        duration: minTime,
        description
    });

    const execTime = Date.now() - startTime;

    logToFile(
        `✅ SUCCESS | TxID=${transaction._id}, user=${userId}, vendor=${vendorId}, status=${status}, amount=${finalDeduction}, time=${execTime}ms`,
        "trans"
    );

    return res.json(new ApiResponse(200, transaction, "Transaction completed successfully"));

});
// Read All Transactions
export const getAllTransactions = asyncHandler(async (req, res) => {

    const { vendorId, userId, type, fromDate, toDate } = req.query;

    let filter = {};

    if (vendorId) {
        filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }
    if (userId) {
        filter.userId = new mongoose.Types.ObjectId(userId);
    }
    if (type) {

        if (type === "call") {
            filter.type = { $in: ['audio', 'private', 'anonymous'] };

        } else {
            filter.type = type;
        }
    }

    if (fromDate && toDate) {
        filter.createdAt = {
            $gte: new Date(fromDate),
            $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
        };
    }

    // const transactions = await TransactionModel.find();
    const transactions = await TransactionModel.aggregate([
        {
            $match: filter
        },
        {
            $lookup: {
                from: "users",
                let: { userId: "$userId" },
                pipeline: [
                    {
                        $match: { $expr: { $eq: ["$_id", "$$userId"] } }
                    },
                    {
                        $project: {
                            _id: 1,
                            uid: 1,
                            name: 1,
                            lastName: 1,
                            mobile: 1,
                            avatar: 1,
                            email: 1,
                            gender: 1,
                            dob: 1,
                            dobTime: 1,
                            birthPlace: 1,
                            createdAt: 1,
                        },
                    },
                ],
                as: "userDetails",
            },
        },
        {
            $lookup: {
                from: "chats",
                let: {
                    userId: "$userId",
                    vendorId: "$vendorId"
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $in: ["$$userId", "$participants"] },
                                    { $in: ["$$vendorId", "$participants"] }
                                ]
                            }
                        }
                    },
                    {
                        $project: { _id: 1, },
                    },
                ],
                as: "chatDetails"
            }
        },
        {
            $lookup: {
                from: "vendors",
                let: { vendorId: "$vendorId" },
                pipeline: [
                    {
                        $match: { $expr: { $eq: ["$_id", "$$vendorId"] } }
                    },
                    {
                        $project: {
                            _id: 1,
                            uid: 1,
                            name: 1,
                            lastName: 1,
                            mobile: 1,
                            avatar: 1,
                            email: 1,
                            gender: 1,
                            dob: 1,
                            birthPlace: 1,
                            createdAt: 1,
                            blockedUsers: 1,
                            callRate: 1,
                            videoCallRate: 1,
                            chatRate: 1,
                            emergencyCallRate: 1,
                            privateCallRate: 1,
                            anonymousCallRate: 1,
                        },
                    },
                ],
                as: "vendorDetails",
            },
        },
        {
            $addFields: {
                userDetails: { $arrayElemAt: ["$userDetails", 0] },
                vendorDetails: {
                    $mergeObjects: [
                        { $arrayElemAt: ["$vendorDetails", 0] },
                    ]
                },
            },
        },
        {
            $addFields: {
                isBlocked: {
                    $cond: {
                        if: { $isArray: "$vendorDetails.blockedUsers" },
                        then: { $in: ['$userDetails._id', '$vendorDetails.blockedUsers'] },
                        else: false
                    }
                }
            },
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);


    return res.json(new ApiResponse(200, transactions, "Transactions retrieved successfully"));
});

// Read Transaction by ID
export const getTransactionById = asyncHandler(async (req, res) => {
    const transaction = await TransactionModel.findById(req.params.id);

    if (!transaction) {
        return res.status(404).json(new ApiResponse(404, null, "Transaction not found"));
    }

    return res.json(new ApiResponse(200, transaction, "Transaction retrieved successfully"));
});

export const getTransactionsEarning = asyncHandler(async (req, res) => {
    const { id, fromDate, toDate } = req.params;

    // Set today's date
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    // Set the start of the current week (Sunday as the start of the week)
    const thisWeekStart = new Date(todayStart);
    thisWeekStart.setUTCDate(todayStart.getUTCDate() - todayStart.getUTCDay());

    // Set the start of the current month
    const thisMonthStart = new Date(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), 1);

    // Set the start of the last week
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 7);

    // Set the start of the last month
    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setUTCMonth(thisMonthStart.getUTCMonth() - 1);

    let filter = {
        vendorId: new mongoose.Types.ObjectId(id)
    };

    if (fromDate && toDate) {
        filter.createdAt = {
            $gte: new Date(fromDate),
            $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
        };
    }
    // Aggregate earnings data
    const totalTransactions = await TransactionModel.aggregate([
        {
            $match: filter
        },
        {
            $group: {
                _id: null,
                totalEarning: {
                    $sum: "$amount"
                },
                todayEarning: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $gte: ["$createdAt", todayStart] },
                                    { $lte: ["$createdAt", todayEnd] }
                                ]
                            },
                            "$amount",
                            0
                        ]
                    }
                },
                weeklyEarning: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $gte: ["$createdAt", thisWeekStart] },
                                    { $lte: ["$createdAt", todayEnd] }
                                ]
                            },
                            "$amount",
                            0
                        ]
                    }
                },
                monthlyEarning: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $gte: ["$createdAt", thisMonthStart] },
                                    { $lte: ["$createdAt", todayEnd] }
                                ]
                            },
                            "$amount",
                            0
                        ]
                    }
                }
            }
        }
    ]);

    // If no transactions found, initialize earnings to 0
    const result = {
        todayEarning: totalTransactions[0]?.todayEarning ?? 0,
        weeklyEarning: totalTransactions[0]?.weeklyEarning ?? 0,
        monthlyEarning: totalTransactions[0]?.monthlyEarning ?? 0,
        totalEarning: totalTransactions[0]?.totalEarning ?? 0
    };

    return res.json(new ApiResponse(200, result, "Transactions retrieved successfully"));
});

// GET MY EARNINGS ( Vendor )
export const getMyEarnings = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { period, type } = req.query; // Expect 'daily', 'weekly', or 'monthly'

    let filter = {
        vendorId: new mongoose.Types.ObjectId(vendorId)
    };

    if (type) {
        filter = {
            vendorId: new mongoose.Types.ObjectId(vendorId),
            type: type
        }
    }

    let groupStage = {};
    let sortStage = {};

    if (period === 'weekly') {
        // Group by year and week number for weekly aggregation
        groupStage = {
            _id: {
                year: { $year: "$createdAt" },
                week: { $isoWeek: "$createdAt" }
            },
            totalAmount: { "$sum": "$amount" },
            totalDuration: { "$sum": "$duration" },
            totalTransactions: { "$sum": 1 }, // Count the number of transactions
            type: { "$addToSet": "$type" }
        };
        // Sort by year and week number in descending order
        sortStage = {
            "_id.year": -1,
            "_id.week": -1
        };
    } else if (period === 'monthly') {
        // Group by year and month for monthly aggregation
        groupStage = {
            _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" }
            },
            totalAmount: { "$sum": "$amount" },
            totalDuration: { "$sum": "$duration" },
            totalTransactions: { "$sum": 1 }, // Count the number of transactions
            type: { "$addToSet": "$type" }
        };
        // Sort by year and month in descending order
        sortStage = {
            "_id.year": -1,
            "_id.month": -1
        };
    } else {
        // Default to daily aggregation
        groupStage = {
            _id: {
                "$dateToString": { "format": "%Y-%m-%d", "date": "$createdAt" }
            },
            totalAmount: { "$sum": "$amount" },
            totalDuration: { "$sum": "$duration" },
            totalTransactions: { "$sum": 1 }, // Count the number of transactions
            type: { "$addToSet": "$type" }
        };
        // Sort by date string in descending order
        sortStage = {
            "_id": -1
        };
    }

    // Aggregate earnings data
    const totalTransactions = await TransactionModel.aggregate([
        {
            $match: filter
        },
        {
            $group: groupStage
        },
        {
            $sort: sortStage
        }
    ]);

    return res.json(new ApiResponse(200, totalTransactions, "Transactions retrieved successfully"));
});

// Update Transaction by ID
export const updateTransactionById = asyncHandler(async (req, res) => {
    const { userId, transactionStatus, transactionAmount } = req.body;

    try {
        const updatedTransaction = await TransactionModel.findByIdAndUpdate(req.params.id, {
            userId,
            transactionStatus,
            transactionAmount
        }, { new: true });

        return res.status(200).json(new ApiResponse(200, updatedTransaction, "Transaction updated successfully"));
    } catch (error) {
        return res.status(400).json(new ApiResponse(400, null, error.message));
    }
});

// Delete Transaction by ID
export const deleteTransactionById = asyncHandler(async (req, res) => {
    const deletedTransaction = await TransactionModel.findByIdAndDelete(req.params.id);

    if (!deletedTransaction) {
        return res.status(404).json(new ApiResponse(404, null, "Transaction not found"));
    }

    return res.json(new ApiResponse(200, deletedTransaction, "Transaction deleted successfully"));
});

// Send Gift
export const sendGift = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { giftId, vendorId, amount } = req.body;

    const user = await User.findById(userId, { walletAmount: 1 });
    const vendor = await Vendor.findById(vendorId, { walletAmount: 1, commissionAmount: 1 });

    if (!user) {
        throw new ApiError(400, "User not found");
    }

    await User.findByIdAndUpdate(userId, { walletAmount: Number(user.walletAmount) - Number(amount) }, { new: true });
    await Vendor.findByIdAndUpdate(vendorId, { walletAmount: Number(vendor.walletAmount) + (Number(amount) * 0.4) }, { new: true });
    await Vendor.findByIdAndUpdate(vendorId, { commissionAmount: Number(vendor.commissionAmount) + (Number(amount) * 0.6) }, { new: true });

    let giftTransaction = await GiftTransactionModel.create({
        giftId,
        userId,
        vendorId,
        status: "success",
        amount: amount
    });

    await TransactionModel.create({
        userId,
        vendorId,
        status: "success",
        amount: amount,
        type: "gift",
        duration: 0,
    });

    return res.json(new ApiResponse(200, giftTransaction, "Gift send successfully"));
});

// Fetch Gift Transactions
export const fetchGiftTransactions = asyncHandler(async (req, res) => {
    const { userId, vendorId, giftId, fromDate, toDate } = req.query;

    let filter = {};

    if (userId) {
        const user = await User.findById(userId, { walletAmount: 1 });

        if (!user) {
            throw new ApiError(400, "User not found");
        }
    }
    if (vendorId) {
        filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }
    if (giftId) {
        filter.giftId = new mongoose.Types.ObjectId(giftId);
    }

    if (fromDate && toDate) {
        filter.createdAt = {
            $gte: new Date(fromDate),
            $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
        };
    }

    const newLocal = await GiftTransactionModel.aggregate([
        {
            $match: filter
        },
        {
            $lookup: {
                from: "gifts",
                localField: "giftId",
                foreignField: "_id",
                as: "giftDetails",
                pipeline: [
                    { $project: { icon: 1, label: 1, price: 1 } }
                ]
            }
        },
        {
            $unwind: "$giftDetails"
        },
        {
            $group: {
                _id: "$giftId",
                totalAmount: { $sum: "$amount" },
                giftDetails: { $first: "$giftDetails" },
                userId: { $first: "$userId" },
                vendorId: { $first: "$vendorId" }
            }
        },
        {
            $project: {
                _id: 0,
                giftId: "$_id",
                totalAmount: 1,
                giftDetails: 1,
                userId: 1,
                vendorId: 1,
            }
        }
    ]);
    // let giftTransactions = await GiftTransactionModel.find({});
    let giftTransactions = newLocal;



    return res.json(new ApiResponse(200, giftTransactions, "Gift transactions retrieved successfully"));
});
// Get Withdrawals
export const getWithdrawals = asyncHandler(async (req, res) => {
    const { vendorId, fromDate, toDate } = req.params;

    let filter = {};

    if (vendorId) {
        filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    if (req.query.status) {
        filter.status = req.query.status
    }

    if (fromDate && toDate) {
        filter.createdAt = {
            $gte: new Date(fromDate),
            $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
        };
    }

    const withdrawals = await WithdrawTransactionModel.aggregate([
        {
            $match: filter
        },
        {
            $lookup: {
                from: "vendors",
                localField: "vendorId",
                foreignField: "_id",
                as: "vendorDetails",
                pipeline: [
                    { $project: { name: 1, email: 1, phone: 1, walletAmount: 1 } }
                ]
            }
        },
        {
            $unwind: "$vendorDetails"
        }
    ]);

    return res.json(new ApiResponse(200, withdrawals, "Withdrawals retrieved successfully"));
});
// Add Withdraw Request
export const addWithdrawRequest = asyncHandler(async (req, res) => {

    const { vendorId } = req.params;
    const { transactionId, paymentMode, amount } = req.body;

    const withdrawRequest = await WithdrawTransactionModel.create({
        vendorId: new mongoose.Types.ObjectId(vendorId),
        amount: amount,
        status: 'success',
        transactionId,
        paymentMode,

    });
    const vendor = await Vendor.findById(vendorId);

    const newWalletAmount = Number(vendor.walletAmount) - Number(withdrawRequest.amount);
    await Vendor.findByIdAndUpdate(vendorId, { walletAmount: newWalletAmount }, { new: true });


    return res.json(new ApiResponse(200, withdrawRequest, "Withdraw request added successfully"));

});

// Update Withdraw Request
export const updateWithdrawRequest = asyncHandler(async (req, res) => {

    const { vendorId } = req.params;
    const { withdrawId, status } = req.body;


    const updatedWithdrawRequest = await WithdrawTransactionModel.findOneAndUpdate(
        { _id: withdrawId, status: 'pending' },
        { status },
        { new: true, runValidators: true }
    );
    if (!updatedWithdrawRequest) {
        return res.status(404).json(new ApiResponse(404, null, "Withdraw request not found"));
    }

    if (updateWithdrawRequest && status === 'success') {
        const vendor = await Vendor.findById(vendorId);
        if (vendor) {
            const newWalletAmount = Number(vendor.walletAmount) - Number(updatedWithdrawRequest.amount);
            await Vendor.findByIdAndUpdate(vendorId, { walletAmount: newWalletAmount }, { new: true });
        }
    }

    return res.json(new ApiResponse(200, updatedWithdrawRequest, "Withdraw request updated successfully"));

});



// Remedy 
export const assignRemedy = asyncHandler(async (req, res) => {
    const { userId, vendorId, type, message } = req.body;


    const requiredFields = ['userId', 'vendorId', 'message'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const extractAllLinks = (text) => {
        const regex = /https?:\/\/[^\s"'<>]+/g;
        const matches = text.match(regex) || [];
        return matches.map(url => url.replace(/[.,!?;:]+$/, '') + `&id=${vendorId}&uid=${userId}`);
    };

    const links = extractAllLinks(message);
    // console.log('Extracted links:', links)


    const remedy = await RemedyModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        vendorId: new mongoose.Types.ObjectId(vendorId),
        type: "Remedy",
        link: links,
        message
    });

    return res.json(new ApiResponse(200, remedy, "Remedy assigned successfully"));

});

export const getRemedy = asyncHandler(async (req, res) => {

    const { userId, vendorId } = req.query;

    let filter = {};

    if (userId) {
        filter.userId = new mongoose.Types.ObjectId(userId);
    }
    if (vendorId) {
        filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    const remedy = await RemedyModel.find(filter)
        .populate('userId', 'name lastName email')
        .populate('vendorId', 'name lastName email')
        .sort({ createdAt: -1 });

    return res.json(new ApiResponse(200, remedy, "Remedy retrieved successfully"));
});

// Create Transaction
export const addRemedyTransaction = asyncHandler(async (req, res) => {
    const { userId, vendorId, amount } = req.body;


    const user = await User.findById(userId);
    const vendor = await Vendor.findById(vendorId, { walletAmount: 1, commissionAmount: 1, chatRate: 1 });

    let newAmount = amount;
    let newStatus = "success";


    if (!user) {
        throw new ApiError(400, "User not found");
    }

    await Vendor.findByIdAndUpdate(vendorId, { walletAmount: Number(vendor.walletAmount) + (Number(newAmount) * 0.1) }, { new: true });

    let transaction = await TransactionModel.create({
        userId,
        vendorId,
        status: newStatus,
        amount: newAmount,
        type: "remedy",
        duration: 0
    });

    return res.json(new ApiResponse(200, transaction, "Transactions addedd successfully"));
});