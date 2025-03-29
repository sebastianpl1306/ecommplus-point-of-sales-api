import { Document } from 'mongoose';

export enum AuthenticationRoles {
    CUSTOMER = 'customer',
    ADMIN = 'admin'
}

export interface Direction{
    description: string;
    neighborhood: string;
    isValid: boolean;
}

export interface User extends Document {
    name: string;
    email: string;
    password: string;
    phone?: number;
    photoURL?: string;
    role: AuthenticationRoles;
    direction: Direction;
    authorization: boolean;
    messageDisabled?: string;
    company: string;
    isOnline: boolean;
}

export interface FiltersUsers {
    name?: string,
    email?: string,
    phone?: number,
}