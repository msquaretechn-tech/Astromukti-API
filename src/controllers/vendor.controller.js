import mongoose from "mongoose";
import {
    LoginHistory,
    Vendor,
    VendorEnquiry,
    VendorRating,
    VendorWaiting
} from "../models/vendor.model.js";
import { GiftTransactionModel, TransactionModel,WithdrawTransactionModel } from "../models/trans.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateAccessAndRefreshTokens } from "./auth.controller.js";


export const checkPublicVendorMobile = asyncHandler(async (req, res) => {

    const { mobile, email } = req.body;


    if (!mobile && !email) {
        throw new ApiError(400, "Mobile number or email are required");
    }
    const conditions = [];

    if (mobile) conditions.push({ mobile });
    if (email) conditions.push({ email });


    const vendor = await Vendor.findOne({ $or: conditions }).select("mobile email").lean();

    // console.log('vendor : ' + vendor);
    // console.log('vendor : ' + vendor?.email);
    // console.log('vendor : ' + email);


    const result = {
        mobileExists: mobile ? vendor?.mobile === mobile : false,
        emailExists: email ? vendor?.email === email : false,
    };

    // console.log(result);

    let message = "Astrologer does not exist";

    if (result.mobileExists == true && result.emailExists == true) {
        message = "Astrologer mobile and email already exist";
    } else if (result.mobileExists == true) {
        message = "Astrologer mobile already exists";
    } else if (result.emailExists == true) {
        message = "Astrologer email already exists";
    }

    return res.status(200).json(new ApiResponse(200, result, message));

});


// Add Vendor 
export const addVendor = asyncHandler(async (req, res) => {

    const { name, lastName, mobile, email, password, dob, gender, skills, expertise, experienceYear, languages, maritalStatus, workingHours,
        exclusiveStatus, address, city, pincode, state, country, learningAddress, workingPlatform, bio, isFulltimeJob, currentDevice,
        deviceId, occupation, countryCode, termsAccepted }
        = req.body;

    const avatar = req.files['avatar'] ? req.files['avatar'][0].filename : "";
    const otherImages = req.files['otherImages'] ? req.files['otherImages'].map(file => file.filename) : [];
    const aadharFront = req.files['aadharFront'] ? req.files['aadharFront'][0].filename : "";
    const aadharBack = req.files['aadharBack'] ? req.files['aadharBack'][0].filename : "";
    const panImage = req.files['panImage'] ? req.files['panImage'][0].filename : "";


    // Check if vendor already exists or not 
    const vendor = await Vendor.findOne({ $or: [{ mobile }, { email }] });

    if (vendor) {
        throw new ApiError(409, "Vendor already registered")
    }
    let uid;
    const lastVendor = await Vendor.findOne().sort({ uid: -1 });
    if (lastVendor && lastVendor.uid) {
        const lastNumber = parseInt(lastVendor.uid.substring(1));
        uid = 'A' + (lastNumber + 1).toString().padStart(6, '0');
    } else {
        uid = 'A000001';
    }
    if (!vendor) {
        const newRegistration = await Vendor.create({
            uid,
            name,
            lastName,
            mobile,
            email,
            password: password ? password : "",
            dob,
            gender,
            skills: skills ? skills.split(',').map(e => e.trim()) : [],
            expertise: expertise ? expertise.split(',').map(e => e.trim()) : [],
            experienceYear,
            languages: languages ? languages.split(',').map(e => e.trim()) : [],
            maritalStatus,
            workingHours,
            exclusiveStatus,
            address,
            city,
            pincode,
            state,
            country,
            learningAddress,
            workingPlatform,
            bio,
            isFulltimeJob,
            currentDevice,
            avatar: avatar,
            otherImages: otherImages,
            deviceId,
            occupation,
            aadharFront,
            aadharBack,
            panImage,
            countryCode,
            termsAccepted

        })
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
            newRegistration._id, 'vendor'
        );

        return res.json(new ApiResponse(200,
            {
                vendor: newRegistration,
                accessToken,
                refreshToken
            }, "Registration successfully"));

    }

});


