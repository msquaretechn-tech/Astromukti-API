import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BlogModel } from '../models/blog.model.js';
import mongoose from 'mongoose';
import { Vendor } from '../models/vendor.model.js';
import { NewsModel } from '../models/blog.model.js';


/// Create a new blog 
export const addBlog = asyncHandler(async (req, res) => {
    const { vendorId, heading, title, description, type } = req.body;
    const image = req.file.filename ?? "";

    let vendorIdObj = vendorId;

    if (type == "admin") {
        let vendor = await Vendor.findOne({ mobile: '1234567890' }, { _id: 1 });
        vendorIdObj = new mongoose.Types.ObjectId(vendor._id);
    }

    const blog = new BlogModel({
        vendorId: vendorIdObj,
        heading,
        title,
        description,
        image
    });

    // Save the blog
    await blog.save();

    // Send success response
    return res.json(new ApiResponse(200, blog, "Blog created successfully"));


});


/// Get  blogs 
export const getBlogs = asyncHandler(async (req, res) => {

    const { vendorId } = req.query;

    let filter = {};
    if (vendorId) {
        filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    const blogs = await BlogModel.aggregate([
        {
            $match: filter
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $lookup: {
                from: "vendors",
                localField: "vendorId",
                foreignField: "_id",
                as: "vendorDetails",
                pipeline: [
                    { $project: { name: 1, mobile: 1, avatar: 1 } }
                ]
            }
        },
        {
            $addFields: {
                vendorDetails: { $arrayElemAt: ["$vendorDetails", 0] }
            }
        }
    ]);
    return res.json(new ApiResponse(200, blogs, "Blogs retrieved successfully"));

});

// Update
export const updateBlog = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const { heading, title, description } = req.body;
    const image = req.file.filename ?? "";


    const updateFields = {};

    if (heading) updateFields.heading = heading;
    if (title) updateFields.title = title;
    if (description) updateFields.description = description;
    if (image) updateFields.image = image;

    const blog = await BlogModel.findByIdAndUpdate(id, updateFields, { new: true });;

    return res.json(new ApiResponse(200, blog, "Blog updated successfully"));

});

// Delete
export const deleteBlog = asyncHandler(async (req, res) => {

    const blog = await BlogModel.findByIdAndDelete(req.params.id);

    if (!blog) {
        throw new ApiError(404, "Blog not found");
    }

    return res.json(new ApiResponse(200, blog, "Blog deleted successfully"));
});

/// Create a new news item
export const addNews = asyncHandler(async (req, res) => {
    const { vendorId, heading, title, description, type } = req.body;
    const image = req.file?.filename || "";

    let vendorIdObj = undefined;

    if (vendorId) {
        vendorIdObj = new mongoose.Types.ObjectId(vendorId);
    } else if (type == "admin") {
        let vendor = await Vendor.findOne({ mobile: '1234567890' }, { _id: 1 });
        if (vendor) vendorIdObj = new mongoose.Types.ObjectId(vendor._id);
    }

    const newsData = {
        ...(vendorIdObj ? { vendorId: vendorIdObj } : {}),
        heading,
        title,
        description,
        image
    };

    const news = new NewsModel(newsData);

    // Save the news
    await news.save();

    // Send success response
    return res.json(new ApiResponse(200, news, "News created successfully"));
});


/// Get news
export const getNews = asyncHandler(async (req, res) => {
    const { vendorId } = req.query;

    let filter = {};
    if (vendorId) {
        filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    const news = await NewsModel.aggregate([
        {
            $match: filter
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $lookup: {
                from: "vendors",
                localField: "vendorId",
                foreignField: "_id",
                as: "vendorDetails",
                pipeline: [
                    { $project: { name: 1, mobile: 1, avatar: 1 } }
                ]
            }
        },
        {
            $addFields: {
                vendorDetails: { $arrayElemAt: ["$vendorDetails", 0] }
            }
        }
    ]);
    return res.json(new ApiResponse(200, news, "News retrieved successfully"));

});

// Update
export const updateNews = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const { heading, title, description } = req.body;
    const image = req.file?.filename || "";


    const updateFields = {};

    if (heading) updateFields.heading = heading;
    if (title) updateFields.title = title;
    if (description) updateFields.description = description;
    if (image) updateFields.image = image;

    const news = await NewsModel.findByIdAndUpdate(id, updateFields, { new: true });;

    return res.json(new ApiResponse(200, news, "News updated successfully"));

});

// Delete
export const deleteNews = asyncHandler(async (req, res) => {

    const news = await NewsModel.findByIdAndDelete(req.params.id);

    if (!news) {
        throw new ApiError(404, "News not found");
    }

    return res.json(new ApiResponse(200, news, "News deleted successfully"));
});