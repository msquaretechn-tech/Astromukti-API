import { CartModel } from '../models/cart.model.js';
import { ProductModel, ProductVariantModel } from '../models/product.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const computeTotal = (items) => {
    return items.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
};

export const addToCart = asyncHandler(async (req, res) => {
    const { productId, variantId, quantity = 1 } = req.body;
    const userId = req.auth._id || req.user?._id;

    if (!productId) throw new ApiError(400, "ProductId is required");

    const product = await ProductModel.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    let price = 0;
    let mrp = 0;
    let discount = 0;
    let variantSnapshot = null;
    let resolvedVariantId = variantId;

    // Fallback: If variantId is not passed, find the first variant of this product
    if (!resolvedVariantId) {
        const firstVariant = await ProductVariantModel.findOne({ productId });
        if (firstVariant) {
            resolvedVariantId = firstVariant._id;
        }
    }

    if (resolvedVariantId) {
        const variant = await ProductVariantModel.findById(resolvedVariantId);
        if (!variant) throw new ApiError(404, "Variant not found");
        if (variant.productId.toString() !== productId.toString()) throw new ApiError(400, "Variant does not belong to product");
        price = Number(variant.price || 0);
        mrp = Number(variant.mrp || 0);
        variantSnapshot = {
            price: price,
            mrp: mrp,
            attributes: variant.attributes || {},
            images: variant.images || []
        };
    } else {
        price = Number(product.price || 0);
        mrp = Number(product.mrp || 0);
        discount = Number(product.discount || 0);
    }

    let cart = await CartModel.findOne({ userId });
    if (!cart) {
        cart = await CartModel.create({
            userId,
            items: [{ productId, variantId: resolvedVariantId, quantity, price, mrp, discount, variantSnapshot }],
            totalPrice: computeTotal([{ price, quantity }])
        });
        await cart.populate('items.productId items.variantId');
        return res.status(201).json(new ApiResponse(201, cart, "Item added to cart"));
    }

    const idx = cart.items.findIndex(i => i.productId.toString() === productId.toString() && String(i.variantId || '') === String(resolvedVariantId || ''));
    if (idx > -1) {
        const newQty = Number(cart.items[idx].quantity || 0) + Number(quantity);
        if (newQty <= 0) {
            cart.items.splice(idx, 1);
        } else {
            cart.items[idx].quantity = newQty;
            cart.items[idx].price = price;
            cart.items[idx].mrp = mrp;
            cart.items[idx].discount = discount;
            cart.items[idx].variantSnapshot = variantSnapshot;
        }
    } else {
        if (Number(quantity) > 0) {
            cart.items.push({ productId, variantId: resolvedVariantId, quantity: Number(quantity), price, mrp, discount, variantSnapshot });
        }
    }

    cart.totalPrice = computeTotal(cart.items);
    await cart.save();
    await cart.populate('items.productId items.variantId');

    return res.status(200).json(new ApiResponse(200, cart, "Cart updated"));
});

export const getCart = asyncHandler(async (req, res) => {
    const userId = req.auth._id || req.user?._id;
    const cart = await CartModel.findOne({ userId }).populate('items.productId items.variantId');
    if (!cart) return res.status(200).json(new ApiResponse(200, { items: [], totalPrice: 0 }, "Cart retrieved"));
    return res.status(200).json(new ApiResponse(200, cart, "Cart retrieved"));
});

export const updateItem = asyncHandler(async (req, res) => {
    const userId = req.auth._id || req.user?._id;
    const { productId, variantId, quantity } = req.body;

    if (!productId) throw new ApiError(400, "ProductId is required");
    if (quantity == null) throw new ApiError(400, "Quantity is required");

    const cart = await CartModel.findOne({ userId });
    if (!cart) throw new ApiError(404, "Cart not found");

    // Flexible matching: If variantId is supplied, match both productId & variantId; otherwise match by productId
    const idx = cart.items.findIndex(i => {
        const matchesProduct = i.productId.toString() === productId.toString();
        if (!matchesProduct) return false;
        if (variantId) {
            return String(i.variantId || '') === String(variantId);
        }
        return true;
    });

    if (idx === -1) throw new ApiError(404, "Item not found in cart");

    if (Number(quantity) <= 0) {
        cart.items.splice(idx, 1);
    } else {
        cart.items[idx].quantity = Number(quantity);
    }

    cart.totalPrice = computeTotal(cart.items);
    await cart.save();
    await cart.populate('items.productId items.variantId');
    return res.status(200).json(new ApiResponse(200, cart, "Cart updated"));
});

export const removeItem = asyncHandler(async (req, res) => {
    const userId = req.auth._id || req.user?._id;
    const { productId } = req.params;
    const { variantId } = req.query;

    if (!productId) throw new ApiError(400, "ProductId is required");

    const cart = await CartModel.findOne({ userId });
    if (!cart) throw new ApiError(404, "Cart not found");

    if (variantId) {
        cart.items = cart.items.filter(i => !(i.productId.toString() === productId.toString() && String(i.variantId || '') === String(variantId)));
    } else {
        cart.items = cart.items.filter(i => i.productId.toString() !== productId.toString());
    }
    cart.totalPrice = computeTotal(cart.items);

    await cart.save();
    await cart.populate('items.productId items.variantId');
    return res.status(200).json(new ApiResponse(200, cart, "Item removed"));
});

export const clearCart = asyncHandler(async (req, res) => {
    const userId = req.auth._id;
    await CartModel.findOneAndDelete({ userId });
    return res.status(200).json(new ApiResponse(200, null, "Cart cleared"));
});
