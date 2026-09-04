import mongoose from 'mongoose';
import { TransactionModel, WalletTransactionModel } from '../models/trans.model.js';
import { User } from '../models/user.model.js';
import { AddressModel } from '../models/address.model.js';
import { Vendor, VendorWaiting } from '../models/vendor.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateAccessAndRefreshTokens } from './auth.controller.js';


// User registration
export const addUser = asyncHandler(async (req, res) => {

    const { name, lastName, mobile, email, password, gender, dob, dobTime, birthPlace, currentAddress, deviceId } = req.body;

    const avatar = req.file?.filename ?? "";

    try {

        if (!mobile) {
            throw new ApiError(400, "Missing required fields");
        }

        // Check if a user with the provided email or number already exists
        const existingUser = await User.findOne({ mobile });

        if (existingUser) {
            // If user with provided email or number already exists, throw an error
            throw new ApiError(400, "User already exists");
        }
        // do {
        //     uid = 'b' + Math.floor(100000 + Math.random() * 900000).toString();
        // } while (await User.findOne({ uid }));
        let uid;

        const lastUser = await User.findOne().sort({ uid: -1 });
        if (lastUser && lastUser.uid) {
            const lastNumber = parseInt(lastUser.uid.substring(1));
            uid = 'C' + (lastNumber + 1).toString().padStart(6, '0');
        } else {
            uid = 'C100001';
        }
        // Create a new user instance
        const newUser = new User({
            uid, name, lastName, mobile, email, password, gender, dob: dob,
            dobTime: dobTime, birthPlace, currentAddress, avatar, deviceId,
            // New-user promo: 5 minutes free across chat/call/video, granted
            // once at signup only - never backfilled onto existing users.
            freeMinutesRemaining: 5,
        });

        // Save the user to the database
        await newUser.save();

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
            newUser._id, 'user'
        );

        return res.json(new ApiResponse(200, {
            user: newUser,
            accessToken,
            refreshToken
        }, "User registered successfully"));
    } catch (error) {
        console.log(error);
        throw new ApiError(500, "Failed to register user");
    }
});


// Update
export const updateUser = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const { name, lastName, email, password, gender, dob, dobTime, birthPlace, currentAddress, fcmToken, walletAmount,
        isBlocked, isNotificationOn, latitude, longitude, deviceId } = req.body;
    const avatar = req.file?.filename ?? "";

    const updateFields = {};
    // Only update the fields if they are present in the request body
    if (name) updateFields.name = name;
    if (lastName) updateFields.lastName = lastName;
    if (email) updateFields.email = email;
    if (password) updateFields.password = password;
    if (gender) updateFields.gender = gender;
    if (dob) updateFields.dob = dob;
    if (dobTime) updateFields.dobTime = dobTime;
    if (birthPlace) updateFields.birthPlace = birthPlace;
    if (currentAddress) updateFields.currentAddress = currentAddress;
    if (avatar) updateFields.avatar = avatar;
    if (fcmToken) updateFields.fcmToken = fcmToken;
    if (walletAmount) updateFields.walletAmount = walletAmount;
    if (isBlocked) updateFields.isBlocked = isBlocked;
    if (isNotificationOn) updateFields.isNotificationOn = isNotificationOn;
    if (latitude) updateFields.latitude = latitude;
    if (longitude) updateFields.longitude = longitude;
    if (deviceId) updateFields.deviceId = deviceId;

    // Find and update the document
    const user = await User.findByIdAndUpdate(id, updateFields, { new: true });

    if (!user) {
        return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }


    return res.json(new ApiResponse(200, user, "User updated successfully"));
});

// Read
export const getUsers = asyncHandler(async (req, res) => {

    const { isBlocked, fromDate, toDate, page, limit } = req.query;

    let filter = {};

    if (isBlocked) {
        filter.isBlocked = isBlocked;
    }

    if (fromDate && toDate) {
        filter.createdAt = {
            $gte: new Date(fromDate),
            $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
        };
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    return res.json(new ApiResponse(200, users, "Users retrieved successfully"));
});

export const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }

    return res.json(new ApiResponse(200, user, "User retrieved successfully"));
});


// Delete
export const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }

    await user.deleteOne();

    return res.json(new ApiResponse(200, user, "User deleted successfully"));
});



// // Update User wallet 
// export const addUserWalletAmount = asyncHandler(async (req, res) => {
//     const { userId } = req.params;
//     const { amount } = req.body;

//     const user = await User.findById(userId);

//     if (!user) {
//         throw new ApiError(400, "User not found");
//     }

//     await User.findByIdAndUpdate(userId, { walletAmount: parseFloat(user.walletAmount) + parseFloat(amount) }, { new: true });

//     let transaction = await WalletTransactionModel.create({
//         userId,
//         status: "success",
//         amount: amount
//     });

//     return res.json(new ApiResponse(200, transaction, "Transactions updated successfully"));
// });

// Update User wallet 
// export const addUserWalletAmount = asyncHandler(async (req, res) => {
//     const { userId } = req.params;
//     const amount = parseFloat(req.body.amount);

//     // const user = await User.findById(userId);
//     // if (!user) throw new ApiError(400, "User not found");

//     // // 1. Check if eligible for the 51 bonus
//     // let bonus = 0;
//     // if (amount >= 99) {
//     //     // .exists() is faster than .findOne() as it only checks if a record matches
//     //     const hasRechargedBefore = await WalletTransactionModel.exists({ 
//     //         userId, 
//     //         status: "success", 
//     //         amount: { $gte: 99 } 
//     //     });
        
//     //     if (!hasRechargedBefore) bonus = 51;
//     // }

//     // // 2. Update user wallet
//     // user.walletAmount = (parseFloat(user.walletAmount) || 0) + amount + bonus;
//     // await user.save();

