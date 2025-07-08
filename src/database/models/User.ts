import { Schema, Types, model } from 'mongoose';
import { AuthenticationRoles, User } from '../../interfaces';
import { DirectionSchema } from './complements/Direction';

const UserSchema: Schema = new Schema({
    name: {
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: false
    },
    photoURL: {
        type: String,
        required: false
    },
    role: {
        type: String,
        default: AuthenticationRoles.CUSTOMER
    },
    direction:{
        type: DirectionSchema,
        default:{
            description: '',
            neighborhood: '',
            isValid: false
        }
    },
    authorization: {
        type: Boolean,
        required: true,
        default: false
    },
    messageDisabled: {
        type: String,
        required: false
    },
    company : {
        type: Types.ObjectId,
        ref: 'Company',
        required: true
    },
    isOnline: {
        type: Boolean,
        required: true,
        default: false
    },
    pointOfSales: {
        type: Types.ObjectId,
        ref: 'PointOfSales',
        required: false
    }
}, { timestamps: true });

export const UserModel = model<User>('User', UserSchema );