import { Schema, Types, model } from 'mongoose';
import { OrderDetails } from '../../interfaces';
import { ProductsOrderSchema } from './complements';

export const OrderDetailsSchema: Schema = new Schema({
    order: {
        type: Types.ObjectId,
        ref: 'Order',
        required: true
    },
    products: [ProductsOrderSchema]
}, { timestamps: true });

export const OrderDetailsModel = model<OrderDetails>('OrderDetails', OrderDetailsSchema);