//     // // 3. Create transactions (Creates 2 if bonus exists, otherwise 1)
//     // const transactions = await WalletTransactionModel.insertMany([
//     //     { userId, status: "success", amount },
//     //     ...(bonus ? [{ userId, status: "success", amount: bonus }] : [])
//     // ]);

//     return res.json(new ApiResponse(200, 'transactions', "Wallet updated successfully"));
// });
// Update User wallet 
export const addUserWalletAmount = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { amount, paymentId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(400, "User not found");
    }

    await User.findByIdAndUpdate(userId, {
        $inc: {
            walletAmount: Number(amount)
        }
    }, { new: true });

    let transaction = await WalletTransactionModel.create({
        userId,
        paymentId,
        status: "success",
        transactionType: "recharge",
        amount: amount
    });

    return res.json(new ApiResponse(200, transaction, "Transactions updated successfully"));
});



// GET  User wallet 
export const getUserWalletHistory = asyncHandler(async (req, res) => {
    const { userId } = req.params;


    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(400, "User not found");
    }

    let transaction = await WalletTransactionModel.find({ userId })

    return res.json(new ApiResponse(200, transaction, "Transactions retrived successfully"));
});


// Get All Users Wallet Histories
export const getAllUsersWalletHistories = asyncHandler(async (req, res) => {

    let transaction = await WalletTransactionModel.find().populate('userId', 'name lastName mobile walletAmount')

    return res.json(new ApiResponse(200, transaction, "Transactions retrived successfully"));

})


// GET  User wallet Amount
export const getUserWalletAmount = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId, { name: 1, lastName: 1, walletAmount: 1 });

    if (!user) {
        throw new ApiError(400, "User not found");
    }

    return res.json(new ApiResponse(200, user, "Wallet retrived successfully"));
});

// Check User Is Blocked Or Not 
export const checkUserIsBlockedOrNot = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { vendorId } = req.query;

    const user = await User.findById(userId, { name: 1 });

    if (!user) {
        throw new ApiError(400, "User not found");
    }

    const isBlocked = await Vendor.findOne({
        _id: new mongoose.Types.ObjectId(vendorId),
        blockedUsers: {
            $in: [new mongoose.Types.ObjectId(userId)]
        }
    });

    return res.json(new ApiResponse(200, { isBlocked: isBlocked ? true : false }, "Fetched successfully"));
});



export const getAstrogerInWaitingList = asyncHandler(async (req, res) => {
    const { userId } = req.params;


    // Validate vendorId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, 'Invalid user ID');
    }

    // Aggregate users in the waitlist for the given vendor
    const usersInWaitlist = await VendorWaiting.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: 'vendors',
                localField: 'vendorId',
                foreignField: '_id',
                as: 'vendorDetails',
                pipeline: [
                    { $project: { name: 1, email: 1, fcmToken: 1 } }
                ]
            },
        },
        {
            $unwind: '$vendorDetails',
        },
        {
            $project: {
                _id: 0,
                vendorId: 1,
                userId: 1,
                waitType: 1,
                name: '$vendorDetails.name',
                email: '$vendorDetails.email',
                fcmToken: '$vendorDetails.fcmToken',
            },
        },
    ]);

    return res.json(new ApiResponse(200, usersInWaitlist, 'Fetched successfully'));

});

// Get Followings
export const getFollowings = asyncHandler(async (req, res) => {
    const { userId } = req.params;


    // Validate vendorId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, 'Invalid user ID');
    }

    // Aggregate users in the waitlist for the given vendor
    const usersInWaitlist = await Vendor.aggregate([
        {
            $match: {
                followers: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $project: {
                _id: 1,
                name: 1,
                avatar: 1,
                createdAt: 1,
                updatedAt: 1
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);

    return res.json(new ApiResponse(200, usersInWaitlist, 'Fetched successfully'));

});

// Address Controller Logic
export const addAddress = asyncHandler(async (req, res) => {

    const userId = req.auth._id;
    const { label, addressLine, area, city, state, pincode, latitude, longitude, isDefault } = req.body;

    if (isDefault) {
        await AddressModel.updateMany({ userId }, { isDefault: false });
    }

    const newAddress = new AddressModel({
        userId,
        label,
        addressLine,
        area,
        city,
        state,
        pincode,
        latitude,
        longitude,
        isDefault
    });

    await newAddress.save();

    return res.json(new ApiResponse(201, newAddress, "Address added successfully"));
});

export const getAllAddresses = asyncHandler(async (req, res) => {
    const userId = req.auth._id;
    const addresses = await AddressModel.find({ userId }).sort({ createdAt: -1 });

    return res.json(new ApiResponse(200, addresses, "Addresses retrieved successfully"));
});

export const updateAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.auth._id;
    const { label, addressLine, area, city, state, pincode, latitude, longitude, isDefault } = req.body;

    if (isDefault) {
        await AddressModel.updateMany({ userId }, { isDefault: false });
    }

    const updatedAddress = await AddressModel.findOneAndUpdate(
        { _id: id, userId },
        {
            label,
            addressLine,
            area,
            city,
            state,
            pincode,
            latitude,
            longitude,
            isDefault
        },
        { new: true }
    );

    if (!updatedAddress) {
        throw new ApiError(404, "Address not found");
    }

    return res.json(new ApiResponse(200, updatedAddress, "Address updated successfully"));
});

export const deleteAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.auth._id;

    const deletedAddress = await AddressModel.findOneAndDelete({ _id: id, userId });

    if (!deletedAddress) {
        throw new ApiError(404, "Address not found");
    }

    return res.json(new ApiResponse(200, null, "Address deleted successfully"));
});
