import mongoose, { Schema } from "mongoose";

// Tracks how much of a vendor's one-time 5-minute free promo a given user
// has already spent. One doc per (userId, vendorId) pair, created on first
// use - freeMinutesUsed only ever grows, up to 5, and never resets, so a
// user can't refill the pool by reconnecting. Separate from and applied
// before User.freeMinutesRemaining (the existing new-user promo). See
// CallBilling.js and trans.controller.js (chat) for where this is read and
// incremented.
const vendorFreeMinutesSchema = new Schema({
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
    freeMinutesUsed: {
        type: Number,
        default: 0,
    },
},
    { timestamps: true }
);

vendorFreeMinutesSchema.index({ userId: 1, vendorId: 1 }, { unique: true });

export const VendorFreeMinutes = mongoose.model("VendorFreeMinutes", vendorFreeMinutesSchema);
