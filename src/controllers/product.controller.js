import { ProductModel, ProductVariantModel, ProductReviewModel } from '../models/product.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import fs from "fs";
import path from "path";

// Create Product
export const createProduct = asyncHandler(async (req, res) => {
    const { name, description, category, tags, url, seoUrl, metaTitle, metaDescription, faqDescription, pageDescription } = req.body;

    let images = [];

    if (req.files) {
        images = req.files.map(file => file.filename);
    }

    let faqs = [];
    if (req.body.faqs) {
        faqs = typeof req.body.faqs === "string" ? JSON.parse(req.body.faqs) : req.body.faqs;
    }

    let banners = [];
    if (req.body.banners) {
        banners = typeof req.body.banners === "string" ? JSON.parse(req.body.banners) : req.body.banners;
    }

    let stock = 0;
    if (req.body.stock !== undefined && req.body.stock !== null && req.body.stock !== "") {
        const parsedStock = Number(req.body.stock);
        if (!isNaN(parsedStock)) {
            stock = parsedStock;
        }
    }

    const product = await ProductModel.create({
        name,
        description,
        category,
        stock,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(",").map(tag => tag.trim())) : [],
        images,
        faqs,
        banners,
        url: seoUrl || url,
        metaTitle,
        metaDescription,
        faqDescription,
        pageDescription
    });

    let variants = JSON.parse(req.body.variants);

    const variantList = variants.map(item => ({

        productId: product._id,

        attributes: item.attributes,

        price: item.price,

        mrp: item.mrp,

        discount: item.discount,

        // Variant-wise stock (Commented: stock is now managed at product level)
        // stock: item.stock

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

    const products = await ProductModel.find(query)
        .populate("category", "name")
        // .sort({ createdAt: -1 })
        .lean();

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

    const product = await ProductModel.findById(req.params.id).populate("category", "name");

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

    const { name, description, category, tags, status, url, seoUrl, metaTitle, metaDescription, faqDescription, pageDescription } = req.body;

    const product = await ProductModel.findById(req.params.id);

    if (!product) {
        throw new ApiError(404, "Product not found");
    }


    const updateData = {};


    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (status) updateData.status = status;

    if (req.body.stock !== undefined && req.body.stock !== null && req.body.stock !== "") {
        const parsedStock = Number(req.body.stock);
        if (!isNaN(parsedStock)) {
            updateData.stock = parsedStock;
        }
    }

    // SEO / Meta fields
    if (seoUrl !== undefined) updateData.url = seoUrl;
    else if (url !== undefined) updateData.url = url;

    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (faqDescription !== undefined) updateData.faqDescription = faqDescription;
    if (pageDescription !== undefined) updateData.pageDescription = pageDescription;

    if (req.body.faqs !== undefined) {
        updateData.faqs = typeof req.body.faqs === "string" ? JSON.parse(req.body.faqs) : req.body.faqs;
    }

    if (req.body.banners !== undefined) {
        updateData.banners = typeof req.body.banners === "string" ? JSON.parse(req.body.banners) : req.body.banners;
    }


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

    // Variant-wise stock update (Commented: stock is now managed at product level)
    // if (req.body.stock !== undefined) {
    //     variant.stock = Number(req.body.stock);
    // }


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

    const userId = req.auth?._id || req.body.userId;
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

    const query = {
        _id: { $ne: product._id },
        status: "ACTIVE"
    };

    if (product.category) {
        query.category = product.category;
    }

    let products = await ProductModel.find(query).lean().limit(8);

    // Fallback if no products in the same category
    if (products.length === 0) {
        products = await ProductModel.find({
            _id: { $ne: product._id },
            status: "ACTIVE"
        }).lean().limit(8);
    }

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

    const response = products.map((item) => ({
        ...item,
        variants: variantMap[item._id] || [],
    }));

    return res.status(200).json(new ApiResponse(200, response, "Related products"));
});

// --- Product Banner Controllers ---
export const addProductBanner = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { linkUrl, sortOrder, isActive, title } = req.body;

    const image = req.file ? req.file.filename : req.body.image;

    if (!image) {
        throw new ApiError(400, "Banner image is required");
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    const newBanner = {
        image,
        title: title || "",
        linkUrl: linkUrl || "",
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        isActive: isActive !== undefined ? (isActive === true || isActive === "true") : true
    };

    product.banners.push(newBanner);
    await product.save();

    return res.status(201).json(new ApiResponse(201, product.banners, "Product banner added successfully"));
});

export const updateProductBanner = asyncHandler(async (req, res) => {
    const { productId, bannerId } = req.params;
    const { linkUrl, sortOrder, isActive, title } = req.body;

    const product = await ProductModel.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    const banner = product.banners.id(bannerId);
    if (!banner) {
        throw new ApiError(404, "Banner not found");
    }

    if (req.file) {
        // Delete old image if it exists
        if (banner.image) {
            const oldPath = path.join(process.cwd(), "public/images", banner.image);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
        banner.image = req.file.filename;
    } else if (req.body.image) {
        banner.image = req.body.image;
    }

    if (linkUrl !== undefined) banner.linkUrl = linkUrl;
    if (title !== undefined) banner.title = title;
    if (sortOrder !== undefined) banner.sortOrder = Number(sortOrder);
    if (isActive !== undefined) banner.isActive = (isActive === true || isActive === "true");

    await product.save();

    return res.status(200).json(new ApiResponse(200, product.banners, "Product banner updated successfully"));
});

export const deleteProductBanner = asyncHandler(async (req, res) => {
    const { productId, bannerId } = req.params;

    const product = await ProductModel.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    const banner = product.banners.id(bannerId);
    if (!banner) {
        throw new ApiError(404, "Banner not found");
    }

    if (banner.image) {
        const imagePath = path.join(process.cwd(), "public/images", banner.image);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }

    product.banners.pull(bannerId);
    await product.save();

    return res.status(200).json(new ApiResponse(200, product.banners, "Product banner deleted successfully"));
});

// --- Product FAQ Controllers ---

export const addProductFaq = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { question, answer, sortOrder, isActive, type } = req.body;

    if (!question || !answer) {
        throw new ApiError(400, "Question and Answer are required");
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    const newFaq = {
        question,
        answer,
        type: type ?? "faq",
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        isActive: isActive !== undefined ? (isActive === true || isActive === "true") : true
    };

    if (type == 'benefits') {
        product.benefits.push(newFaq);
    } else {
        product.faqs.push(newFaq);
    }

    await product.save();

    const collection = type === "benefits" ? product.benefits : product.faqs;

    return res.status(201).json(
        new ApiResponse(
            201,
            collection,
            `${type === "benefits" ? "Benefit" : "FAQ"} added successfully`
        )
    );
});

export const updateProductFaq = asyncHandler(async (req, res) => {
    const { productId, faqId } = req.params;
    const { question, answer, sortOrder, isActive, type } = req.body;

    const product = await ProductModel.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    const collection = type === "benefits" ? product.benefits : product.faqs;

    const item = collection.id(faqId);
    if (!item) {
        throw new ApiError(404, `${type === "benefits" ? "Benefit" : "FAQ"} not found`);
    }

    if (question !== undefined) item.question = question;
    if (answer !== undefined) item.answer = answer;
    if (sortOrder !== undefined) item.sortOrder = Number(sortOrder);
    if (isActive !== undefined)
        item.isActive = isActive === true || isActive === "true";

    await product.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            collection,
            `${type === "benefits" ? "Benefit" : "FAQ"} updated successfully`
        )
    );
});

