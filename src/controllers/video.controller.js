import { VideoModel } from '../models/video.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';


// Create
export const addVideo = asyncHandler(async (req, res) => {
    const { title, url } = req.body;

    const video = new VideoModel({ title, url });

    await video.save();

    return res.json(new ApiResponse(200, video, "Video Added Successfully"));
});

// Read
export const getVideos = asyncHandler(async (req, res) => {
    const videos = await VideoModel.find();

    return res.json(new ApiResponse(200, videos, "Videos Fetched Successfully"));
});

export const getVideoById = asyncHandler(async (req, res) => {
    const video = await VideoModel.findById(req.params.id);

    if (!video) {
        return res.status(404).json(new ApiResponse(404, null, "Video Not Found"));
    }

    return res.json(new ApiResponse(200, video, "Video Fetched Successfully"));
});

// Update
export const updateVideo = asyncHandler(async (req, res) => {
    const { title, url } = req.body;

    const video = await VideoModel.findById(req.params.id);

    if (!video) {
        return res.status(404).json(new ApiResponse(404, null, "Video Not Found"));
    }

    video.title = title;
    video.url = url;

    await video.save();

    return res.json(new ApiResponse(200, video, "Video Updated Successfully"));
});

// Delete
export const deleteVideo = asyncHandler(async (req, res) => {
    const video = await VideoModel.findByIdAndDelete(req.params.id);

    if (!video) {
        return res.status(404).json(new ApiResponse(404, null, "Video Not Found"));
    }

    return res.json(new ApiResponse(200, null, "Video Deleted Successfully"));
});
