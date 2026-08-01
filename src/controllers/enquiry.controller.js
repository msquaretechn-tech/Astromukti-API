import { EnquiryModel } from "../models/enquiry.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


export const sendEnquiry = asyncHandler(async (req, res) => {
    const {
        consultationType,
        duration,
        amount
    } = req.body;

    // Ensure all required fields are present
    if (!consultationType || !duration || !amount) {
        throw new ApiError(400, "Missing required fields for enquiry");
    }

    const enquiry = await EnquiryModel.create({
        userId: req.auth._id,
        consultationType,
        duration,
        amount,
        status: 'success'
    });

    if (!enquiry) {
        throw new ApiError(500, "Something went wrong while creating enquiry");
    }

    return res.status(201).json(new ApiResponse(201, enquiry, "Enquiry sent successfully"));

});


export const fetchEnquiry = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, userId, consultationType } = req.query;

    const filter = {};

    if (userId) {
        filter.userId = new mongoose.Types.ObjectId(userId);
    }

    if (consultationType) {
        filter.consultationType = consultationType;
    }

    const consultations = await EnquiryModel.find(filter)
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await EnquiryModel.countDocuments(filter);

    const response = {
        total,
        page: Number(page),
        data: consultations
    }
    return res.status(200).json(new ApiResponse(200, response, "Enquiries fetched successfully"));
});

export const updateEnquiry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    let updateFields = {};

    if (status) {
        updateFields.status = status;
    }

    const updatedEnquiry = await EnquiryModel.findByIdAndUpdate(id,
        { $set: updateFields },
        { new: true, runValidators: true }
    );
    
    return res.status(200).json(new ApiResponse(200, updatedEnquiry, 'Updated successfully'))

})
