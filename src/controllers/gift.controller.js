import { Gift } from '../models/gift.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import mongoose from 'mongoose';

/// Add New Gift 
export const addGift = asyncHandler(async (req, res) => {
    const { label, price } = req.body;
    const icon = req.file?.filename ?? "";

    let newGift = await Gift.create({
        icon, label, price
    });

    return res.json(new ApiResponse(200, newGift, "Gift created successfully"));

});

/// Get Gifts
export const fetchGifts = asyncHandler(async (req, res) => {

    let totalGifts = await Gift.find().sort({ createdAt: -1 });

    return res.json(new ApiResponse(200, totalGifts, "Gift retrieved successfully"));

});


// Delete Gift Endpoint
export const deleteGift = asyncHandler(async (req, res) => {
    const giftId = req.params.id;

    // Check if the giftId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(giftId)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid Gift ID"));
    }

    const deletedGift = await Gift.findByIdAndDelete(giftId);

    if (!deletedGift) {
        return res.status(404).json(new ApiResponse(404, null, "Gift not found"));
    }

    return res.json(new ApiResponse(200, deletedGift, "Gift deleted successfully"));
});