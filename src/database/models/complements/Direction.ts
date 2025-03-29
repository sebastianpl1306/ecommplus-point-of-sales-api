import { Schema } from 'mongoose';

export const DirectionSchema = new Schema({
    description: {
        type: String,
        default: ''
    },
    neighborhood: {
        type: String,
        default: ''
    },
    isValid: {
        type: Boolean,
        default: true
    }
}, { _id: false });