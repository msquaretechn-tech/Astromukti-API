import mongoose from "mongoose";
import { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


/// user Schema 
const userSchema = new Schema({
    uid: {
        type: String,
        index: true
    },
    name: {
        type: String,
        // required: true
    },
    lastName: {
        type: String
    },
    mobile: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        // unique: true,
        // required: true
    },
    password: {
        type: String
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        // required: true
    },
    dob: {
        type: String,
        // required: true
    },
    dobTime: {
        type: String,
        // required: true
    },
    birthPlace: {
        type: String,
        // required: true
    },
    currentAddress: {
        type: String,
        // required: true
    },
    avatar: {
        type: String,
        // required: true
    },
    fcmToken: {
        type: String,
    },
    walletAmount: {
        type: Number,
        default: 0
    },
    // Minutes-based new-user promo, shared across chat/call/video - kept
    // separate from walletAmount since astrologers charge different
    // per-minute rates, so a flat rupee credit can't represent "5 minutes"
    // uniformly. Granted only at signup (see addUser); existing users
    // default to 0 and are unaffected.
    freeMinutesRemaining: {
        type: Number,
        default: 0
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isNotificationOn: {// for live event notification
        type: Boolean,
        default: true
    },
    latitude: {
        type: Number
    },
    longitude: {
        type: Number
    },
    deviceId: {
        type: String,
        default: ''
    }

}, { timestamps: true });


userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            mobile: this.mobile,
            deviceId: this.deviceId,
            userType: "user"
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            userType: "user"
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

// userSchema.pre("save", async function (next) {
//     if (!this.isModified("password")) return next();
//     if (this.password == '') return next();
//     this.password = await bcrypt.hash(this.password, 10);
//     next();
// });

// userSchema.methods.isPasswordCorrect = async function (password) {
//     return await bcrypt.compare(password, this.password);
// };

export const User = mongoose.model('User', userSchema);