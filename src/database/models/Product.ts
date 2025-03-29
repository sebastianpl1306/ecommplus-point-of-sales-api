import { Schema, Types, model } from 'mongoose';
import { Products } from '../../interfaces/ProductsInterface';

export const ProductOptionsSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    options: {
        type: [String],
        required: true
    },
}, { _id: false });

export const ProductSchema: Schema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    company: {
        type: Types.ObjectId,
        ref: 'Company',
        required: true
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    discountRate: {
        type: Number,
        required: false
    },
    colors:{
        type: [String],
        required: false
    },
    pointPrice: {
        type: Number,
        required: true,
        default: 0
    },
    price: {
        type: Number,
        required: true
    },
    photoURL: {
        type: [String],
        required: false
    },
    category: {
        type: Types.ObjectId,
        ref: 'Category',
        required: true
    },
    productOptions: {
        type: [ProductOptionsSchema],
        required: false
    },
    isSoldOut: {
        type: Boolean,
        default: false,
        required: true
    },
    isDelete: {
        type: Boolean,
        default: false,
        required: true
    }
});

export const ProductModel = model<Products>('Product', ProductSchema);