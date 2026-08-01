import { BannerModel, FeedbackModel, TestimonialModel } from '../models/banner.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';


// Create Banner
export const createBanner = asyncHandler(async (req, res) => {
    const { title, redirectUrl } = req.body;

    const image = req.file.filename ?? "";

    const newBanner = new BannerModel({ title, image, redirectUrl });

    try {
        await newBanner.save();
        return res.status(201).json(new ApiResponse(201, newBanner, "Banner created successfully"));
    } catch (error) {

        throw new ApiError(404, error.message);
    }
});

// Read All Banners
export const getAllBanners = asyncHandler(async (req, res) => {
    const banners = await BannerModel.find();
    return res.json(new ApiResponse(200, banners, "Banners retrieved successfully"));
});

// Read Banner by ID
export const getBannerById = asyncHandler(async (req, res) => {
    const banner = await BannerModel.findById(req.params.id);

    if (!banner) {
        return res.status(404).json(new ApiResponse(404, null, "Banner not found"));
    }

    return res.json(new ApiResponse(200, banner, "Banner retrieved successfully"));
});

// Update Banner by ID
export const updateBannerById = asyncHandler(async (req, res) => {

    const { title, redirectUrl } = req.body;

    const image = req.file.filename ?? "";

    try {
        const updatedBanner = await BannerModel.findByIdAndUpdate(req.params.id, {
            title,
            image,
            redirectUrl
        }, { new: true });

        return res.status(200).json(new ApiResponse(200, updatedBanner, "Banner updated successfully"));
    } catch (error) {
        return res.status(400).json(new ApiResponse(400, null, error.message));
    }
});

// Delete Banner by ID
export const deleteBannerById = asyncHandler(async (req, res) => {
    const deletedBanner = await BannerModel.findByIdAndDelete(req.params.id);

    if (!deletedBanner) {
        return res.status(404).json(new ApiResponse(404, null, "Banner not found"));
    }

    return res.json(new ApiResponse(200, deletedBanner, "Banner deleted successfully"));
});


// Create Testimonial
export const createTestimonial = asyncHandler(async (req, res) => {
    const { review, name, address } = req.body;

    const testimonial = await TestimonialModel.create({
        review,
        name,
        address
    });

    return res.status(201).json(new ApiResponse(201, testimonial, "Testimonial created successfully"));
});

// Read All Testimonials
export const getAllTestimonials = asyncHandler(async (req, res) => {
    const testimonials = await TestimonialModel.find().sort({ createdAt: -1 });
    return res.json(new ApiResponse(200, testimonials, "Testimonials retrieved successfully"));
});

// Read Testimonial by ID
export const getTestimonialById = asyncHandler(async (req, res) => {
    const testimonial = await TestimonialModel.findById(req.params.id);

    if (!testimonial) {
        return res.status(404).json(new ApiResponse(404, null, "Testimonial not found"));
    }

    return res.json(new ApiResponse(200, testimonial, "Testimonial retrieved successfully"));
});

// Update Testimonial by ID
export const updateTestimonialById = asyncHandler(async (req, res) => {
    const { review, name, address } = req.body;

    try {
        const updatedTestimonial = await TestimonialModel.findByIdAndUpdate(req.params.id, {
            review,
            name,
            address
        }, { new: true });

        if (!updatedTestimonial) {
            return res.status(404).json(new ApiResponse(404, null, "Testimonial not found"));
        }

        return res.status(200).json(new ApiResponse(200, updatedTestimonial, "Testimonial updated successfully"));
    } catch (error) {
        return res.status(400).json(new ApiResponse(400, null, error.message));
    }
});

// Delete Testimonial by ID
export const deleteTestimonialById = asyncHandler(async (req, res) => {
    const deletedTestimonial = await TestimonialModel.findByIdAndDelete(req.params.id);

    if (!deletedTestimonial) {
        return res.status(404).json(new ApiResponse(404, null, "Testimonial not found"));
    }

    return res.json(new ApiResponse(200, deletedTestimonial, "Testimonial deleted successfully"));
});


// Create Feedback
export const createFeedback = asyncHandler(async (req, res) => {
    const { userId, feedback } = req.body;
    const feedbackData = await FeedbackModel.create({
        userId,
        feedback
    });
    return res.status(201).json(new ApiResponse(201, feedbackData, "Feedback created successfully"));
});

// Read All Feedbacks
export const getAllFeedbacks = asyncHandler(async (req, res) => {
    const feedbacks = await FeedbackModel.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userDetails",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            lastName: 1,
                            mobile: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$userDetails"
        }
    ]);
    return res.json(new ApiResponse(200, feedbacks, "Feedbacks retrieved successfully"));
});

