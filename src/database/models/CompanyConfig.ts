import { Schema, model } from 'mongoose';
import { CompanyConfig } from '../../interfaces';
import { CredentialsConfigSchema } from './complements';

export const CompanyConfigSchema: Schema = new Schema({
    email: {
        type: String,
        required: true
    },
    passwordEmail: {
        type: String,
        required: true
    },
    credentialsConfig: {
        type: CredentialsConfigSchema,
        required: false
    },
    plan: {
        type: String,
        required: true
    },
    isShowBookings: {
        type: Boolean,
        required: true
    },
    paymentAlert: {
        type: String,
        required: false
    },
    initialHomeCost: {
        type: Number,
        required: false
    },
    minimumAmount: {
        type: Number,
        required: true,
        default: 0
    },
    isStockActive: {
        type: Boolean,
        required: true,
        default: false
    },
    locationCompany: {
        type: Number,
        required: false
    }
}, { timestamps: false });

export const CompanyConfigModel = model<CompanyConfig>('CompanyConfig', CompanyConfigSchema);