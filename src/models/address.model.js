import mongoose, { Schema } from "mongoose";

const addressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    label: {
        type: String,
        enum: ["Home", "Work", "Office", "Other"],
        default: "Home"
    },
    addressLine: {
        type: String,
        required: true
    },
    area: {
        type: String,
        default: ""
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true
    },
    latitude: {
        type: Number,
        default: 0
    },
    longitude: {
        type: Number,
        default: 0
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const AddressModel = mongoose.model("Address", addressSchema);
