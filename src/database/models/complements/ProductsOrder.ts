import { Schema, Types } from 'mongoose';

export const OptionItemSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    option: {
        type: String,
        required: true
    },
}, { _id: false });

export const OptionsSelectedSchema = new Schema({
    item: {
        type: Number,
        required: true
    },
    options: {
        type: [OptionItemSchema],
        required: true
    },
}, { _id: false });


export const ProductsOrderSchema = new Schema({
    product: {
        type: Types.ObjectId,
        ref: 'Product',
        required: true
    },
    amount:{
        type: Number,
        required: true
    },
    selectedColor: {
        type: String,
        required: false
    },
    discountRate: {
        type: Number,
        required: false
    },
    price:{
        type: Number,
        required: true
    },
    optionsSelected: {
        type: [ OptionsSelectedSchema ],
        required: false
    }
}, { _id: false });