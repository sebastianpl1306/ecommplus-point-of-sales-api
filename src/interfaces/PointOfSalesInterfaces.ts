import { Document } from 'mongoose';
import { Company } from './CompanyInterfaces';
import { PaymentMethod } from './PaymentMethodInterfaces';

export interface PointOfSales extends Document{
    name: string;
    description?: string;
    company: Company;
    paymentMethods: PaymentMethod[];
}