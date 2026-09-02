import mongoose, { Schema } from "mongoose";

const callSessionSchema = new Schema(
    {
        channelId: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        vendorId: {
            type: Schema.Types.ObjectId,
            ref: "Vendor",
            required: true,
        },
        type: {
            type: String,
            enum: ["audio", "video"],
            required: true,
        },
        status: {
            type: String,
            enum: ["ringing", "ongoing", "completed", "missed", "abandoned", "failed"],
            default: "ringing",
            index: true,
        },
        agoraUid: {
            user: { type: Number },
            vendor: { type: Number },
        },
        rateSnapshot: {
            type: Number,
            required: true,
        },
        ringingAt: {
            type: Date,
            default: Date.now,
        },
        startedAt: {
            type: Date,
            default: null,
        },
        lastHeartbeatAt: {
            type: Date,
            default: null,
        },
        heartbeatCount: {
            type: Number,
            default: 0,
        },
        endedAt: {
            type: Date,
            default: null,
        },
        endedBy: {
            type: String,
            enum: ["user", "vendor", "system_reaper", "agora_error", "connection_lost", "insufficient_balance"],
            default: null,
        },
        disconnectReason: {
            type: String,
        },
        durationSeconds: {
            type: Number,
            default: 0,
        },
        isSuspicious: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Explicit collection name, rather than Mongoose's default pluralization
// ("callsessions") - cheap insurance against colliding with any orphaned
// collection of a similar name, and matches the sibling AstroHanumanta
// codebase this was ported from, where such a collision was confirmed.
export const CallSession = mongoose.model("CallSession", callSessionSchema, "call_sessions");
