import { Schema } from 'mongoose';

export const CredentialsConfigSchema = new Schema({
    publicKey: {
        type: String,
        required: true
    },
    accessToken: {
        type: String,
        required: true
    }
}, { _id: false });