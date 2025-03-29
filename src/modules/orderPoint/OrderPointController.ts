import { Request, Response } from 'express';
import { OrderPointService } from './OrderPointServices';
import { CompanyModel, OrderPointModel, PointOfSalesModel, ProductModel, TableModel } from '../../database/models';
import { InfoTokenSave, OrderPointStatus, ProductOrderPointStatus, ProductsOrderPoint, TableStatus } from '../../interfaces';
import { QueryFiltersOrderPoints } from '../../helpers';

export class OrderPointController {
    private orderPointService;

    constructor(){
        this.orderPointService = new OrderPointService();
    }

    async updateOrderPoint (request: Request, response: Response) {
        const { products, pointOfSalesId } = request.body;
        const { companyId, uid }: InfoTokenSave = request.body.tokenInfo;
        try {
            if (!products || !pointOfSalesId) {
                response.status(401).json({
                    ok:false,
                    msg: 'Info missing'
                })
                return;
            }

            const orderPoint = await OrderPointModel.findById(pointOfSalesId);

            //Validar que la orden exista
            if(!orderPoint){
                response.status(404).json({
                    ok: false,
                    msg: 'Order not found'
                })
                return;
            }

            const productsOrderPoint: ProductsOrderPoint[] = [...orderPoint.products];
            for (const product of products) {

                //necesitamos verificar que el producto si existe actualizar su cantidad y si no existe agregarlo
                if(productsOrderPoint.some((productOrder: ProductsOrderPoint) => productOrder.product.toString() === product.product)){
                    console.log({ product });
                }
            }

            response.status(200).json({
                ok: true
            })
            return;
            // const orderPoint = await this.orderPointService.updateOrderPoint(request.params.id, {});
        } catch (error) {
            console.error('[ERROR][addNewProductToOrderPoint]', error)
            response.status(500).json({
                ok: false,
                msg: "Ups! Error invoke"
            })
        }
    }

    async createOrderPoint (request: Request, response: Response) {
        const { tableId, products, pointOfSalesId } = request.body;
        const { companyId, uid }: InfoTokenSave = request.body.tokenInfo;

        try {
            if (!tableId || !products || !pointOfSalesId) {
                response.status(401).json({
                    ok:false,
                    msg: 'Info missing'
                })
                return;
            }

            if (products.length <= 0) {
                response.status(400).json({
                    ok: false,
                    msg: 'Debe tener mínimo un producto'
                })
                return;
            }

            let subtotal = 0;
            let isProductsWithStock = true;
            const productsPoint: ProductsOrderPoint[] = [];
            for (const product of products) {
                //Buscar el producto en la base de datos
                let productSearch = await ProductModel.findById(product.product);
                if(productSearch){
                    //Validar que se tenga stock del producto y le resta el stock al producto
                    if(product.amount > productSearch.stock){
                        isProductsWithStock = false;
                    }else{
                        //Resta el stock y guarda el stock nuevo del producto
                        productSearch.stock = productSearch.stock - product.amount;
                        productSearch.save();
                    }

                    //validar si el producto tiene descuento
                    if(productSearch.discountRate && productSearch.discountRate > 0){
                        //Realizar descuento y calcular el total
                        subtotal += (productSearch.pointPrice - ((productSearch.discountRate * productSearch.pointPrice) / 100)) * product.amount;
                        product.pointPrice = productSearch.pointPrice;
                    }else{
                        //calcular el total
                        subtotal += (productSearch.pointPrice * product.amount);
                        product.pointPrice = productSearch.pointPrice;
                    }
                    productsPoint.push({
                        product: productSearch._id as string,
                        amount: product.amount,
                        price: productSearch.pointPrice,
                        status: ProductOrderPointStatus.PENDING,
                        note: product.note,
                        optionsSelected: product.optionsSelected
                    })
                }
            }

            const company = await CompanyModel.findById(companyId).populate('config');

            if(!company || !company.config){
                console.error(`[ERROR][createOrderPoint] La compañía ${companyId} no se encontró`);
                response.status(400).json({
                    ok: 'false',
                    msg: 'Unauthorized'
                })
                return;
            }

            const pointOfSales = await PointOfSalesModel.findById(pointOfSalesId);

            //Verifica que el punto de venta pertenezca a la compañía
            if(!pointOfSales || pointOfSales.company.toString() !== companyId){
                console.log({ pointCompany: pointOfSales!.company._id, companyId });
                console.error(`[ERROR][createOrderPoint] El punto de venta ${pointOfSalesId} no pertenece a la compañía ${companyId}`);
                response.status(400).json({
                    ok: 'false',
                    msg: 'Unauthorized'
                })
                return;
            }

            const table = await TableModel.findById(tableId);

            if(!table){
                throw new Error(`Error al buscar la mesa con el id ${tableId}`);
            }

            //Valida si la empresa maneja stock y valida el stock
            if(company.config.isStockActive && !isProductsWithStock){
                response.status(403).json({
                    ok: 'false',
                    msg: 'No hay suficiente stock disponible para estos productos'
                })
                return;
            }

            const newOrderPoint = await this.orderPointService.createOrderPoint({
                status: OrderPointStatus.PENDING,
                tableId,
                products: productsPoint,
                subtotal,
                pointOfSalesId,
                userId: uid
            });

            //Guardar la orden que se creó en la mesa
            table.status = TableStatus.IN_USE;
            table.activeOrderPoint = newOrderPoint._id as string;
            table.save();

            response.status(200).json({
                ok: true,
                newOrderPoint
            })
        } catch (error) {
            console.error('[ERROR][createOrderPoint]', error)
            response.status(500).json({
                ok: false,
                msg: "Ups! Error invoke"
            })
        }
    }

    /**
     * Permite obtener las ordenes de punto de venta
     */
    async getOrderPoints (request: Request, response: Response) {
        const { table, status, pointOfSalesId, subtotal, user } = request.body;
        const { companyId }: InfoTokenSave = request.body.tokenInfo;

        const page = request.query.page ? Number(request.query.page) : 1;
        const limit = request.query.limit ? Number(request.query.limit) : 10;

        try {
            if(!pointOfSalesId || !companyId){
                response.status(401).json({ ok: false, msg: 'Unauthorized' });
                return;
            }

            const company = await CompanyModel.findById(companyId);
            const pointOfSales = await PointOfSalesModel.findById(pointOfSalesId);

            if(!company || !pointOfSales || company._id !== pointOfSales.company){
                response.status(401).json({ ok: false, msg: 'Unauthorized' });
                return;
            }
        
            const filters: QueryFiltersOrderPoints = {
                table,
                status,
                pointOfSales: pointOfSalesId,
                subtotal,
                user
            }

            const ordersPoint = await this.orderPointService.getOrderPoints(filters, page, limit);

            return response.status(200).json({
                ok: true,
                ordersPoint: ordersPoint.ordersPoint,
                page: ordersPoint?.page,
                totalPages: ordersPoint?.totalPages
            });
        } catch (error) {
            console.error('[ERROR][getOrderPoints]', error)
            response.status(500).json({
                ok: false,
                msg: "Ups! Error invoke"
            })
        }
    }
}