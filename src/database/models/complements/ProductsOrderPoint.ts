import { Schema, Types } from "mongoose";
import { OptionsSelectedSchema } from "./ProductsOrder";
import { ProductOrderPointStatus } from "../../../interfaces";

export const ProductsOrderPointSchema = new Schema({
    product: {
        type: Types.ObjectId,
        ref: 'Product',
        required: true
    },
    amount:{
        type: Number,
        required: true
    },
    discountRate: {
        type: Number,
        required: false
    },
    price:{
        type: Number,
        required: true
    },
    status: { 
        type: String, 
        enum: ProductOrderPointStatus, 
        default: ProductOrderPointStatus.PENDING
    },
    note: {
        type: String,
        required: false
    },
    optionsSelected: {
        type: [ OptionsSelectedSchema ],
        required: false
    }
}, { _id: false });