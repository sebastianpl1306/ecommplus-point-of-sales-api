import { Schema, model } from 'mongoose';
import { PaymentMethod } from '../../interfaces';

export const PaymentMethodSchema: Schema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export const PaymentMethodModel = model<PaymentMethod>('PaymentMethod', PaymentMethodSchema);