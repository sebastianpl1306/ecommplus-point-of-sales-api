import { Document } from 'mongoose';
import { OptionsSelected } from './OrderInterface';
import { Company } from './CompanyInterfaces';

export interface Category extends Document{
    name: string;
    img?: string;
    company: Company;
    isDelete: boolean;
}

export interface Products extends Document{
    name: string;
    description: string;
    price: number;
    pointPrice: number;
    photoURL: string[];
    company: Company;
    colors: string[];
    discountRate: number;
    category: Category;
    productOptions?: ProductOptions[];
    stock: number;
    isSoldOut: boolean;
    isDelete: boolean;
}

export interface FiltersProducts {
    textSearch?: string,
    price?: number,
    category?: string,
    isSoldOut?: boolean,
    isStock?: boolean,
    onDiscount?: boolean,
    isFeatured?: boolean
}

export interface ProductsShopping extends Document{
    name: string;
    description: string;
    price: number;
    photoURL: string;
    amount: number;
    discountRate?: number;
    category: Category;
    productOptions?: ProductOptions[];
    optionsSelected?: OptionsSelected[];
    isSoldOut: boolean;
    isDelete: boolean;
}

export interface ProductOptions{
    name: string,
    options: string[]
}