/// Get Vendors
export const getVendor = asyncHandler(async (req, res) => {

    const { vendorId } = req.params;

    const { name, isLive, isOnline, isAudioCallAvailable, isChatAvailable, isRating, userId, search, skill, isUnBlocked, isVerified, isBlocked, fromDate, toDate } = req.query;

    const newFilter = req.query.filter;


    // console.log(newFilter);


    if (vendorId != undefined) {

        const vendor = await Vendor.findById(vendorId);

        const totalTransaction = await TransactionModel.aggregate([
            {
                $match: {
                    vendorId: new mongoose.Types.ObjectId(vendorId)
                }
            },
            {
                $group: {
                    _id: null,
                    totalTransaction: {
                        $sum: "$amount"
                    }
                }
            }
        ]);

        const giftTransaction = await GiftTransactionModel.aggregate([
            {
                $match: {
                    vendorId: new mongoose.Types.ObjectId(vendorId)
                }
            },
            {
                $group: {
                    _id: null,
                    totalTransaction: {
                        $sum: "$amount"
                    }
                }
            }
        ]);

        let newData = {
            ...vendor._doc,
            totalTransaction: (totalTransaction.length > 0 ? totalTransaction[0].totalTransaction : 0) +
                (giftTransaction.length > 0 ? giftTransaction[0].totalTransaction : 0)
        }

        return res.json(new ApiResponse(200, newData, "Data fetched successfully"));
    }

    let filter = {};

    if (search) {
        filter = {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } }
            ]
        }
    }

    if (fromDate && toDate) {
        filter.createdAt = {
            $gte: new Date(fromDate),
            $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
        };
    }

    if (isAudioCallAvailable) {
        filter.isAudioCallAvailable = isAudioCallAvailable == 'false' ? false : true;
    }
    if (isChatAvailable) {
        filter.isChatAvailable = isChatAvailable == 'false' ? false : true;
    }
    
    if (isVerified) {
        filter.isVerified = isVerified == 'false' ? false : true;
    }

    // Add live filter
    if (isLive) {
        filter.isLive = isLive == 'false' ? false : true;
    }
    // Add online filter
    if (isOnline) {
        filter.isOnline = isOnline == 'false' ? false : true;
    }
    // Add skills filter
    if (skill) {
        filter.skills = { "$in": [skill] }; // Assuming 'skill' is a single string
    }
    // Add isUnBlocked filter
    if (isUnBlocked) {
        filter.blockedUsers = { "$ne": new mongoose.Types.ObjectId(userId) };
        filter.isVerified = true;
        filter.isBlocked = false;
    }

    if (isBlocked) {
        filter.isBlocked = isBlocked;
    }

    // newFilter
    if (newFilter != undefined && newFilter != '' && newFilter?.trim().toLowerCase() !== 'all' && newFilter?.trim().toLowerCase() !== 'online') {
        const filters = newFilter.split(',').map(e => e.trim());
        filter.$or = [
            { expertise: { $in: filters } },
            { skills: { $in: filters } }
        ];
    }

    // const vendors = await Vendor.find(filter);
    const vendors = await Vendor.aggregate([
        {
            $match: filter // Apply any filters you need
        },
        {
            $lookup: {
                from: "vendorratings",
                localField: "_id",
                foreignField: "vendorId",
                as: "ratings"
            }
        },
        {
            $addFields: {
                averageRating: {
                    $cond: {
                        if: { $gt: [{ $size: "$ratings" }, 0] }, // Check if ratings array is not empty
                        then: { $round: [{ $avg: "$ratings.rating" }, 1] }, // Calculate average rating
                        else: 0 // Set to 0 if no ratings
                    }
                },
                totalRatingCount: { $size: "$ratings" }
            }
        },
        ...(userId ? [{
            $addFields: {
                isFollowing: {
                    $cond: {
                        if: { $in: [new mongoose.Types.ObjectId(userId), "$followers"] },
                        then: true,
                        else: false
                    }
                }
            }
        }] : []),
        ...(isRating == 'true' ? [{
            $sort: {
                averageRating: -1 // Sort in descending order by averageRating
            }
        }] : []),
        {
            $project: {
                ratings: 0 // Exclude the 'ratings' field from the output
            }
        },
        {
            $addFields: {
                positionSort: {
                    $cond: [
                        { $eq: ["$position", 0] },
                        9999,        // push 0 to bottom
                        "$position"
                    ]
                }
            }
        },
        {
            $sort: {
                isOnline: -1,     // ✅ FIRST → online users first
                positionSort: 1,  // ✅ THEN → rank inside each group
                createdAt: -1     // ✅ THEN → latest
            }
        },


    ]);

    return res.json(new ApiResponse(200, vendors, "Data fetched successfully"));

});

/// Delete Vendor

export const deleteVendor = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    try {
        const vendor = await Vendor.findByIdAndDelete(vendorId);
        return res.json(new ApiResponse(200, vendor, "Data deleted successfully"));
    } catch (error) {
        return res.json(new ApiResponse(500, null, "Error deleting vendor"));
    }
});

