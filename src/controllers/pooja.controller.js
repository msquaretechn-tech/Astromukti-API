import { PoojaModel } from "../models/pooja.model.js";
import { PoojaBookingModel } from "../models/poojaBooking.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


export const getAllPoojas = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const poojas = await PoojaModel.find()
        .populate("categoryId")
        .skip(skip)
        .limit(limit);

    const total = await PoojaModel.countDocuments();

    return res.status(200).json(
        new ApiResponse(200, {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            poojaList: poojas,
        }, "Poojas retrieved successfully")
    );
});

export const getPoojaById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pooja = await PoojaModel.findById(id).populate("categoryId");

    if (!pooja) {
        throw new ApiError(404, "Pooja not found");
    }

    return res.status(200).json(
        new ApiResponse(200, pooja, "Pooja retrieved successfully")
    );
});

export const createPooja = asyncHandler(async (req, res) => {
    const { name, price, mrp, shortDescription, description, procedure, benefits, categoryId } = req.body;

    // Handle image upload if present (assuming middleware handles file upload and puts path in req.file)
    let image = "";
    if (req.file) {
        image = req.file.filename;
    }

    const newPooja = new PoojaModel({
        name,
        price,
        mrp,
        shortDescription,
        description,
        procedure,
        benefits,
        categoryId,
        image
    });

    await newPooja.save();

    return res.status(201).json(new ApiResponse(201, newPooja, "Pooja created successfully"));
});

export const bookPooja = asyncHandler(async (req, res) => {
    const { poojaId, date, time, devoteeName, gotra, price, couponCode, discountAmount } = req.body;
    const userId = req.auth._id;

    const newBooking = new PoojaBookingModel({
        userId,
        poojaId,
        date,
        time,
        devoteeName,
        gotra,
        price,
        couponCode,
        discountAmount,
        status: "Pending",
        paymentStatus: "Pending"
    });

    await newBooking.save();

    return res.status(201).json(
        new ApiResponse(201, newBooking, "Pooja booked successfully")
    );
});

export const getUserBookings = asyncHandler(async (req, res) => {
    const userId = req.auth._id;
    const bookings = await PoojaBookingModel.find({ userId })
        .populate("poojaId")
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, bookings, "Bookings retrieved successfully")
    );
});
