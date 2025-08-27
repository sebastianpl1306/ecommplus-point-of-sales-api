import { Schema, Types } from "mongoose";

export const PaymentMethodSummarySchema = new Schema({
    method: {
        type: Types.ObjectId,
        ref: "PaymentMethod"
    },
    transactionCount: {
        type: Number,
        required: true,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    percentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    }
}, { _id: false });