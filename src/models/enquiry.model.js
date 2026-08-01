import mongoose, { Schema } from "mongoose";

const enquirySchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    vendorId: {
        type: Schema.Types.ObjectId,
        ref: "Vendor"
    },
    consultationType: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed','success', 'cancelled'],
        default: 'pending'
    }
}, { timestamps: true });

export const EnquiryModel = mongoose.model("Enquiry", enquirySchema);
