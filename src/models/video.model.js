import mongoose from "mongoose";
import { Schema } from "mongoose";


/// Video schema 
const videoSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },

}, { timeseries: true });

export const VideoModel = mongoose.model('Video', videoSchema);