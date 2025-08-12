import { Document } from "mongoose";
import { Table } from "./TableInterfaces";
import { Products } from "./ProductsInterface";
import { OptionsSelected } from "./OrderInterface";
import { PointOfSales } from "./PointOfSalesInterfaces";
import { User } from "./UserInterface";
import { PaymentMethod } from "./PaymentMethodInterfaces";

export interface OrderPoint extends Document {
    table: Table;
    products: ProductsOrderPoint[];
    status: OrderPointStatus;
    subtotal: number;
    pointOfSales: PointOfSales;
    user?: User | null;
    paymentMethod: PaymentMethod;
    notes?: string;
    discount?: number;
    total: number;
    processedAt?: Date;
    processedBy?: User | null;
}

export interface ProductsOrderPoint{
    product: Products | string;
    amount: number;
    discountRate?: number;
    price: number;
    status: ProductOrderPointStatus;
    note?: string;
    optionsSelected?: OptionsSelected[];
    sentToKitchenAt?: Date;
}

export enum OrderPointStatus {
    PENDING = "pending",
    PREPARING = "preparing",
    READY = "ready",
    SERVED = "served",
    PAID = "paid",
    CANCELED = "canceled"
}

export enum ProductOrderPointStatus {
    PENDING = "pending",
    IN_KITCHEN = "in_kitchen",
    READY = "ready",
    CANCELED = "canceled"
}