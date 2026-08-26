import { OrderModel } from '../models/order.model.js';
import { ProductModel, ProductVariantModel } from '../models/product.model.js';
import { CartModel } from '../models/cart.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Create Order (Place Order)
export const createOrder = asyncHandler(async (req, res) => {
    const { items, shippingAddress, paymentMethod, totalAmount } = req.body;
    const userId = req.auth._id;

    let orderItems = items;

    // Fallback: If no items passed in body, fetch directly from user's active cart
    if (!orderItems || orderItems.length === 0) {
        const cart = await CartModel.findOne({ userId });
        if (!cart || cart.items.length === 0) {
            throw new ApiError(400, "No items provided, and your cart is empty.");
        }
        orderItems = cart.items;
    }

    // Normalize items: ensure price and variantSnapshot come from variant when provided
    const normalizedItems = [];
    for (const it of orderItems) {
        const { productId, variantId, quantity } = it;
        const product = await ProductModel.findById(productId);
        if (!product) throw new ApiError(404, "Product not found");

        // Validate: If the product has variants, a variantId MUST be provided
        const productVariants = await ProductVariantModel.find({ productId });
        if (productVariants.length > 0 && !variantId) {
            throw new ApiError(400, `Product '${product.name}' requires a variant selection. Please provide a variantId.`);
        }

        let price = Number(it.price || 0);
        let variantSnapshot = it.variantSnapshot || null;

        if (variantId) {
            const variant = await ProductVariantModel.findById(variantId);
            if (!variant) throw new ApiError(404, "Variant not found");
            if (variant.productId.toString() !== productId.toString()) throw new ApiError(400, "Variant does not belong to product");
            price = Number(variant.price || 0);
            variantSnapshot = {
                price: price,
                mrp: variant.mrp,
                attributes: variant.attributes || {},
                images: variant.images || []
            };
        }

        normalizedItems.push({ productId, variantId, quantity, price, variantSnapshot });
    }

    const order = await OrderModel.create({
        userId,
        items: normalizedItems,
        totalAmount,
        shippingAddress,
        paymentMethod,
        status: "Pending",
        paymentStatus: "Pending"
    });

    // Update stock and bought count (Product-wise stock)
    for (const item of normalizedItems) {

        // Variant-wise stock update (Commented: stock is now managed at product level)
        /*
        if (item.variantId) {

            await ProductVariantModel.findByIdAndUpdate(
                item.variantId,
                {
                    $inc: {
                        stock: -item.quantity
                    }
                }
            );
        }
        */

        // Deduct stock and update bought count directly on ProductModel
        await ProductModel.findByIdAndUpdate(
            item.productId,
            {
                $inc: {
                    stock: -item.quantity,
                    boughtCount: item.quantity
                }
            }
        );
    }
    // Clear cart if items came from cart (optional logic, assumed handled by frontend or separate call normally, but good to handle here if we pass a flag)
    await CartModel.findOneAndDelete({ userId });

    return res.status(201).json(new ApiResponse(201, order, "Order placed successfully"));
});

// Get All Orders (Admin)
export const getAllOrdersAdmin = asyncHandler(async (req, res) => {
    const { status, paymentStatus } = req.query;
    const query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const orders = await OrderModel.find(query)
        .sort({ createdAt: -1 })
        .populate("userId", "name email mobile avatar")
        .populate("items.productId")
        .populate("items.variantId");

    return res.status(200).json(new ApiResponse(200, orders, "All orders retrieved successfully"));
});

// Get Order History (User)
export const getOrderHistory = asyncHandler(async (req, res) => {
    const userId = req.auth._id;
    const orders = await OrderModel.find({ userId })
        .sort({ createdAt: -1 })
        .populate('items.productId items.variantId');

    return res.status(200).json(new ApiResponse(200, orders, "Order history retrieved successfully"));
});

// Get Order Details By ID
export const getOrderById = asyncHandler(async (req, res) => {
    const order = await OrderModel.findById(req.params.id)
        .populate("userId", "name email mobile avatar")
        .populate('items.productId items.variantId');

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    return res.status(200).json(new ApiResponse(200, order, "Order retrieved successfully"));
});

// Update Order Status (Admin/Vendor)
export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status, paymentStatus } = req.body;
    const order = await OrderModel.findByIdAndUpdate(
        req.params.id,
        {
            ...(status && { status }),
            ...(paymentStatus && { paymentStatus })
        },
        { new: true }
    );

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    return res.status(200).json(new ApiResponse(200, order, "Order status updated successfully"));
});
