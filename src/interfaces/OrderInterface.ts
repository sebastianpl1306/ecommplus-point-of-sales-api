import { Document } from 'mongoose';
import { User } from './UserInterface';
import { Products } from './ProductsInterface';
import { Company } from './CompanyInterfaces';

export enum OrderStatus {
    NEW = 'new',
    PENDING_PAYMENT = 'pending_payment',
    PAYMENT_PROCESSED = 'payment_processed',
    IN_PROGRESS = 'in_progress',
    CANCELED = 'canceled',
    DELIVERED = 'delivered'
}

export enum PaymentMethods {
    CASH = "cash",
    CARD = "card",
    PICK_UP_PRODUCT = "pick_up_product",
    OTHER = "other"
}

export interface Order extends Document{
    user: User;
    company: Company;
    comment?: string;
    status: OrderStatus;
    subtotal: number;
    homeCost: number;
    PaymentMethods: PaymentMethods;
    idPayment: number;
}

export interface OrderDetails extends Document{
    order: Order;
    products: ProductsOrder[];
}

export interface ProductsOrder{
    product: Products;
    optionsSelected?: OptionsSelected[];
    selectedColor?: string;
    discountRate?: number;
    amount: number;
    price: number;
}

export interface OptionsSelected{
    item: number;
    options: OptionItem[];
}

export interface OptionItem {
    name:   string;
    option: string;
}

export interface FiltersOrders {
    _id?: string,
    subTotal?: number,
    date?: string,
}