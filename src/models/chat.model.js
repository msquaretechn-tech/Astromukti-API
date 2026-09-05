import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        isGroupChat: {
            type: Boolean,
            default: false,
        },
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: "ChatMessage",
        },
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
            {
                type: Schema.Types.ObjectId,
                ref: "Vendor",
            },
        ],
        admin: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        endedAt: {
            type: Date,
            default: null,
        },
        endedBy: {
            type: String,
            enum: ["user", "vendor"],
            default: null,
        },
    },
    { timestamps: true }
);

export const Chat = mongoose.model("Chat", chatSchema);