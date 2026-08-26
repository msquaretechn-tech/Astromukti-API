import mongoose, { Schema } from "mongoose";

const productFaqSchema = new Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },
    answer: {
        type: String,
        required: true,
        trim: true
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    type: {
        type: String,
        default: 'faq'
    }
}, { _id: true });

const productBannerSchema = new Schema({
    image: {
        type: String,
        required: true
    },
    title: {
        type: String,
        trim: true,
        default: ""
    },
    linkUrl: {
        type: String,
        trim: true,
        default: ""
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: true });

const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: false
    },
    images: {
        type: [String]
    },
    description: {
        type: String
    },
    tags: {
        type: [String]
    },
    rating: {
        type: Number,
        default: 0
    },
    reviewsCount: {
        type: Number,
        default: 0
    },
    boughtCount: {
        type: Number,
        default: 0
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE"
    },
    faqs: [productFaqSchema],
    benefits: [productFaqSchema],
    banners: [productBannerSchema],
    url: {
        type: String,
        trim: true
    },
    metaTitle: {
        type: String,
        trim: true
    },
    metaDescription: {
        type: String,
        trim: true
    },
    faqDescription: {
        type: String,
        trim: true
    },
    pageDescription: {
        type: String,
        trim: true
    },
}, { timestamps: true });

const productVariantSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true
    },
    attributes: {
        type: Map,
        of: String,
        default: {}
    },
    images: {
        type: [String]
    },
    mrp: {
        type: Number,
        required: true,
        min: 0
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: function (value) {
                return value <= this.mrp;
            },
            message: "Price cannot be greater than MRP."
        }
    },
    // Variant-wise stock (Commented out in favor of product-wise stock)
    stock: {
        type: Number,
        required: false,
        default: 0,
        min: 0
    }
}, { timestamps: true });

productVariantSchema.virtual("discountPercentage").get(function () {
    if (this.mrp === 0) return 0;
    return Math.round(((this.mrp - this.price) / this.mrp) * 100);
});

productVariantSchema.virtual("discountAmount").get(function () {
    return this.mrp - this.price;
});

productVariantSchema.set("toJSON", { virtuals: true });
productVariantSchema.set("toObject", { virtuals: true });



const reviewSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    review: {
        type: String,
        trim: true
    },

    images: [String],

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

reviewSchema.index(
    {
        productId: 1,
        userId: 1
    },
    {
        unique: true
    }
);

export const ProductModel = mongoose.model("Product", productSchema);

export const ProductVariantModel = mongoose.model("ProductVariant", productVariantSchema);

export const ProductReviewModel = mongoose.model("Review", reviewSchema);