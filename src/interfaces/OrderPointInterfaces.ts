import { Document } from "mongoose";
import { Table } from "./TableInterfaces";
import { Products } from "./ProductsInterface";
import { OptionsSelected } from "./OrderInterface";
import { PointOfSales } from "./PointOfSalesInterfaces";
import { User } from "./UserInterface";

export interface OrderPoint extends Document {
    table: Table;
    products: ProductsOrderPoint[];
    status: OrderPointStatus;
    subtotal: number;
    pointOfSales: PointOfSales;
    user: User;
}

export interface ProductsOrderPoint{
    product: Products | string;
    amount: number;
    discountRate?: number;
    price: number;
    status: ProductOrderPointStatus;
    note?: string;
    optionsSelected?: OptionsSelected[];
}

export enum OrderPointStatus {
    PENDING = "pending",
    PREPARING = "preparing",
    READY = "ready",
    SERVED = "served",
    PAID = "paid"
}

export enum ProductOrderPointStatus {
    PENDING = "pending",
    READY = "ready"
}