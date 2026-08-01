import mongoose from "mongoose";
import { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { CallEnums, BookingStatusEnums } from "../constants/constants.js";


/// Vendor Schema [ Vendor Registration ]
const vendorSchema = new Schema({
    uid: {
        type: String,
        index: true
    },
    name: {
        type: String,
        index: true
    },
    lastName: {
        type: String
    },
    email: {
        type: String,
        unique: true,
        index: true,
        required: true
    },
    mobile: {
        type: String,
        unique: true,
        index: true,
        required: true
    },
    password: {
        type: String
    },
    avatar: {
        type: String,
    },
    otherImages: {
        type: [String]
    },
    dob: {
        type: String
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other']
    },
    skills: {
        type: [String]
    },
    expertise: {
        type: [String]
    },
    experienceYear: {
        type: Number,
        default: 1
    },
    languages: {
        type: [String]
    },
    maritalStatus: {
        type: String,
        enum: ['Single', 'Married', 'Divorced', 'Widow']
    },
    workingHours: {
        type: Number,
        default: 1
    },
    exclusiveStatus: {
        type: Boolean,
        default: false
    },
    address: {
        type: String
    },
    city: {
        type: String
    },
    pincode: {
        type: Number
    },
    state: {
        type: String
    },
    country: {
        type: String
    },
    learningAddress: {
        type: String
    },
    workingPlatform: {
        type: String
    },
    bio: {
        type: String
    },
    isFulltimeJob: {
        type: Boolean,
        default: false
    },
    currentDevice: {
        type: String,
        enum: ['Android', 'IOS',]
    },
    callRate: {
        type: Number, /// Per minute
        default: 1
    },
    videoCallRate: {
        type: Number,  /// Per minute
        default: 1
    },
    chatRate: {
        type: Number,  /// Per minute
        default: 1
    },
    emergencyCallRate: {
        type: Number,  /// Per minute
        default: 1
    },
    privateCallRate: {
        type: Number,  /// Per minute
        default: 1
    },
    anonymousCallRate: {
        type: Number,  /// Per minute
        default: 1
    },
    isLive: {
        type: Boolean,
        default: false
    },
    isOnline: {
        type: Boolean,
        default: true
    },
    isMuted: {
        type: Boolean,
        default: false
    },
    isPaused: {
        type: Boolean,
        default: false
    },
    isAudioCallAvailable: {
        type: Boolean,
        default: true
    },
    isVideoCallAvailable: {
        type: Boolean,
        default: true
    },
    isAnonymousCallAvailable: {
        type: Boolean,
        default: true
    },
    isPrivateCallAvailable: {
        type: Boolean,
        default: true
    },
    isChatAvailable: {
        type: Boolean,
        default: true
    },
    isNowAvailable: {
        type: Boolean,
        default: true
    },
    nextUpComingTime: {
        type: Date,
    },
    fcmToken: {
        type: String,
    },
    chatGroupId: {
        type: String,
    },
    broadcastId: {
        type: Number
    },
    channelId: {
        type: String
    },
    streamType: {
        type: String,
        default: 'live'
    },
    callChannelName: {
        type: String,
    },
    callerName: {
        type: String,
        default: ''
    },
    followers: {
        type: [{
            type: Schema.Types.ObjectId,
            ref: "User"
        }]
    },
    blockedUsers: {
        type: [{
            type: Schema.Types.ObjectId,
            ref: "User"
        }]
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    accountHolderName: {
        type: String
    },
    bankName: {
        type: String
    },
    accountNumber: {
        type: Number
    },
    ifscCode: {
        type: String
    },
    walletAmount: {
        type: Number,
        default: 0
    },
    commissionAmount: {
        type: Number,
        default: 0
    },
    deviceId: {
        type: String,
        default: ''
    },
    occupation: {
        type: String
    },
    aadharFront: {
        type: String
    },
    aadharBack: {
        type: String
    },
    panImage: {
        type: String
    },
    countryCode: {
        type: String
    },
    termsAccepted: {
        type: Boolean,
        default: false
    },
    position: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

vendorSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            mobile: this.mobile,
            deviceId: this.deviceId,
            userType: "vendor"
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

vendorSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            userType: "vendor"
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

// vendorSchema.pre("save", async function (next) {
//     if (!this.isModified("password")) return next();
//     if (this.password == '') return next();
//     this.password = await bcrypt.hash(this.password, 10);
//     next();
// });

// vendorSchema.methods.isPasswordCorrect = async function (password) {
//     return await bcrypt.compare(password, this.password);
// };

/// Vendor Login Hours Schema 
const loginHistorySchema = new Schema({
    vendorId: {
        type: Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    startTime: {
        type: Date,
    },
    endTime: {
        type: Date,
    }

}, { timestamps: true });

/// Vendor Rating Schema 
const vendorRatingSchema = new Schema({
    vendorId: {
        type: Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    rating: {
        type: Number,
        default: 1
    },
    description: {
        type: String,
    }

}, { timestamps: true });

/// Vendor Rating Schema 
const vendorWaitingSchema = new Schema({
    vendorId: {
        type: Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    waitType: {
        type: String,
        enum: CallEnums,
        required: true
    },
    status: {
        type: String,
        enum: BookingStatusEnums,
        required: true,
        default: "pending"
    }

}, { timestamps: true });

/// Enquiry  Schema 
const vendorEnquirySchema = new Schema({

    name: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other']
    },
    age: {
        type: Number,
    },
    country: {
        type: String,
    },
    state: {
        type: String,
    },
    city: {

    },
    skills: {
        type: String
    },
    experienceYear: {
        type: String,
    },
    languages: {
        type: String
    },

}, { timestamps: true });

export const Vendor = mongoose.model('Vendor', vendorSchema);

export const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);

export const VendorRating = mongoose.model('VendorRating', vendorRatingSchema);

export const VendorWaiting = mongoose.model('VendorWaiting', vendorWaitingSchema);

export const VendorEnquiry = mongoose.model('VendorEnquiry', vendorEnquirySchema);