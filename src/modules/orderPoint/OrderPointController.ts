import { Request, Response } from 'express';
import { OrderPointService } from './OrderPointServices';
import { CompanyModel, OrderPointModel, PointOfSalesModel, ProductModel, TableModel } from '../../database/models';
import { InfoTokenSave, OrderPointStatus, ProductOrderPointStatus, Products, ProductsOrderPoint, TableStatus } from '../../interfaces';
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

    /**
     * @description Sends selected products from an order to the kitchen by updating their status
     * This creates a "comanda" (kitchen order) with the selected products
     */
    async sendProductsToKitchen(request: Request, response: Response) {
        const { productsToSend } = request.body; // Array of product IDs to send to kitchen
        const orderPointId = request.params.orderPointId;
        const { companyId, uid }: InfoTokenSave = request.body.tokenInfo;

        try {
            if (!productsToSend || !Array.isArray(productsToSend) || productsToSend.length === 0 || !orderPointId) {
                response.status(400).json({
                    ok: false,
                    msg: 'Missing information: productsToSend (array of product IDs) and orderPointId are required.'
                });
                return;
            }

            const orderPoint = await OrderPointModel.findById(orderPointId).populate('products.product');

            if (!orderPoint) {
                response.status(404).json({
                    ok: false,
                    msg: 'Order not found.'
                });
                return;
            }

            // Security check: Ensure the order belongs to the correct company
            const pointOfSales = await PointOfSalesModel.findById(orderPoint.pointOfSales);
            if (!pointOfSales || pointOfSales.company.toString() !== companyId) {
                response.status(401).json({
                    ok: false,
                    msg: 'Unauthorized: Order does not belong to your company.'
                });
                return;
            }

            // Validate that the order is in a valid state to send products to kitchen
            if (orderPoint.status !== OrderPointStatus.PENDING && orderPoint.status !== OrderPointStatus.PREPARING && orderPoint.status !== OrderPointStatus.READY && orderPoint.status !== OrderPointStatus.SERVED) {
                response.status(400).json({
                    ok: false,
                    msg: 'Order must be in PENDING, PREPARING, READY, or SERVED status to send products to kitchen.'
                });
                return;
            }

            let updatedProducts = [...orderPoint.products];
            const productsForKitchen: ProductsOrderPoint[] = [];
            let hasValidProducts = false;

            // Process each product to be sent to kitchen
            for (const productIdToSend of productsToSend) {
                const productIndex = updatedProducts.findIndex((productFind: ProductsOrderPoint) => {
                    const product = productFind.product as any;
                    return product._id && product._id.toString() === productIdToSend
                });

                if (productIndex !== -1) {
                    const product = updatedProducts[productIndex];
                    
                    // Only send products that are currently PENDING
                    if (product.status === ProductOrderPointStatus.PENDING) {
                        // Keep product status as PENDING (they are sent to kitchen but status doesn't change yet)
                        // The kitchen will update them to READY when they finish cooking
                        
                        // Add to kitchen order list
                        productsForKitchen.push({
                            ...product,
                            status: ProductOrderPointStatus.IN_KITCHEN,
                            sentToKitchenAt: new Date() // Add timestamp when sent to kitchen
                        });

                        updatedProducts[productIndex] = {
                            ...product,
                            status: ProductOrderPointStatus.IN_KITCHEN,
                            sentToKitchenAt: new Date() // Add timestamp when sent to kitchen
                        };
                        hasValidProducts = true;
                    } else {
                        console.warn(`[WARNING][sendProductsToKitchen] Product ${productIdToSend} is not in PENDING status. Current status: ${product.status}`);
                    }
                } else {
                    console.warn(`[WARNING][sendProductsToKitchen] Product with ID ${productIdToSend} not found in order.`);
                }
            }

            // Update order status to PREPARING when products are sent to kitchen
            if (hasValidProducts && (orderPoint.status === OrderPointStatus.PENDING || orderPoint.status === OrderPointStatus.READY || orderPoint.status === OrderPointStatus.SERVED || orderPoint.status === OrderPointStatus.PREPARING)) {
                orderPoint.products = updatedProducts;
                orderPoint.status = OrderPointStatus.PREPARING;
            }

            if (!hasValidProducts) {
                response.status(400).json({
                    ok: false,
                    msg: 'No valid products found to send to kitchen. Products must be in PENDING status.'
                });
                return;
            }

            // Update the order with the new status
            await orderPoint.save();

            response.status(200).json({
                ok: true,
                msg: `${productsForKitchen.length} products sent to kitchen successfully`,
                updatedOrderPoint: await OrderPointModel.findById(orderPointId).populate('products.product')
            });
            return;

        } catch (error) {
            console.error('[ERROR][sendProductsToKitchen]', error);
            response.status(500).json({
                ok: false,
                msg: 'Oops! An error occurred while sending products to kitchen.'
            });
            return;
        }
    }

    /**
     * @description Processes a complete order point - handles payment, finalizes order, and frees up the table
     * This endpoint is typically used when the customer is ready to pay and complete their order
     */
    async processOrderPoint(request: Request, response: Response) {
        const { paymentMethod, discount, notes } = request.body;
        const orderPointId = request.params.orderPointId;
        const { companyId, uid }: InfoTokenSave = request.body.tokenInfo;

        try {
            if (!orderPointId) {
                response.status(400).json({
                    ok: false,
                    msg: 'OrderPoint ID is required.'
                });
                return;
            }

            const orderPoint = await OrderPointModel.findById(orderPointId)
                .populate('products.product')
                .populate('table')
                .populate('pointOfSales');

            if (!orderPoint) {
                response.status(404).json({
                    ok: false,
                    msg: 'Order not found.'
                });
                return;
            }

            // Security check: Ensure the order belongs to the correct company
            const pointOfSales = await PointOfSalesModel.findById(orderPoint.pointOfSales);
            if (!pointOfSales || pointOfSales.company.toString() !== companyId) {
                response.status(401).json({
                    ok: false,
                    msg: 'Unauthorized: Order does not belong to your company.'
                });
                return;
            }

            // Validate that the order can be processed
            if (orderPoint.status === OrderPointStatus.PAID) {
                response.status(400).json({
                    ok: false,
                    msg: 'Order has already been paid and processed.'
                });
                return;
            }

            if (orderPoint.status === OrderPointStatus.CANCELED) {
                response.status(400).json({
                    ok: false,
                    msg: 'Cannot process a cancelled order.'
                });
                return;
            }

            // Calculate final totals
            let finalSubtotal = orderPoint.subtotal;
            let discountAmount = 0;
            let finalTotal = finalSubtotal;

            // Apply discount if provided
            if (discount && discount > 0) {
                if (discount <= 100) { // Percentage discount
                    discountAmount = (finalSubtotal * discount) / 100;
                } else { // Fixed amount discount
                    discountAmount = Math.min(discount, finalSubtotal);
                }
                finalTotal -= discountAmount;
            }

            // Ensure all products are marked as delivered
            const updatedProducts = orderPoint.products.map(product => ({
                ...product,
                status: ProductOrderPointStatus.READY,
            }));

            // Update order status and totals
            orderPoint.products = updatedProducts;
            orderPoint.status = OrderPointStatus.PAID;
            orderPoint.paymentMethod = paymentMethod || 'cash';
            orderPoint.discount = discountAmount;
            orderPoint.total = finalTotal;
            orderPoint.processedAt = new Date();
            orderPoint.processedBy = uid as any;
            orderPoint.notes = notes;

            await orderPoint.save();

            // Free up the table if it exists
            if (orderPoint.table) {
                const table = await TableModel.findById(orderPoint.table);
                if (table) {
                    table.status = TableStatus.FREE;
                    table.activeOrderPoint = null;
                    await table.save();
                }
            }

            // Prepare response with order summary
            const orderSummary = {
                orderPointId: orderPoint._id,
                tableNumber: orderPoint.table?.number || null,
                subtotal: finalSubtotal,
                discount: discountAmount,
                finalTotal: finalTotal,
                paymentMethod: orderPoint.paymentMethod,
                processedAt: orderPoint.processedAt,
                processedBy: uid,
                products: orderPoint.products.length,
                notes: notes
            };

            response.status(200).json({
                ok: true,
                msg: 'Order processed successfully',
                orderSummary,
                processedOrder: orderPoint
            });
            return;

        } catch (error) {
            console.error('[ERROR][processOrderPoint]', error);
            response.status(500).json({
                ok: false,
                msg: 'Oops! An error occurred while processing the order.'
            });
            return;
        }
    }
}