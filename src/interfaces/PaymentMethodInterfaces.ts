import { Document } from "mongoose";

export interface PaymentMethod extends Document {
    name: string;
    description?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}