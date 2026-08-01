import { CategoryModel } from '../models/category.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Create Category
export const createCategory = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    let image = "";
    if (req.file) {
        image = req.file.filename;
    }

    if (!name) {
        throw new ApiError(400, "Name is required");
    }

    const category = await CategoryModel.create({
        name,
        description,
        image
    });

    return res.status(201).json(new ApiResponse(201, category, "Category created successfully"));
});

// Get All Categories
export const getAllCategories = asyncHandler(async (req, res) => {
    const categories = await CategoryModel.find({ isActive: true });
    return res.status(200).json(new ApiResponse(200, categories, "Categories retrieved successfully"));
});

// Get Category By ID
export const getCategoryById = asyncHandler(async (req, res) => {
    const category = await CategoryModel.findById(req.params.id);
    if (!category) {
        throw new ApiError(404, "Category not found");
    }
    return res.status(200).json(new ApiResponse(200, category, "Category retrieved successfully"));
});

// Update Category
export const updateCategory = asyncHandler(async (req, res) => {
    const { name, description, isActive } = req.body;
    let updateData = { name, description, isActive };

    if (req.file) {
        updateData.image = req.file.filename;
    }

    const category = await CategoryModel.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!category) {
        throw new ApiError(404, "Category not found");
    }
    return res.status(200).json(new ApiResponse(200, category, "Category updated successfully"));
});

// Delete Category
export const deleteCategory = asyncHandler(async (req, res) => {
    const category = await CategoryModel.findByIdAndDelete(req.params.id);
    if (!category) {
        throw new ApiError(404, "Category not found");
    }
    return res.status(200).json(new ApiResponse(200, category, "Category deleted successfully"));
});
