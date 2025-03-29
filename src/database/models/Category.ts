import { Schema, Types, model } from 'mongoose';
import { Category } from '../../interfaces/ProductsInterface';

const CategorySchema: Schema = new Schema({
    name: {
        type: String,
        required: true
    },
    img: {
        type: String,
        required: false
    },
    company: {
        type: Types.ObjectId,
        ref: 'Company',
        required: true
    },
    isDelete: {
        type: Boolean,
        default: false
    }
});

export const CategoryModel = model<Category>('Category',CategorySchema);