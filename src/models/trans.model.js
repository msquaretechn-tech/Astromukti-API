import { Schema } from "mongoose";
import mongoose from "mongoose";
import { CallEnums, StatusEnums } from "../constants/constants.js";

const transactionSchema = new Schema({

    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    vendorId: {
        type: Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    status: {
        type: String,
        enum: StatusEnums,
        required: true
    },
    type: {
        type: String,
        enum: CallEnums
    },
    duration: {
        type: Number,
        default: 0 // In Minute
    },
    amount: {
        type: Number,
        required: true
    },
    // Links a transaction to the server-tracked call session that produced
    // it. Unique + sparse: only call-billed transactions set this, and the
    // uniqueness is what makes billing a session idempotent - the first
    // writer wins, everyone else (a retried /end, the legacy client report)
    // gets the same existing row back instead of a second charge.
    callSessionId: {
        type: Schema.Types.ObjectId,
        ref: "CallSession",
        unique: true,
        sparse: true,
    }

}, { timestamps: true });


const walletTransactionSchema = new Schema({

    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    paymentId: {
        type: String,
        unique: true,
        sparse: true
    },
    status: {
        type: String,
        enum: ['pending', 'success'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    transactionType: {
        type: String
    }

}, { timestamps: true });

const withdrawTransactionSchema = new Schema({

    vendorId: {
        type: Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    status: {
        type: String,
        enum: StatusEnums,
        required: true,
        default: "pending"
    },
    amount: {
        type: Number,
        required: true
    },
    transactionId: {
        type: String,
        required: true,
    },
    paymentMode: {
        type: String,
        required: true
    }

}, { timestamps: true });


const giftTransactionSchema = new Schema({

    giftId: {
        type: Schema.Types.ObjectId,
        ref: "Gift",
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    vendorId: {
        type: Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    status: {
        type: String,
        enum: StatusEnums,
        required: true
    },
    amount: {
        type: Number,
        required: true
    }

}, { timestamps: true });



const remedies = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    vendorId: {
        type: Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    type: {
        type: String,
        required: true
    },
    link: {
        type: [String]
    },
    message: {
        type: String,
        required: true
    }

}, { timestamps: true });


export const TransactionModel = mongoose.model("Transaction", transactionSchema);

export const WalletTransactionModel = mongoose.model("WalletTransaction", walletTransactionSchema);

export const WithdrawTransactionModel = mongoose.model("WithdrawTransaction", withdrawTransactionSchema);

export const GiftTransactionModel = mongoose.model("GiftTransaction", giftTransactionSchema);

export const RemedyModel = mongoose.model("Remedy", remedies);