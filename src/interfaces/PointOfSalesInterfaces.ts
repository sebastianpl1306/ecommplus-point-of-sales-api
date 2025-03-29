import { Document } from 'mongoose';
import { Company } from './CompanyInterfaces';

export interface PointOfSales extends Document{
    name: string;
    description?: string;
    company: Company;
}