export const deleteProductFaq = asyncHandler(async (req, res) => {
    const { productId, faqId } = req.params;
    const { type } = req.body; // or req.query.type

    const product = await ProductModel.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    const collection = type === "benefits" ? product.benefits : product.faqs;

    const item = collection.id(faqId);
    if (!item) {
        throw new ApiError(404, `${type === "benefits" ? "Benefit" : "FAQ"} not found`);
    }

    collection.pull(faqId);

    await product.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            collection,
            `${type === "benefits" ? "Benefit" : "FAQ"} deleted successfully`
        )
    );
});

// Reorder Product Images
export const reorderProductImages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { images } = req.body;

    let imageList = images;
    if (typeof images === "string") {
        try {
            imageList = JSON.parse(images);
        } catch {
            imageList = [images];
        }
    }

    if (!Array.isArray(imageList)) {
        throw new ApiError(400, "Images must be an array of image filenames");
    }

    const product = await ProductModel.findById(id);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    product.images = imageList;
    await product.save();

    return res.status(200).json(
        new ApiResponse(200, product, "Product images reordered successfully")
    );
});

// Delete Single Product Image
export const deleteProductImage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { imageName } = req.body;

    if (!imageName) {
        throw new ApiError(400, "Image name is required");
    }

    const product = await ProductModel.findById(id);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    if (!product.images?.includes(imageName)) {
        throw new ApiError(404, "Image not found in product");
    }

    // 1. Remove image filename from product.images array
    product.images = product.images.filter(img => img !== imageName);
    await product.save();

    // 2. Delete file from server disk
    const filePath = path.join(process.cwd(), "public/images", imageName);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    return res.status(200).json(
        new ApiResponse(200, product, "Product image deleted successfully")
    );
});