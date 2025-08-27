import { model, Schema, Types } from "mongoose";
import { CashSessionStatus, ICashSession } from "../../interfaces";

export const CashSessionSchema: Schema = new Schema({
    pointOfSales: {
        type: Schema.Types.ObjectId,
        ref: 'PointOfSales',
        required: [true, 'Point of sales is required'],
        index: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User (cashier) is required'],
        index: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, 'Company is required'],
        index: true
    },
    sessionNumber: {
        type: String,
        required: [true, 'Session number is required'],
        unique: true,
        index: true
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required'],
        default: Date.now,
        index: true
    },
    endDate: {
        type: Date,
        index: true
    },
    initialCash: {
        type: Number,
        required: [true, 'Initial cash amount is required'],
        min: [0, 'Initial cash cannot be negative'],
        default: 0
    },
    finalCash: {
        type: Number,
        min: [0, 'Final cash cannot be negative']
    },
    expectedCash: {
        type: Number,
        min: [0, 'Expected cash cannot be negative']
    },
    cashDifference: {
        type: Number
    },
    status: {
        type: String,
        enum: Object.values(CashSessionStatus),
        required: [true, 'Session status is required'],
        default: CashSessionStatus.OPEN,
        index: true
    },
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    closedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: false });

// Índices compuestos para optimizar consultas
CashSessionSchema.index({ company: 1, pointOfSales: 1, startDate: -1 });
CashSessionSchema.index({ company: 1, status: 1, startDate: -1 });
CashSessionSchema.index({ user: 1, status: 1, startDate: -1 });

export const CashSessionModel = model<ICashSession>('CashSession', CashSessionSchema);