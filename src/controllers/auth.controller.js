import { AdminModel, OtpModel } from "../models/auth.model.js";
import { User } from "../models/user.model.js";
import { Vendor } from "../models/vendor.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const generateAccessAndRefreshTokens = async (userId, userType) => {
    try {
        let auth;

        if (userType == "vendor") {
            auth = await Vendor.findById(userId);
        }
        if (userType == "user") {
            auth = await User.findById(userId);
            // console.log(auth);
        }
        if (userType == "admin") {
            auth = await AdminModel.findById(userId);
        }

        const accessToken = auth.generateAccessToken();
        const refreshToken = auth.generateRefreshToken();

        // attach refresh token to the user document to avoid refreshing the access token with multiple refresh tokens
        auth.refreshToken = refreshToken;

        await auth.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.log(error);
        throw new ApiError(500, "Something went wrong while generating the access token", error);
    }
};

/// GENERATE OTP
export const generateOtp = asyncHandler(async (req, res) => {
    const { mobile, userType } = req.body;

    let otp = Math.floor(1000 + Math.random() * 9000); // Random $ DIGIT
    const expiryAt = new Date(Date.now() + 5 * 60000); // OTP expires in 5 minutes

    if (mobile == "1234567890" || mobile == "+911234567890") {
        otp = 1234;
    }

    let isRegistered = false;


    if (!userType) {
        throw new ApiError(404, "Type is not defined ");
    }

    // CHECK USER EXITS OR NOT                                  
    if (userType.toLowerCase() == "user") {
        const user = await User.findOne({ mobile });

        if (user) {
            isRegistered = true;

            if (user.isBlocked) {
                throw new ApiError(403, "Your account is blocked");
            }
        }

        // else {
        // throw new ApiError(404, "you are not a registered");
        // }

    } else if (userType.toLowerCase() == "vendor") {
        const vendor = await Vendor.findOne({ mobile });

        if (vendor) {
            isRegistered = true;
        } else {
            throw new ApiError(404, "you are not a registered");
        }

        if (vendor.isBlocked) {
            throw new ApiError(403, "Your account is blocked");
        }

        if (vendor.isVerified == false) {
            throw new ApiError(403, "Your account is currently unverified.");
        }
    }

    const details = await OtpModel.findOne({ mobile, userType });

    if (details) {
        const data = await OtpModel.findOneAndUpdate(
            { mobile, userType },
            {
                otp: otp,
                expiryAt: expiryAt,
                userType: userType.toLowerCase(),
                isRegistered,
            },
            { new: true }
        );

        return res.status(200).json(new ApiResponse(200, data, "OTP sent successfully"));
    } else {
        const data = await OtpModel.create({
            mobile,
            otp: otp,
            expiryAt: expiryAt,
            userType: userType.toLowerCase(),
            isRegistered,
        });

        return res.status(200).json(new ApiResponse(200, data, "OTP sent successfully"));
    }
});

