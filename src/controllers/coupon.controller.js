import { CouponModel } from "../models/coupon.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createCoupon = asyncHandler(async (req, res) => {
    const { code, discountType, discountValue, minOrderValue, description, isActive } = req.body;

    if (!code || !discountType || !discountValue) {
        throw new ApiError(400, "Code, discountType, and discountValue are required");
    }

    const existingCoupon = await CouponModel.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
        throw new ApiError(400, "Coupon code already exists");
    }

    const newCoupon = new CouponModel({
        code,
        discountType,
        discountValue,
        minOrderValue,
        description,
        isActive
    });

    await newCoupon.save();

    return res.status(201).json(
        new ApiResponse(201, newCoupon, "Coupon created successfully")
    );
});

export const getAllCoupons = asyncHandler(async (req, res) => {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
    }

    const coupons = await CouponModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, coupons, "Coupons retrieved successfully")
    );
});

export const applyCoupon = asyncHandler(async (req, res) => {
    const { code, orderValue } = req.body;

    if (!code) {
        throw new ApiError(400, "Coupon code is required");
    }

    const coupon = await CouponModel.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
        throw new ApiError(404, "Invalid or expired coupon code");
    }

    if (orderValue < coupon.minOrderValue) {
        throw new ApiError(400, `Minimum order value of ${coupon.minOrderValue} required for this coupon`);
    }

    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
        discountAmount = (orderValue * coupon.discountValue) / 100;
    } else {
        discountAmount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed order value
    if (discountAmount > orderValue) {
        discountAmount = orderValue;
    }

    return res.status(200).json(
        new ApiResponse(200, {
            couponCode: coupon.code,
            discountAmount: discountAmount,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue
        }, "Coupon applied successfully")
    );
});

export const updateCoupon = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateFields = req.body;

    const coupon = await CouponModel.findByIdAndUpdate(id, updateFields, { new: true });

    if (!coupon) {
        throw new ApiError(404, "Coupon not found");
    }

    return res.status(200).json(
        new ApiResponse(200, coupon, "Coupon updated successfully")
    );
});

export const deleteCoupon = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const coupon = await CouponModel.findByIdAndDelete(id);

    if (!coupon) {
        throw new ApiError(404, "Coupon not found");
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Coupon deleted successfully")
    );
});
