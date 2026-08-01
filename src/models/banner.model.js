import mongoose, { Mongoose } from "mongoose";
import { Schema } from "mongoose";


/// banner schema 
const bannerSchema = new Schema({

    title: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    redirectUrl: {
        type: String,
        required: true
    },

}, { timestamps: true });

/// testimonial schema 
const testimonialSchema = new Schema({
    review: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    }

}, { timestamps: true });

/// Feedback schema 
const feedbackSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    feedback: {
        type: String,
        required: true
    }

}, { timestamps: true });




export const BannerModel = mongoose.model('Banner', bannerSchema);

export const TestimonialModel = mongoose.model('Testimonial', testimonialSchema);

export const FeedbackModel = mongoose.model('Feedback', feedbackSchema);