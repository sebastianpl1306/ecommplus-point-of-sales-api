import { Document } from 'mongoose';
import { PointOfSales } from './PointOfSalesInterfaces';
import { OrderPoint } from './OrderPointInterfaces';

export interface TablesGroup extends Document{
    name: string;
    pointOfSales: PointOfSales;
}

export interface Table extends Document{
    number: number;
    capacity: number;
    status: TableStatus;
    tablesGroup: TablesGroup | string;
    pointOfSales: PointOfSales;
    activeOrderPoint: OrderPoint | string | null;
}

export enum TableStatus {
    FREE = 'free',
    IN_USE = 'in_use',
    RESERVED = 'reserved',
}