/// VERIFY OTP
export const verifyOtp = asyncHandler(async (req, res) => {
    const { mobile, otp, deviceId } = req.body;
    const details = await OtpModel.findOne({ mobile, otp, expiryAt: { $gt: new Date() } });

    if (!details) {
        throw new ApiError(401, "Invalid OTP");
    }
    if (details.otpExpiration < new Date()) {
        throw new ApiError(401, "OTP has expired");
    }

    // Delete OTP document after successful verification
    await OtpModel.findByIdAndDelete(details._id);

    if (details.userType == "user") {
        const user = await User.findOne({ mobile });


        if (!user) {
            return res.status(200).json(new ApiResponse(200, null, "OTP verified successfully"));
        }

        await User.findByIdAndUpdate(user._id, { deviceId });

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id, details.userType);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    user,
                    accessToken,
                    refreshToken
                },
                "OTP verified successfully"
            )
        );
    }

    if (details.userType == "vendor") {
        const vendor = await Vendor.findOne({ mobile });

        if (!vendor) {
            return res.status(200).json(new ApiResponse(200, null, "OTP verified successfully"));
        }

        await Vendor.findByIdAndUpdate(vendor._id, { deviceId });

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
            vendor._id,
            details.userType
        );

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    vendor,
                    accessToken,
                    refreshToken
                },
                "OTP verified successfully"
            )
        );
    }
});
/// VERIFY OTP
export const verifyForgatePassword = asyncHandler(async (req, res) => {
    const { mobile, otp, password } = req.body;
    const details = await OtpModel.findOne({ mobile, otp, expiryAt: { $gt: new Date() } });

    console.log(password);


    if (!details) {
        throw new ApiError(401, "Invalid OTP");
    }
    if (details.otpExpiration < new Date()) {
        throw new ApiError(401, "OTP has expired");
    }

    // Delete OTP document after successful verification
    await OtpModel.findByIdAndDelete(details._id);

    if (details.userType == "user") {
        const user = await User.findOne({ mobile }, { _id: 1 });

        if (!user) {
            throw new ApiError(404, "User not found");
        }


        const newUser = await User.findByIdAndUpdate(user._id, { password }, { new: true, select: 'name email mobile' });

        return res.json(new ApiResponse(200, newUser, "Password updated successfully"));
    }

    if (details.userType == "vendor") {
        const vendor = await Vendor.findOne({ mobile }, { _id: 1 });

        if (!vendor) {
            throw new ApiError(404, "Vendor not found");
        }
        const newVendor = await Vendor.findByIdAndUpdate(vendor._id, { password }, { new: true, select: 'name email mobile' });

        return res.json(new ApiResponse(200, newVendor, "Password updated successfully"));
    }
});



/// ADMIN LOGIN
export const adminLogin = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    const details = await AdminModel.findOne({ username, password });

    console.log(details);
    if (!details) {
        throw new ApiError(401, "Invalid Credientials");
    }

    const admin = await AdminModel.findOne({ username });

    console.log(admin);

    if (!admin) {
        return res.status(200).json(new ApiResponse(200, null, "OTP verified successfully"));
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(admin._id, "admin");

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                admin,
                accessToken,
                refreshToken
            },
            "OTP verified successfully"
        )
    );
});

// User login with email and password
export const uloginWithEmailPassword = asyncHandler(async (req, res) => {
    const { email, password, deviceId } = req.body;

    if (!email && !password) {
        throw new ApiError(400, "Email or password is required");
    }
    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User with this email does not exist");
    }

    if (user.isBlocked) {
        throw new ApiError(403, "Your account is blocked");
    }

    // Compare the incoming password with hashed password
    // const isPasswordValid = await user.isPasswordCorrect(user.password);

    // console.log(isPasswordValid);


    if (password != user.password) {
        throw new ApiError(401, "Invalid credentials");
    }


    await User.findByIdAndUpdate(user._id, { deviceId });


    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id, "user");

    return res.status(200).json(
        new ApiResponse(
            200,
            { user, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
            "Logged in successfully"
        )
    );
});
// Vendor login with email and password
export const vloginWithEmailPassword = asyncHandler(async (req, res) => {
    const { email, password, deviceId } = req.body;

    if (!email && !password) {
        throw new ApiError(400, "Email or password is required");
    }
    const vendor = await Vendor.findOne({ email });

    if (!vendor) {
        throw new ApiError(404, "User with this email does not exist");
    }
    if (vendor.isBlocked) {
        throw new ApiError(403, "Your account is blocked");
    }

    // // Compare the incoming password with hashed password
    // const isPasswordValid = await vendor.isPasswordCorrect(password);

    if (password != vendor.password) {
        throw new ApiError(401, "Invalid credentials");
    }

    await Vendor.findByIdAndUpdate(vendor._id, { deviceId });

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(vendor._id, "vendor");

    return res.status(200).json(
        new ApiResponse(
            200,
            { vendor, accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
            "Logged in successfully"
        )
    );
});
