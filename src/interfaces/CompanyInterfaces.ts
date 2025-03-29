import { Document } from "mongoose";

export interface Company extends Document{
    identifier: number;
    name: string;
    openingTime: string;
    closeTime: string;
    isClose: boolean;
    config: CompanyConfig;
    design: DesignCompany;
}

export interface CompanyConfig extends Document{
    email: string;
    passwordEmail?: string;
    credentialsConfig?: CredentialsConfig;
    isStockActive: boolean;
    plan: PlanI;
    minimumAmount?: number;
    isShowBookings: boolean;
    paymentAlert?: PaymentAlerts;
    initialHomeCost?: number;
    locationCompany?: number;
}

export interface CredentialsConfig{
    publicKey: string,
    accessToken: string,
}

export interface DesignCompany extends Document{
    name: string;
    logoUrl: string;
    carouselImages?: string[];
    primaryColor: string;
    secondaryColor: string;
}

export enum PlanI {
    BASIC = 'basic',
    BUSINESS = 'business'
}

export enum PaymentAlerts {
    PENDING = 'filled',
    AUTHORIZED = 'authorized',
    COMPLETED = 'completed',
    FAILED = 'failed',
    ON_HOLD = 'on_hold',
    EXPIRED = 'expired'
}