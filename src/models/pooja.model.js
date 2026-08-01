import mongoose, { Schema } from "mongoose";

const poojaSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        default: ""
    },
    price: {
        type: Number,
        required: true
    },
    mrp: {
        type: Number,
        default: 0
    },
    shortDescription: {
        type: String,
        default: ""
    },
    description: {
        type: String, // Detailed description
        default: ""
    },
    procedure: {
        type: String, // Procedure content
        default: ""
    },
    benefits: {
        type: String,
        default: ""
    },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: "Category"
    }
}, { timestamps: true });

export const PoojaModel = mongoose.model("Pooja", poojaSchema);
