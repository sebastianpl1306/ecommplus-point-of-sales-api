import { Schema, model } from 'mongoose';
import { DesignCompany } from '../../interfaces';

export const DesignCompanySchema: Schema = new Schema({
    logoUrl: {
        type: String,
        required: true
    },
    primaryColor: {
        type: String,
        required: true
    },
    carouselImages: {
        type: [String],
        required: false
    },
    secondaryColor: {
        type: String,
        required: true
    }
}, { timestamps: false });

export const DesignCompanyModel = model<DesignCompany>('DesignCompany', DesignCompanySchema);