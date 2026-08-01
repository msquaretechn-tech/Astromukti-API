import { AppSettingsModel } from '../models/appSettings.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const ALLOWED_FIELDS = [
    "isAstrologyEnabled",
    "isChatEnabled",
    "isPoojaEnabled",
    "isVideoEnabled",
    "isGiftEnabled",
    "isMaintenanceMode",
    "maintenanceMessage",
    "personalConsultationConfig"
];

// GET /api/settings  — public, auto-creates document with defaults on first call
export const getAppSettings = asyncHandler(async (req, res) => {
    const settings = await AppSettingsModel.findOneAndUpdate(
        {},
        {},
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json(new ApiResponse(200, settings, "App settings retrieved successfully"));
});

// PATCH /api/settings  — admin only
export const updateAppSettings = asyncHandler(async (req, res) => {

    // if (!req.auth || req.auth.userType !== "admin") {
    //     throw new ApiError(403, "Only admin can update app settings");
    // }

    // Whitelist — only allow known feature-flag fields
    const updates = {};
    for (const field of ALLOWED_FIELDS) {
        if (field in req.body) {
            updates[field] = req.body[field];
        }
    }

    if (Object.keys(updates).length === 0) {
        throw new ApiError(400, "No valid fields provided to update");
    }

    // 👉 Get existing settings (for merge)
    let existingSettings = await AppSettingsModel.findOne();

    // 👉 Merge nested config safely
    if (updates.personalConsultationConfig) {
        updates.personalConsultationConfig = {
            ...(existingSettings?.personalConsultationConfig?.toObject?.() || {}),
            ...updates.personalConsultationConfig
        };
    }

    const settings = await AppSettingsModel.findOneAndUpdate(
        {},
        { $set: updates },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(new ApiResponse(200, settings, "App settings updated successfully"));
});
