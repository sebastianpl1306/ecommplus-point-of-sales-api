import { Schema } from "mongoose";

export const VoidedTransactionSchema = new Schema({
    orderId: {
        type: Schema.Types.ObjectId,
        ref: 'OrderPoint',
        required: true
    },
    originalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    voidedAt: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        maxlength: 200
    },
    voidedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { _id: false });