// Get  Availability Vendor
export const getVendorAvailability = asyncHandler(async (req, res) => {

    const { vendorId } = req.params;

    if (vendorId != undefined) {

        const vendor = await Vendor.findById(vendorId, {
            isLive: 1,
            isMuted: 1,
            isPaused: 1,
            isOnline: 1,
            callerName: 1,
            channelId: 1,
            streamType: 1,
            broadcastId: 1,
            chatGroupId: 1,
            isNowAvailable: 1,
            isChatAvailable: 1,
            isAudioCallAvailable: 1,
            isVideoCallAvailable: 1,
            isPrivateCallAvailable: 1,
            isAnonymousCallAvailable: 1,
        });

        return res.json(new ApiResponse(200, vendor, "Data fetched successfully"));
    }

    return res.json(new ApiResponse(200, null, "Data fetched successfully"));

})

export const updateVendorAvailability = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { isOnline, isAudioCallAvailable, isVideoCallAvailable, isChatAvailable, isNowAvailable } = req.body;

    const updateFields = {
        nextUpComingTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    if (isOnline) updateFields.isOnline = isOnline;
    if (isAudioCallAvailable) updateFields.isAudioCallAvailable = isAudioCallAvailable;
    if (isVideoCallAvailable) updateFields.isVideoCallAvailable = isVideoCallAvailable;
    if (isChatAvailable) updateFields.isChatAvailable = isChatAvailable;
    if (isNowAvailable) updateFields.isNowAvailable = isNowAvailable;

    // console.log(updateFields);


    if (Object.keys(updateFields).length === 0) {
        throw new ApiError(400, "At least one field is required to update");
    }
    const vendor = await Vendor.findByIdAndUpdate(vendorId, updateFields, { new: true, select: updateFields });


    if (!vendor) {
        throw new ApiError(404, "Vendor not found");
    }

    return res.json(new ApiResponse(200, vendor, "Updated successfully"));

});

