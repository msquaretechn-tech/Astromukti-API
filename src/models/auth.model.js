import { Schema } from "mongoose";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const otpSchema = new Schema({

    mobile: { type: String, required: true },
    otp: { type: Number, required: true },
    expiryAt: { type: Date, required: true },
    userType: { type: String, enum: ["user", "vendor"] },
    isRegistered:{type : Boolean ,default :false}

}, { timestamps: true });


const adminSchema = new Schema({

    username: { type: String, required: true },
    password: { type: String, required: true },

}, { timestamps: true });

adminSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            userType: "admin"
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

adminSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            userType: "admin"
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

export const OtpModel = mongoose.model("Otp", otpSchema);

export const AdminModel = mongoose.model("Admin", adminSchema);