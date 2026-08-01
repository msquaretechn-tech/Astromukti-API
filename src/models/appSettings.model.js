import mongoose, { Schema } from "mongoose";


const consultationPlanSchema = new Schema({
    duration: { type: Number, required: true }, // minutes
    price: { type: Number, required: true }
}, { _id: false });


const personalConsultationSchema = new Schema({
    telephony: {
        type: [consultationPlanSchema],
        default: [
            { duration: 10, price: 2100 },
            { duration: 20, price: 5000 },
            { duration: 30, price: 7000 }
        ]
    },
    video: {
        type: [consultationPlanSchema],
        default: [
            { duration: 30, price: 21000 }
        ]
    },
    meeting: {
        type: [consultationPlanSchema],
        default: [
            { duration: 60, price: 100000 }
        ]
    },
}, { _id: false });

const appSettingsSchema = new Schema({
    isAstrologyEnabled: {
        type: Boolean,
        default: true
    },
    isChatEnabled: {
        type: Boolean,
        default: true
    },
    isPoojaEnabled: {
        type: Boolean,
        default: true
    },
    isVideoEnabled: {
        type: Boolean,
        default: true
    },
    isGiftEnabled: {
        type: Boolean,
        default: true
    },
    isMaintenanceMode: {
        type: Boolean,
        default: false
    },
    maintenanceMessage: {
        type: String,
        default: ""
    },
    personalConsultationConfig: {
        type: personalConsultationSchema,
        default: {}
    }
}, { timestamps: true });

export const AppSettingsModel = mongoose.model("AppSettings", appSettingsSchema);
