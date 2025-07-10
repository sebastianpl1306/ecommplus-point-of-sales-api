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

    /**
     * @description Updates an existing order by adding new products or updating quantities of existing ones.
     */
    async updateOrderPoint (request: Request, response: Response) {
        const { products } = request.body;
        const orderPointId = request.params.orderPointId;
        const { companyId, uid }: InfoTokenSave = request.body.tokenInfo;

        try {
            if (!products || !orderPointId) {
                response.status(400).json({
                    ok: false,
                    msg: 'Missing information: products or orderPointId are required.'
                });
                return;
            }

            const orderPoint = await OrderPointModel.findById(orderPointId)

            if (!orderPoint) {
                response.status(404).json({
                    ok: false,
                    msg: 'Order not found.'
                });
                return;
            }

            // Ensure the order belongs to the correct company (security check)
            const pointOfSales = await PointOfSalesModel.findById(orderPoint.pointOfSales);
            if (!pointOfSales || pointOfSales.company.toString() !== companyId) {
                response.status(401).json({
                    ok: false,
                    msg: 'Unauthorized: Order does not belong to your company.'
                });
                return;
            }

            const currentProductsInOrder: ProductsOrderPoint[] = [...orderPoint.products];
            let subtotal = orderPoint.subtotal || 0;

            const company = await CompanyModel.findById(companyId).populate('config');
            const isStockActive = company?.config?.isStockActive || false;

            for (const productToAdd of products) {
                const productDb = await ProductModel.findById(productToAdd.product);

                if (!productDb) {
                    // Log an error but continue processing other products
                    console.warn(`[WARNING][updateOrderPoint] Product with ID ${productToAdd.product} not found. Skipping.`);
                    continue;
                }

                if (isStockActive && productToAdd.amount > productDb.stock) {
                    response.status(403).json({
                        ok: false,
                        msg: `Not enough stock available for product: ${productDb.name}. Available: ${productDb.stock}, Requested: ${productToAdd.amount}`
                    });
                    return;
                }

                const existingProductIndex = currentProductsInOrder.findIndex(
                    (p) => p.product.toString() === productToAdd.product
                );

                const productPrice = productDb.pointPrice;
                const discountRate = productDb.discountRate || 0;
                const finalProductPrice = discountRate > 0
                    ? productPrice - (productPrice * discountRate / 100)
                    : productPrice;

                if (existingProductIndex !== -1) {
                    // Product already exists in the order, update its quantity and price
                    const existingProduct = currentProductsInOrder[existingProductIndex];
                    
                    // Adjust subtotal by removing old product total and adding new product total
                    subtotal -= existingProduct.amount * existingProduct.price;
                    existingProduct.amount += productToAdd.amount;
                    existingProduct.price = finalProductPrice; // Ensure updated price is used
                    existingProduct.note = productToAdd.note || existingProduct.note;
                    existingProduct.optionsSelected = productToAdd.optionsSelected || existingProduct.optionsSelected;
                    subtotal += existingProduct.amount * finalProductPrice;

                    if (isStockActive) {
                        productDb.stock -= productToAdd.amount;
                        await productDb.save();
                    }
                } else {
                    // Product is new to this order, add it
                    if (isStockActive) {
                        productDb.stock -= productToAdd.amount;
                        await productDb.save();
                    }
                    subtotal += productToAdd.amount * finalProductPrice;
                    currentProductsInOrder.push({
                        product: productDb._id as string,
                        amount: productToAdd.amount,
                        price: finalProductPrice,
                        status: ProductOrderPointStatus.PENDING, // New products are pending by default
                        note: productToAdd.note,
                        optionsSelected: productToAdd.optionsSelected
                    });
                }
            }

            orderPoint.products = currentProductsInOrder;
            orderPoint.subtotal = subtotal;

            await orderPoint.save();

            response.status(200).json({
                ok: true,
                msg: 'Order updated successfully',
                orderPoint: await orderPoint.populate('products.product')
            });
            return;

        } catch (error) {
            console.error('[ERROR][updateOrderPoint]', error);
            response.status(500).json({
                ok: false,
                msg: 'Oops! An error occurred while updating the order.'
            });
            return;
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
                pointOfSalesId
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

    async removeProductFromOrderPoint(request: Request, response: Response) {
        const { productsToRemove } = request.body;
        const orderPointId = request.params.orderPointId;
        const { companyId, uid }: InfoTokenSave = request.body.tokenInfo;

        try {
            if (!productsToRemove || !Array.isArray(productsToRemove) || productsToRemove.length === 0 || !orderPointId) {
                response.status(400).json({
                    ok: false,
                    msg: 'Missing information: productsToRemove (array of product IDs) or orderPointId are required.'
                });
                return;
            }

            const orderPoint = await OrderPointModel.findById(orderPointId);

            if (!orderPoint) {
                response.status(404).json({
                    ok: false,
                    msg: 'Order not found.'
                });
                return;
            }

            // Ensure the order belongs to the correct company (security check)
            const pointOfSales = await PointOfSalesModel.findById(orderPoint.pointOfSales);
            if (!pointOfSales || pointOfSales.company.toString() !== companyId) {
                response.status(401).json({
                    ok: false,
                    msg: 'Unauthorized: Order does not belong to your company.'
                });
                return;
            }

            let currentProductsInOrder: ProductsOrderPoint[] = [...orderPoint.products];
            let subtotal = orderPoint.subtotal || 0;

            const company = await CompanyModel.findById(companyId).populate('config');
            const isStockActive = company?.config?.isStockActive || false;

            for (const productIdToRemove of productsToRemove) {
                const existingProductIndex = currentProductsInOrder.findIndex(
                    (p) => p.product.toString() === productIdToRemove
                );

                if (existingProductIndex !== -1) {
                    const productToRemove = currentProductsInOrder[existingProductIndex];
                    const productDb = await ProductModel.findById(productToRemove.product);

                    // Adjust subtotal by removing the product's total
                    subtotal -= productToRemove.amount * productToRemove.price;

                    // Remove the product from the array
                    currentProductsInOrder.splice(existingProductIndex, 1);

                    if (isStockActive && productDb) {
                        productDb.stock += productToRemove.amount; // Return stock
                        await productDb.save();
                    }
                } else {
                    console.warn(`[WARNING][removeProductFromOrderPoint] Product with ID ${productIdToRemove} not found in order. Skipping.`);
                }
            }

            orderPoint.products = currentProductsInOrder;
            orderPoint.subtotal = subtotal;

            await orderPoint.save();

            response.status(200).json({
                ok: true,
                msg: 'Products removed from order successfully',
                orderPoint: await orderPoint.populate('products.product')
            });
            return;

        } catch (error) {
            console.error('[ERROR][removeProductFromOrderPoint]', error);
            response.status(500).json({
                ok: false,
                msg: 'Oops! An error occurred while removing products from the order.'
            });
            return;
        }
    }
}