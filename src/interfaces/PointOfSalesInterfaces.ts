import { Document } from 'mongoose';
import { Company } from './CompanyInterfaces';
import { PaymentMethod } from './PaymentMethodInterfaces';
import { ICashSession } from './CashSessionInterfaces';

export interface PointOfSales extends Document{
    name: string;
    description?: string;
    company: Company;
    paymentMethods: PaymentMethod[];
    activeSession?: ICashSession | null;
}