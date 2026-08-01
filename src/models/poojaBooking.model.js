import mongoose, { Schema } from "mongoose";

const poojaBookingSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    poojaId: {
        type: Schema.Types.ObjectId,
        ref: "Pooja",
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
        default: "Pending"
    },
    devoteeName: {
        type: String,
        required: true
    },
    gotra: {
        type: String,
        default: ""
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending"
    },
    price: {
        type: Number,
        required: true
    },
    couponCode: {
        type: String,
        default: null
    },
    discountAmount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export const PoojaBookingModel = mongoose.model("PoojaBooking", poojaBookingSchema);
