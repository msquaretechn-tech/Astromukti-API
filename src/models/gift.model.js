import mongoose, { Schema } from "mongoose";

const giftSchema = new Schema({
    icon: {
        type: String,
    },
    label: {
        type: String,
    },
    price: {
        type: Number,
        default: 1,
    },
},
    { timestamps: true }
);




export const Gift = mongoose.model("Gift", giftSchema);