// Update Vendor Information
export const updateVendor = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { name, lastName, dob, gender, skills, expertise, experienceYear, languages, maritalStatus, workingHours, exclusiveStatus,
        address, city, pincode, state, country, learningAddress, workingPlatform, bio, isFulltimeJob, currentDevice, callRate, videoCallRate, chatRate,
        emergencyCallRate, privateCallRate, anonymousCallRate, fcmToken, chatGroupId, callChannelName, isLive,
        isOnline, isAudioCallAvailable, isVideoCallAvailable, isAnonymousCallAvailable, isPrivateCallAvailable,
        isChatAvailable, nextUpComingTime, isNowAvailable, isMuted, isPaused, callerName, deviceId, isVerified,
        accountHolderName, bankName, accountNumber, ifscCode, channelId, broadcastId, streamType, isBlocked, occupation,
        countryCode, termsAccepted, position } = req.body;
    const avatar = req.files['avatar'] ? req.files['avatar'][0].filename : "";
    const otherImages = req.files['otherImages'] ? req.files['otherImages'].map(file => file.filename) : [];
    const aadharFront = req.files['aadharFront'] ? req.files['aadharFront'][0].filename : "";
    const aadharBack = req.files['aadharBack'] ? req.files['aadharBack'][0].filename : "";
    const panImage = req.files['panImage'] ? req.files['panImage'][0].filename : "";


    // Construct the update object based on the provided fields
    const updateFields = {};
    if (name) updateFields.name = name;
    if (lastName) updateFields.lastName = lastName;
    if (dob) updateFields.dob = dob;
    if (gender) updateFields.gender = gender;
    if (skills) updateFields.skills = skills.split(',').map(e => e.trim());
    if (expertise) updateFields.expertise = expertise.split(',').map(e => e.trim());
    if (experienceYear) updateFields.experienceYear = experienceYear;
    if (languages) updateFields.languages = languages.split(',').map(e => e.trim());
    if (maritalStatus) updateFields.maritalStatus = maritalStatus;
    if (workingHours) updateFields.workingHours = workingHours;
    if (exclusiveStatus) updateFields.exclusiveStatus = exclusiveStatus;
    if (address) updateFields.address = address;
    if (city) updateFields.city = city;
    if (pincode) updateFields.pincode = pincode;
    if (state) updateFields.state = state;
    if (country) updateFields.country = country;
    if (learningAddress) updateFields.learningAddress = learningAddress;
    if (workingPlatform) updateFields.workingPlatform = workingPlatform;
    if (bio) updateFields.bio = bio;
    if (isFulltimeJob) updateFields.isFulltimeJob = isFulltimeJob;
    if (currentDevice) updateFields.currentDevice = currentDevice;
    if (avatar) updateFields.avatar = avatar;
    if (otherImages && otherImages.length > 0) updateFields.otherImages = otherImages;
    if (aadharFront) updateFields.aadharFront = aadharFront;
    if (aadharBack) updateFields.aadharBack = aadharBack;
    if (panImage) updateFields.panImage = panImage;
    if (callRate) updateFields.callRate = callRate;
    if (videoCallRate) updateFields.videoCallRate = videoCallRate;
    if (chatRate) updateFields.chatRate = chatRate;
    if (emergencyCallRate) updateFields.emergencyCallRate = emergencyCallRate;
    if (privateCallRate) updateFields.privateCallRate = privateCallRate;
    if (anonymousCallRate) updateFields.anonymousCallRate = anonymousCallRate;
    if (fcmToken) updateFields.fcmToken = fcmToken;
    if (chatGroupId) updateFields.chatGroupId = chatGroupId;
    if (callChannelName) updateFields.callChannelName = callChannelName;
    if (callerName) updateFields.callerName = callerName;
    if (deviceId) updateFields.deviceId = deviceId;
    if (isLive) updateFields.isLive = isLive;
    if (isOnline) updateFields.isOnline = isOnline;
    if (isMuted) updateFields.isMuted = isMuted;
    if (isPaused) updateFields.isPaused = isPaused;
    if (isAudioCallAvailable) updateFields.isAudioCallAvailable = isAudioCallAvailable;
    if (isVideoCallAvailable) updateFields.isVideoCallAvailable = isVideoCallAvailable;
    if (isAnonymousCallAvailable) updateFields.isAnonymousCallAvailable = isAnonymousCallAvailable;
    if (isPrivateCallAvailable) updateFields.isPrivateCallAvailable = isPrivateCallAvailable;
    if (isChatAvailable) updateFields.isChatAvailable = isChatAvailable;
    if (nextUpComingTime) updateFields.nextUpComingTime = nextUpComingTime;
    if (isNowAvailable) updateFields.isNowAvailable = isNowAvailable;
    if (accountHolderName) updateFields.accountHolderName = accountHolderName;
    if (bankName) updateFields.bankName = bankName;
    if (accountNumber) updateFields.accountNumber = accountNumber;
    if (ifscCode) updateFields.ifscCode = ifscCode;
    if (channelId) updateFields.channelId = channelId;
    if (broadcastId) updateFields.broadcastId = broadcastId;
    if (streamType) updateFields.streamType = streamType;
    if (isBlocked) updateFields.isBlocked = isBlocked;
    if (isVerified) updateFields.isVerified = isVerified;
    if (occupation) updateFields.occupation = occupation;
    if (countryCode) updateFields.countryCode = countryCode;
    if (termsAccepted) updateFields.termsAccepted = termsAccepted;
    if (position) updateFields.position = position;

    // Find and update the vendor document
    // const vendor = await Vendor.findByIdAndUpdate(vendorId, updateFields, { new: true });

    const vendor = await Vendor.findByIdAndUpdate(vendorId, updateFields, { new: true, select: updateFields });


    if (!vendor) {
        throw new ApiError(404, "Vendor not found");
    }

    return res.json(new ApiResponse(200, vendor, "Vendor information updated successfully"));


});

// Create Login History
export const createLoginHistory = asyncHandler(async (req, res) => {
    const { vendorId, startTime, endTime } = req.body;
    const newLoginHistory = new LoginHistory({ vendorId, startTime, endTime });

    try {
        await newLoginHistory.save();
        return res.status(201).json(new ApiResponse(201, newLoginHistory, "Login history created successfully"));
    } catch (error) {
        return res.status(400).json(new ApiResponse(400, null, error.message));
    }
});

