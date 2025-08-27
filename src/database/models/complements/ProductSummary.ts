import { Schema } from "mongoose";

export const ProductSummarySchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    quantitySold: {
        type: Number,
        required: true,
        min: 0
    },
    totalRevenue: {
        type: Number,
        required: true,
        min: 0
    },
    averagePrice: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });