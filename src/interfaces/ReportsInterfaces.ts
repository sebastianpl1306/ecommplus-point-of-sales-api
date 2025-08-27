import { Types } from "mongoose";
import { PaymentMethod } from "./PaymentMethodInterfaces";

// Enums para los estados del reporte
export enum ZReportStatus {
    GENERATED = 'GENERATED',
    CLOSED = 'CLOSED'
}

// Interface para resumen de productos
export interface ProductSummary {
    productId: Types.ObjectId;
    productName: string;
    category: string;
    quantitySold: number;
    totalRevenue: number;
    averagePrice: number;
}

// Interface para resumen de ventas por método de pago
export interface PaymentMethodSummary {
    methodId: string;
    methodName: string;
    transactionCount: number;
    totalAmount: number;
    percentage: number;
}

// Interface para transacciones anuladas
export interface VoidedTransaction {
    orderId: Types.ObjectId;
    originalAmount: number;
    voidedAt: Date;
    reason?: string;
    voidedBy: Types.ObjectId;
}

// Interface para el reporte Z
export interface IZReport {
    sessionId: Types.ObjectId;
    company: Types.ObjectId;
    pointOfSales: Types.ObjectId;
    reportNumber: string;
    reportDate: Date;
    
    // Información de la sesión
    sessionNumber: string;
    cashier: Types.ObjectId;
    sessionStartDate: Date;
    sessionEndDate: Date;
    
    // Resumen financiero
    totalTransactions: number;
    grossSales: number;
    netSales: number;
    totalTax: number;
    totalDiscounts: number;
    totalRefunds: number;
    
    // Por método de pago
    paymentMethodSummary: PaymentMethodSummary[];
    
    // Control de caja
    initialCash: number;
    expectedCash: number;
    actualCash: number;
    cashDifference: number;
    
    // Productos vendidos
    topProducts: ProductSummary[];
    totalItemsSold: number;
    
    // Transacciones especiales
    voidedTransactions: VoidedTransaction[];
    voidedAmount: number;
    
    // Estadísticas adicionales
    averageOrderValue: number;
    largestTransaction: number;
    smallestTransaction: number;
    
    // Control y auditoría
    status: ZReportStatus;
    generatedAt: Date;
    generatedBy: Types.ObjectId;
    closedAt?: Date;
    closedBy?: Types.ObjectId;
    notes?: string;
}

// Interface que extiende Document para Mongoose
export interface IZReportDocument extends IZReport, Document {
    _id: Types.ObjectId;
}