// Read All Login Histories
export const getAllLoginHistories = asyncHandler(async (req, res) => {

    const { vendorId } = req.query;

    let filter = {};

    if (vendorId) {
        filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    const loginHistories = await LoginHistory.aggregate([
        {
            $match: filter
        },
        {
            $lookup: {
                from: "vendors",
                let: { vendorId: "$vendorId" },
                pipeline: [
                    {
                        $match: { $expr: { $eq: ["$_id", "$$vendorId"] } }
                    },
                    {
                        $project: {
                            _id: 0,
                            name: 1,
                            avatar: 1,
                        },
                    },
                ],
                as: "vendorDetails",
            },
        },
        {
            $addFields: { vendorDetails: { $arrayElemAt: ["$vendorDetails", 0] } },
        },
        {
            $sort: {
                createdAt: -1
            }
        }


    ]);

    return res.json(new ApiResponse(200, loginHistories, "Login histories retrieved successfully"));
});

// Read Login History by ID
export const getLoginHistoryById = asyncHandler(async (req, res) => {
    const loginHistory = await LoginHistory.findById(req.params.id);

    if (!loginHistory) {
        return res.status(404).json(new ApiResponse(404, null, "Login history not found"));
    }

    return res.json(new ApiResponse(200, loginHistory, "Login history retrieved successfully"));
});

// Update Login History by ID
export const updateLoginHistoryById = asyncHandler(async (req, res) => {
    const { vendorId, startTime, endTime } = req.body;
    const updatedLoginHistory = await LoginHistory.findByIdAndUpdate(req.params.id, { vendorId, startTime, endTime }, { new: true });

    if (!updatedLoginHistory) {
        return res.status(404).json(new ApiResponse(404, null, "Login history not found"));
    }

    return res.json(new ApiResponse(200, updatedLoginHistory, "Login history updated successfully"));
});

// Delete Login History by ID
export const deleteLoginHistoryById = asyncHandler(async (req, res) => {
    const deletedLoginHistory = await LoginHistory.findByIdAndDelete(req.params.id);

    if (!deletedLoginHistory) {
        return res.status(404).json(new ApiResponse(404, null, "Login history not found"));
    }

    return res.json(new ApiResponse(200, deletedLoginHistory, "Login history deleted successfully"));
});


// Get My Activity 
export const getMyActivity = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { period } = req.query; // Get the period from the query parameters

    let filter = {};

    if (vendorId) {
        filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    let dateGroupingStage = {};

    if (period === 'daily') {
        dateGroupingStage = {
            date: {
                $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$startTime"
                }
            }
        };
    } else if (period === 'weekly') {
        dateGroupingStage = {
            year: { $year: "$startTime" },
            month: { $month: "$startTime" },
            weekOfMonth: {
                $ceil: {
                    $divide: [{ $dayOfMonth: "$startTime" }, 7] // Calculate week of the month (1-4)
                }
            }
        };
    } else if (period === 'monthly') {
        dateGroupingStage = {
            year: { $year: "$startTime" },
            month: { $month: "$startTime" }
        };
    } else {
        // Default to daily if the period is not recognized
        dateGroupingStage = {
            date: {
                $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$startTime"
                }
            }
        };
    }

    const loginHistory = await LoginHistory.aggregate([
        {
            $match: filter
        },
        {
            $addFields: {
                timeSpent: {
                    $divide: [{ $subtract: ["$endTime", "$startTime"] }, 3600000], // Convert milliseconds to hours
                }
            }
        },
        {
            $group: {
                _id: dateGroupingStage,
                totalTimeSpent: {
                    $sum: "$timeSpent"
                },
                count: {
                    $sum: 1
                }
            }
        },
        {
            $project: {
                date: {
                    $cond: [
                        { $eq: [period, "weekly"] },
                        {
                            $concat: [
                                { $toString: "$_id.year" }, "-",
                                { $toString: "$_id.month" }, "-W",
                                { $toString: "$_id.weekOfMonth" }
                            ]
                        },
                        {
                            $cond: [
                                { $eq: [period, "monthly"] },
                                { $concat: [{ $toString: "$_id.year" }, "-", { $toString: "$_id.month" }] },
                                "$_id.date"
                            ]
                        }
                    ]
                },
                averageTimeSpent: {
                    $round: [{ $divide: ["$totalTimeSpent", "$count"] }, 2]// Calculate average time spent per period
                },
                totalTimeSpent: { $round: ["$totalTimeSpent", 2] },
                sortDate: {
                    $cond: [
                        { $eq: [period, "weekly"] },
                        { $dateFromString: { dateString: { $concat: [{ $toString: "$_id.year" }, "-", { $toString: "$_id.month" }, "-01"] } } },
                        { $dateFromString: { dateString: "$_id.date" } }
                    ]
                }
            }
        },
        {
            $sort: {
                sortDate: -1 // Sort by latest date in descending order
            }
        }
    ]);

    return res.json(new ApiResponse(200, loginHistory, "Login history retrieved successfully"));
});




// Create Vendor Rating
export const createVendorRating = asyncHandler(async (req, res) => {
    const { vendorId, userId, rating, description } = req.body;
    const newVendorRating = new VendorRating({ vendorId, userId, rating, description });

    try {
        await newVendorRating.save();
        return res.status(201).json(new ApiResponse(201, newVendorRating, "Rating created successfully"));
    } catch (error) {
        return res.status(400).json(new ApiResponse(400, null, error.message));
    }
});

