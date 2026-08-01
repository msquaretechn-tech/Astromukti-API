import { ProductModel, ProductVariantModel, ProductReviewModel } from '../models/product.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import fs from "fs";
import path from "path";

// Create Product
export const createProduct = asyncHandler(async (req, res) => {
    const { name, description, category, tags } = req.body;

    let images = [];

    if (req.files) {
        images = req.files.map(file => file.filename);
    }

    const product = await ProductModel.create({
        name,
        description,
        category,
        tags: tags.split(",").map(tag => tag.trim()),
        images
    });

    let variants = JSON.parse(req.body.variants);

    const variantList = variants.map(item => ({

        productId: product._id,

        attributes: item.attributes,

        price: item.price,

        mrp: item.mrp,

        discount: item.discount,

        stock: item.stock

    }));

    await ProductVariantModel.insertMany(variantList);

    return res.status(201).json(new ApiResponse(201, product, "Product Added successfully"));
});

// Get All Products (with filtering)
export const getAllProducts = asyncHandler(async (req, res) => {
    const { category, search, status } = req.query;

    const query = {};

    if (category) {
        query.category = category;
    }

    if (status) {
        query.status = status;
    }

    if (search) {
        query.name = {
            $regex: search,
            $options: "i",
        };
    }

    const products = await ProductModel.find(query).lean();

    const productIds = products.map((item) => item._id);

    const variants = await ProductVariantModel.find({
        productId: { $in: productIds },
    }).lean();

    const variantMap = {};

    variants.forEach((variant) => {
        if (!variantMap[variant.productId]) {
            variantMap[variant.productId] = [];
        }

        variantMap[variant.productId].push(variant);
    });

    const response = products.map((product) => ({
        ...product,
        variants: variantMap[product._id] || [],
    }));

    return res.status(200).json(new ApiResponse(200, response, "Products retrieved successfully"));
});

// Get Product By ID
export const getProductById = asyncHandler(async (req, res) => {

    const product = await ProductModel.findById(req.params.id);

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    const variants = await ProductVariantModel.find({
        productId: req.params.id
    });

    let data = { ...product.toObject(), variants };

    return res.status(200).json(new ApiResponse(200, data, "Product retrieved successfully"));

});

// Update Product
export const updateProduct = asyncHandler(async (req, res) => {

    const { name, description, category, tags, status } = req.body;

    const product = await ProductModel.findById(req.params.id);

    if (!product) {
        throw new ApiError(404, "Product not found");
    }


    const updateData = {};


    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (status) updateData.status = status;


    // Update tags
    if (tags) {
        updateData.tags = Array.isArray(tags)
            ? tags
            : tags.split(",").map(tag => tag.trim());
    }


    // Update images if new images uploaded
    if (req.files && req.files.length > 0) {

        // Delete old images
        if (product.images?.length) {

            product.images.forEach((image) => {

                const filePath = path.join(
                    process.cwd(),
                    "public/images",
                    image
                );

                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }

            });
        }


        updateData.images = req.files.map(
            file => file.filename
        );
    }


    const updatedProduct = await ProductModel.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
            new: true,
            runValidators: true
        }
    );


    return res.status(200).json(new ApiResponse(200, updatedProduct, "Product updated successfully"));

});

export const updateProductVariant = asyncHandler(async (req, res) => {

    const variant = await ProductVariantModel.findById(
        req.params.variantId
    );

    if (!variant) {
        throw new ApiError(404, "Variant not found");
    }


    if (req.body.attributes) {
        variant.attributes = JSON.parse(req.body.attributes);
    }

    if (req.body.mrp !== undefined) {
        variant.mrp = Number(req.body.mrp);
    }

    if (req.body.price !== undefined) {
        variant.price = Number(req.body.price);
    }

    if (req.body.stock !== undefined) {
        variant.stock = Number(req.body.stock);
    }


    if (req.files?.length) {
        variant.images = req.files.map(
            file => file.filename
        );
    }


    await variant.save();


    return res.status(200).json(new ApiResponse(200, variant, "Variant updated successfully"));

});

// Delete Product
export const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Find product
    const product = await ProductModel.findById(id);

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    // Find all variants
    const variants = await ProductVariantModel.find({
        productId: id,
    });

    // Delete product images
    if (product.images?.length) {
        product.images.forEach((image) => {

            const filePath = path.join(
                process.cwd(),
                "public/images",
                image
            );

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    }


    // Delete variant images
    variants.forEach((variant) => {

        if (variant.images?.length) {

            variant.images.forEach((image) => {

                const filePath = path.join(
                    process.cwd(),
                    "public/images",
                    image
                );

                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }
    });

    // Delete all variants
    await ProductVariantModel.deleteMany({
        productId: id,
    });

    // Delete product
    await ProductModel.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, null, "Product deleted successfully"));

});


export const createReview = asyncHandler(async (req, res) => {

    const { rating, review } = req.body;

    const userId = req.auth._id;
    const productId = req.params.productId;

    const product = await ProductModel.findById(productId);

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    const alreadyReviewed = await ProductReviewModel.findOne({
        productId,
        userId
    });

    if (alreadyReviewed) {
        throw new ApiError(400, "You have already reviewed this product");
    }

    const newReview = await ProductReviewModel.create({
        productId,
        userId,
        rating: Number(rating),
        review
    });

    const prevCount = product.reviewsCount || 0;
    const prevRating = product.rating || 0;

    const newCount = prevCount + 1;

    const newAvgRating =
        ((prevRating * prevCount) + Number(rating)) / newCount;

    product.reviewsCount = newCount;
    product.rating = Number(newAvgRating.toFixed(2));

    await product.save();

    return res.status(201).json(new ApiResponse(201, newReview, "Review submitted successfully"));

});

export const getProductReviews = asyncHandler(async (req, res) => {

    const reviews = await ProductReviewModel.find({
        productId: req.params.productId,
        isActive: true
    }).populate("userId", "name avatar").sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, reviews, "Reviews fetched successfully"));

});


export const getRelatedProducts = asyncHandler(async (req, res) => {

    const product = await ProductModel.findById(req.params.productId);

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    const products = await ProductModel.find({
        _id: { $ne: product._id },
        // category: product.category,
        status: "ACTIVE"
    }).limit(8);

    return res.status(200).json(new ApiResponse(200, products, "Related products"));

});