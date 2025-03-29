import { Schema, Types, model } from 'mongoose';
import { Order, PaymentMethods } from '../../interfaces';

export const OrderSchema: Schema = new Schema({
    user: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        default: 'new'
    },
    idPayment: {
        type: Number,
        required: false
    },
    paymentMethod: {
        type: String,
        required: true,
        default: PaymentMethods.CASH
    },
    company: {
        type: Types.ObjectId,
        ref: 'Company',
        required: true
    },
    homeCost: {
        type: Number,
        required: true,
        default: 0
    },
    comment: {
        type: String,
        required: false
    },
    subtotal: {
        type: Number,
        required: true
    }
}, { timestamps: true });

export const OrderModel = model<Order>('Order', OrderSchema);