// Read All Vendor Ratings
export const getAllVendorRatings = asyncHandler(async (req, res) => {

    const { vendorId, limit = 10 } = req.query;

    let filter = {};

    if (vendorId) {
        filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    const vendorRatings = await VendorRating.aggregate([
        {
            $match: filter
        },
        {
            $sort: {
                createdAt: -1
            }
        },

        // User Details
        {
            $lookup: {
                from: "users",
                let: { userId: "$userId" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$_id", "$$userId"]
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            uid: 1,
                            name: 1,
                            lastName: 1,
                            email: 1,
                            mobile: 1,
                            avatar: 1,
                            birthPlace: 1,
                        }
                    }
                ],
                as: "userDetails"
            }
        },
        {
            $addFields: {
                userDetails: {
                    $arrayElemAt: ["$userDetails", 0]
                }
            }
        },

        // Astrologer Details
        {
            $lookup: {
                from: "vendors",
                let: { astrologerId: "$vendorId" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$_id", "$$astrologerId"]
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            uid: 1,
                            name: 1,
                            lastName: 1,
                            email: 1,
                            mobile: 1
                        }
                    }
                ],
                as: "astrologerDetails"
            }
        },
        {
            $addFields: {
                astrologerDetails: {
                    $arrayElemAt: ["$astrologerDetails", 0]
                }
            }
        },

        ...(limit
            ? [{
                $limit: parseInt(limit) || 10
            }]
            : [])
    ]);

    return res.json(
        new ApiResponse(
            200,
            vendorRatings,
            "Vendor ratings retrieved successfully"
        )
    );
});


// Update Vendor Rating
export const updateVendorRatingById = asyncHandler(async (req, res) => {
    const { vendorId, userId, rating, description } = req.body;

    try {
        const updatedVendorRating = await VendorRating.findByIdAndUpdate(req.params.id, {
            vendorId,
            userId,
            rating,
            description
        }, { new: true });

        return res.status(200).json(new ApiResponse(200, updatedVendorRating, "Vendor rating updated successfully"));
    } catch (error) {
        return res.status(400).json(new ApiResponse(400, null, error.message));
    }
});

// Delete Vendor Rating
export const deleteVendorRatingById = asyncHandler(async (req, res) => {
    const deletedVendorRating = await VendorRating.findByIdAndDelete(req.params.id);

    if (!deletedVendorRating) {
        return res.status(404).json(new ApiResponse(404, null, "Vendor rating not found"));
    }

    return res.json(new ApiResponse(200, deletedVendorRating, "Vendor rating deleted successfully"));
});



// Follow Astrologer 
export const followVendor = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { userId } = req.body;

    // Find and update the vendor document
    const vendor = await Vendor.findByIdAndUpdate(vendorId, {

        $addToSet: { followers: new mongoose.Types.ObjectId(userId) },

    }, { new: true });

    if (!vendor) {
        throw new ApiError(404, "Vendor not found");
    }

    return res.json(new ApiResponse(200, vendor, "Following successfully"));
});


// UnFollow Astrologer 
export const unFollowVendor = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { userId } = req.body;

    // Find and update the vendor document
    const vendor = await Vendor.findByIdAndUpdate(vendorId, {
        $pull: { followers: new mongoose.Types.ObjectId(userId) }
    }, { new: true });

    if (!vendor) {
        throw new ApiError(404, "Vendor not found");
    }

    return res.json(new ApiResponse(200, vendor, "Unfollowed successfully"));
});

// BLOCK USER By Astrologer 
export const blockUser = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { userId } = req.body;

    // Find and update the vendor document
    const vendor = await Vendor.findByIdAndUpdate(vendorId, {

        $addToSet: { blockedUsers: new mongoose.Types.ObjectId(userId) },

    }, { new: true }).select('blockedUsers');;

    if (!vendor) {
        throw new ApiError(404, "Vendor not found");
    }

    return res.json(new ApiResponse(200, vendor, "Blocked successfully"));
});


// UNBLOCK USER By Astrologer 
export const unBlockUser = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { userId } = req.body;

    // Find and update the vendor document
    const vendor = await Vendor.findByIdAndUpdate(vendorId, {

        $pull: { blockedUsers: new mongoose.Types.ObjectId(userId) }

    }, { new: true }).select('blockedUsers');;

    if (!vendor) {
        throw new ApiError(404, "Vendor not found");
    }

    return res.json(new ApiResponse(200, vendor, "Unblocked successfully"));
});

