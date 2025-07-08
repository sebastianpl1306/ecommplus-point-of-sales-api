import { Schema, Types, model } from 'mongoose';
import { Company } from '../../interfaces';

export const CompanySchema: Schema = new Schema({
    identifier: {
        type: Number,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true
    },
    openingTime: {
        type: String,
        required: true
    },
    closeTime: {
        type: String,
        required: true
    },
    isClose: {
        type: Boolean,
        required: true,
        default: false
    },
    config: {
        type: Types.ObjectId,
        ref: 'CompanyConfig',
        required: true
    },
    design: {
        type: Types.ObjectId,
        ref: 'DesignCompany',
        required: true
    },
}, { timestamps: true });

export const CompanyModel = model<Company>('Company', CompanySchema);