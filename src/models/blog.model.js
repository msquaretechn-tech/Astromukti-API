import mongoose from "mongoose";
import { Schema } from "mongoose";


/// blog schema 
const blogSchema = new Schema({
    vendorId: {
        type: Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    heading: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },

}, { timestamps: true });

/// News schema 
const newsSchema = new Schema({
    vendorId: {
        type: Schema.Types.ObjectId,
        ref: "Vendor"
    },
    heading: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },

}, { timestamps: true });

export const BlogModel = mongoose.model('Blog', blogSchema);

export const NewsModel = mongoose.model('News', newsSchema);