// Get Blocked Users By Astrologer
export const getBlockedUsers = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;

    const followers = await Vendor.aggregate([
        {
            $sort: { updatedAt: -1 }
        },
        {
            $match: {
                "_id": new mongoose.Types.ObjectId(vendorId)
            }
        },
        {
            $lookup: {
                "from": "users",
                "localField": "blockedUsers",
                "foreignField": "_id",
                "as": "userDetails",
                "pipeline": [
                    {
                        $project: {
                            "name": 1,
                            "lastName": 1,
                            "mobile": 1,
                            "avatar": 1,
                            "fcmToken": 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$userDetails"
        },
        {
            $replaceRoot: { newRoot: "$userDetails" }
        }
    ]);


    return res.json(new ApiResponse(200, followers, "Fetched successfully"));
});


// Get Astrologer followers
export const getVendorFollowers = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;

    const followers = await Vendor.aggregate([
        {
            $match: {
                "_id": new mongoose.Types.ObjectId(vendorId)
            }
        },
        {
            $lookup: {
                "from": "users",
                "localField": "followers",
                "foreignField": "_id",
                "as": "followerDetails"
            }
        },
        {
            $unwind: "$followerDetails"
        },
        {
            $sort: {
                "followerDetails.createdAt": -1
            }
        },
        {
            $project: {
                "followerDetails._id": 1,
                "followerDetails.name": 1,
                "followerDetails.lastName": 1,
                "followerDetails.email": 1,
                "followerDetails.mobile": 1,
                "followerDetails.avatar": 1,
                "followerDetails.fcmToken": 1,
                "followerDetails.isNotificationOn": 1,
                "followerDetails.createdAt": 1
            }
        }
    ]);


    return res.json(new ApiResponse(200, followers, "Fetched successfully"));
});


// Add User In Waiting List [ Astrologer ] 
export const addUserInWaitingList = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { userId, waitType } = req.body;

    // Validate vendorId
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        throw new ApiError(400, 'Invalid vendor ID');
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, 'Invalid user ID');
    }

    // Check user is exists in waitlist or not 
    const alreadyExists = await VendorWaiting.findOne({
        vendorId: new mongoose.Types.ObjectId(vendorId),
        userId: new mongoose.Types.ObjectId(userId),
        status: "pending",
        waitType: waitType
    });

    if (alreadyExists) {
        return res.json(new ApiResponse(200, null, 'User already in waitlist'));
    }

    // Object to add in waitlist 
    const update = {
        vendorId: new mongoose.Types.ObjectId(vendorId),
        userId: new mongoose.Types.ObjectId(userId),
        waitType: waitType
    };

    // Update the vendor's waitlist
    const response = await VendorWaiting.create(update);

    // send notification to astrologer for new user in waitlist
    const vendor = await Vendor.findById(vendorId, 'fcmToken');

    console.log(vendor);

    if (vendor && vendor.fcmToken) {
        await sendFcmNotification(
            vendor.fcmToken,
            "New User in Waitlist",
            "A new user has been added to your waitlist.",
            {
                type: "NEW_WAITLIST_USER",
                vendorId: vendorId,
                userId: userId,
                waitType: waitType
            }
        );
    }

    return res.json(new ApiResponse(200, response, 'Added successfully'));

});

// Remove User from Waiting List [ Astrologer ] 
export const removeUserFromWaitingList = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { userId, waitType, status } = req.body;

    // Validate vendorId
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        throw new ApiError(400, 'Invalid vendor ID');
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, 'Invalid user ID');
    }

    // Check if user exists in the waitlist
    const userInWaitlist = await VendorWaiting.findOne({
        vendorId: new mongoose.Types.ObjectId(vendorId),
        userId: new mongoose.Types.ObjectId(userId),
        // waitType: waitType || null,
        status: "pending"
    });

    if (!userInWaitlist) {
        throw new ApiError(404, 'User not found in waitlist');
    }

    // Remove the user from the waitlist
    await VendorWaiting.findOneAndUpdate(
        {
            vendorId: new mongoose.Types.ObjectId(vendorId),
            userId: new mongoose.Types.ObjectId(userId),
            // waitType: waitType || null,
            status: "pending"
        },
        { status: status },
        { new: true }
    );
    return res.json(new ApiResponse(200, null, 'Removed successfully'));
});

// Get User In Waiting List [ Astrologer ] 
export const getUserInWaitingList = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { status } = req.query;

    let filter = {};


    if (vendorId && !mongoose.Types.ObjectId.isValid(vendorId)) {
        throw new ApiError(400, 'Invalid vendor ID');
    }

    if (vendorId) {
        filter.vendorId = new mongoose.Types.ObjectId(vendorId);
        filter.status = status || "pending";
    }

    if (status) {
        filter.status = status;
    }

    // Aggregate users in the waitlist for the given vendor
    const usersInWaitlist = await VendorWaiting.aggregate([
        {
            $match: filter,
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userDetails',
            },
        },
        {
            $unwind: '$userDetails',
        },
        {
            $lookup: {
                from: 'vendors',
                localField: 'vendorId',
                foreignField: '_id',
                as: 'vendorDetails',
            },
        },
        {
            $unwind: '$vendorDetails',
        },
        {
            $project: {
                _id: 1,
                vendorId: 1,
                userId: 1,
                waitType: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1,
                name: '$userDetails.name',
                lastName: '$userDetails.lastName',
                email: '$userDetails.email',
                dob: '$userDetails.dob',
                fcmToken: '$userDetails.fcmToken',
                astrologerName: '$vendorDetails.name',
                isBlocked: {
                    $in: ['$userDetails._id', '$vendorDetails.blockedUsers']
                }
            },
        },
    ]);
    return res.json(new ApiResponse(200, usersInWaitlist, 'Fetched successfully'));

});

