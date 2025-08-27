import { Document, Types } from "mongoose";

// Interface para TypeScript
export interface ICashSession extends Document {
    pointOfSales: Types.ObjectId;
    user: Types.ObjectId;
    company: Types.ObjectId;
    sessionNumber: string;
    startDate: Date;
    endDate?: Date;
    initialCash: number;
    finalCash?: number;
    expectedCash?: number;
    cashDifference?: number;
    status: CashSessionStatus;
    notes?: string;
    closedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// Enums para los estados de la sesión
export enum CashSessionStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED'
}