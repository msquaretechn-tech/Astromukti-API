import { AdminModel } from "../models/auth.model.js";
import { User } from "../models/user.model.js";
import { Vendor } from "../models/vendor.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";


export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // console.log(decodedToken);

    let auth;
    if (decodedToken.userType === "user") {
      auth = await User.findById(decodedToken?._id).select("-refreshToken");

      // console.log(auth);

      if (!auth) {
        throw new ApiError(401, "Invalid access token");
      }
      if (auth.deviceId != decodedToken.deviceId && (auth.mobile != '+911234567890' || auth.mobile != '1234567890')) {
        throw new ApiError(401, "Session expired. Please login again from this device.");
      }

    } else if (decodedToken.userType === "vendor") {
      auth = await Vendor.findById(decodedToken?._id).select("-refreshToken");

      // console.log(auth);

      if (!auth) {
        throw new ApiError(401, "Invalid access token");
      }
      if (auth.deviceId != decodedToken.deviceId && (auth.mobile != '+911234567890' || auth.mobile != '1234567890')) {
        throw new ApiError(401, "Session expired. Please login again from this device.");
      }

    } else if (decodedToken.userType === "admin") {
      auth = await AdminModel.findById(decodedToken?._id).select("-refreshToken");
    }

    if (!auth) {
      throw new ApiError(401, "Invalid access token");
    }

    req.auth = auth;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});



export const avoidInProduction = asyncHandler(async (req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    next();
  } else {
    throw new ApiError(
      403,
      "This service is only available in the local environment. Please contact the administrator for more information."
    );
  }
});