// Check User In Waiting List 
export const isUserInWaitingList = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { userId } = req.body;

    // Validate vendorId
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        throw new ApiError(400, 'Invalid vendor ID');
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, 'Invalid user ID');
    }

    // Check if the user is in the waitlist
    const alreadyExists = await VendorWaiting.findOne({
        vendorId: new mongoose.Types.ObjectId(vendorId),
        userId: new mongoose.Types.ObjectId(userId),
        status: "pending"
    });

    if (alreadyExists) {
        return res.json(new ApiResponse(200, true, 'User is already in waitlist'));
    } else {
        return res.json(new ApiResponse(200, false, 'User is not in waitlist'));
    }
});


export const createVendorEnquiry = asyncHandler(async (req, res) => {
    const enquiryData = req.body;
    const enquiry = new VendorEnquiry(enquiryData);
    await enquiry.save();
    return res.json(new ApiResponse(201, enquiry, "Enquiry created successfully"));
});


export const getVendorEnquiry = asyncHandler(async (req, res) => {
    const enquiry = await VendorEnquiry.find();
    if (!enquiry) {
        return res.status(404).json(new ApiResponse(404, null, "Enquiry not found"));
    }
    return res.json(new ApiResponse(200, enquiry, "Enquiry retrieved successfully"));
});
export const getVendorEnquiryById = asyncHandler(async (req, res) => {
    const enquiry = await VendorEnquiry.findById(req.params.id);
    if (!enquiry) {
        return res.status(404).json(new ApiResponse(404, null, "Enquiry not found"));
    }
    return res.json(new ApiResponse(200, enquiry, "Enquiry retrieved successfully"));
});


export const updateVendorEnquiryById = asyncHandler(async (req, res) => {
    const enquiry = await VendorEnquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!enquiry) {
        return res.status(404).json(new ApiResponse(404, null, "Vendor enquiry not found"));
    }
    return res.json(new ApiResponse(200, enquiry, "Vendor enquiry updated successfully"));
});


export const deleteVendorEnquiryById = asyncHandler(async (req, res) => {
    const enquiry = await VendorEnquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) {
        return res.status(404).json(new ApiResponse(404, null, "Vendor enquiry not found"));
    }
    return res.json(new ApiResponse(200, null, "Vendor enquiry deleted successfully"));
});



// Stats Astrologer 
export const getAstrologerStats = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;

    // Find and update the vendor document
    const vendor = await Vendor.findById(vendorId, { _id: 1, walletAmount: 1 });

    if (!vendor) {
        throw new ApiError(404, "Vendor not found");
    }


    const callRequests = await TransactionModel.countDocuments({ vendorId: vendorId, type: 'audio' });
    const chatRequests = await TransactionModel.countDocuments({ vendorId: vendorId, type: 'chat' });
    const videoCallRequests = await TransactionModel.countDocuments({ vendorId: vendorId, type: 'video' });

    const totalEarningsAgg = await TransactionModel.aggregate([
        { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
        { $group: { _id: null, totalEarnings: { $sum: "$amount" } } }
    ]);

    const totalWithdrawAgg = await WithdrawTransactionModel.aggregate([
        {
            $match: {
                vendorId: new mongoose.Types.ObjectId(vendorId),
                status: "success"
            }
        },
        { $group: { _id: null, totalWithdraw: { $sum: "$amount" } } }
    ]);



    const totalEarnings = totalEarningsAgg.length > 0 ? totalEarningsAgg[0].totalEarnings : 0;

    const totalWithdraw = totalWithdrawAgg.length > 0 ? totalWithdrawAgg[0].totalWithdraw : 0;

    let stats = {};

    stats.callRequests = callRequests;

    stats.chatRequests = chatRequests;

    stats.videoCallRequests = videoCallRequests;

    stats.totalEarnings = (totalEarnings - totalWithdraw);

    stats.walletAmount = vendor.walletAmount;

    return res.json(new ApiResponse(200, stats, "Stats fetched successfully."));
});