import mongoose, { Schema } from "mongoose";

const cartItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: false },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    variantSnapshot: {
        price: { type: Number },
        mrp: { type: Number },
        attributes: { type: Map, of: String },
        images: { type: [String] }
    }
}, { _id: false });

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    items: [cartItemSchema],
    totalPrice: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export const CartModel = mongoose.model("Cart", cartSchema);
