import { Schema, Types, model } from 'mongoose';
import { PointOfSales } from '../../interfaces';

export const PointOfSalesSchema: Schema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    company: {
      type: Types.ObjectId,
      ref: 'Company',
      required: true
    },
    paymentMethods: [{
      type: Types.ObjectId,
      ref: 'PaymentMethod',
      required: true
    }]
}, { timestamps: true });

export const PointOfSalesModel = model<PointOfSales>('PointOfSales', PointOfSalesSchema);