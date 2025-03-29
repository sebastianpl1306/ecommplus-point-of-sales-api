import { OrderPointStatus } from "../../interfaces";

export interface QueryFiltersOrderPoints {
    table?: string;
    status?: OrderPointStatus
    pointOfSales?: string;
    subtotal?: string;
    user?: string;
}

export const generateFiltersByOrderPoints = (filters?: QueryFiltersOrderPoints): QueryFiltersOrderPoints => {
    const query: QueryFiltersOrderPoints = {};

    if(!filters){
        return query;
    }

    if(filters.table){
        query.table = filters.table
    }

    if(filters.status){
        query.status = filters.status
    }

    if(filters.pointOfSales){
        query.pointOfSales = filters.pointOfSales
    }

    if(filters.subtotal){
        query.subtotal = filters.subtotal
    }

    if(filters.user){
        query.user = filters.user
    }

    return query;
}