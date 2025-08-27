import { Types } from 'mongoose';
import { CashSessionStatus, IZReportDocument, OrderPointStatus, PaymentMethod, PaymentMethodSummary, ProductSummary, VoidedTransaction, ZReportStatus } from '../../interfaces';
import { CashSessionModel, OrderPointModel, PaymentMethodModel, ZReportModel } from '../../database/models';

export interface GenerateZReportData {
    sessionId: Types.ObjectId;
    generatedBy: Types.ObjectId;
    notes?: string;
}

export interface ZReportFilters {
    companyId: Types.ObjectId;
    pointOfSalesId?: Types.ObjectId;
    startDate?: Date;
    endDate?: Date;
    status?: ZReportStatus;
}

export interface ZReportSummary {
    totalReports: number;
    totalGrossSales: number;
    totalNetSales: number;
    totalCashDifference: number;
    averageOrderValue: number;
    totalTransactions: number;
}

export class ZReportService {

    /**
     * Genera un número de reporte único
     */
    async generateReportNumber(companyId: Types.ObjectId): Promise<string> {
        try {
            const today = new Date();
            const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
            
            // Buscar el último número de reporte del día para esta empresa
            const lastReport = await ZReportModel.findOne({
                company: companyId,
                reportNumber: { $regex: `^Z${dateString}-` }
            }).sort({ reportNumber: -1 });

            let reportCount = 1;
            if (lastReport && lastReport.reportNumber) {
                const lastNumber = parseInt(lastReport.reportNumber.split('-')[1]) || 0;
                reportCount = lastNumber + 1;
            }

            return `Z${dateString}-${reportCount.toString().padStart(4, '0')}`;
        } catch (error) {
            console.error('[ERROR][generateReportNumber]', error);
            throw new Error('Error generating report number');
        }
    }

    /**
     * Genera un reporte Z para una sesión específica
     */
    async generateZReport(data: GenerateZReportData): Promise<IZReportDocument> {
        try {
            // Obtener la sesión de caja
            const session = await CashSessionModel.findById(data.sessionId)
                .populate('pointOfSales')
                .populate({ 
                    path: 'user', 
                    select: '-password'
                });
            if (!session) {
                throw new Error('Cash session not found');
            }

            if (session.status !== CashSessionStatus.CLOSED) {
                throw new Error('Cash session must be closed before generating Z report');
            }

            // Verificar si ya existe un reporte para esta sesión
            const existingReport = await ZReportModel.findOne({ sessionId: data.sessionId });
            if (existingReport) {
                throw new Error('Z report already exists for this session');
            }

            const pointOfSales = session.pointOfSales as any;
            
            // Generar número de reporte
            const reportNumber = await this.generateReportNumber(pointOfSales.company);

            // Obtener todas las órdenes de la sesión
            const orders = await OrderPointModel.find({
                session: data.sessionId,
                status: OrderPointStatus.PAID
            }).populate('products.product');

            // Calcular métricas del reporte
            const reportMetrics = await this.calculateReportMetrics(orders);
            const paymentSummary = await this.calculatePaymentMethodSummary(orders);
            const topProducts = await this.calculateTopProducts(orders);
            const voidedTransactions = await this.getVoidedTransactions(data.sessionId);

            // Crear el reporte Z
            const zReport = new ZReportModel({
                sessionId: data.sessionId,
                company: pointOfSales.company,
                pointOfSales: session.pointOfSales,
                reportNumber,
                reportDate: new Date(),
                
                // Información de la sesión
                sessionNumber: session.sessionNumber,
                cashier: session.user,
                sessionStartDate: session.startDate,
                sessionEndDate: session.endDate,
                
                // Resumen financiero
                totalTransactions: reportMetrics.totalTransactions,
                grossSales: reportMetrics.grossSales,
                netSales: reportMetrics.netSales,
                totalTax: reportMetrics.totalTax,
                totalDiscounts: reportMetrics.totalDiscounts,
                totalRefunds: reportMetrics.totalRefunds,
                
                // Por método de pago
                paymentMethodSummary: paymentSummary,
                
                // Control de caja
                initialCash: session.initialCash,
                expectedCash: session.expectedCash || 0,
                actualCash: session.finalCash || 0,
                cashDifference: session.cashDifference || 0,
                
                // Productos vendidos
                topProducts: topProducts,
                totalItemsSold: reportMetrics.totalItemsSold,
                
                // Transacciones especiales
                voidedTransactions: voidedTransactions,
                voidedAmount: reportMetrics.voidedAmount,
                
                // Estadísticas adicionales
                averageOrderValue: reportMetrics.averageOrderValue,
                largestTransaction: reportMetrics.largestTransaction,
                smallestTransaction: reportMetrics.smallestTransaction,
                
                // Control y auditoría
                status: ZReportStatus.GENERATED,
                generatedBy: data.generatedBy,
                notes: data.notes
            });

            await zReport.save();
            return await zReport.populate('cashier pointOfSales') as IZReportDocument;

        } catch (error) {
            console.error('[ERROR][generateZReport]', error);
            throw error;
        }
    }

    /**
     * Calcula las métricas principales del reporte
     */
    private async calculateReportMetrics(orders: any[]): Promise<{
        totalTransactions: number;
        grossSales: number;
        netSales: number;
        totalTax: number;
        totalDiscounts: number;
        totalRefunds: number;
        totalItemsSold: number;
        voidedAmount: number;
        averageOrderValue: number;
        largestTransaction: number;
        smallestTransaction: number;
    }> {
        try {
            const totalTransactions = orders.length;
            
            if (totalTransactions === 0) {
                return {
                    totalTransactions: 0,
                    grossSales: 0,
                    netSales: 0,
                    totalTax: 0,
                    totalDiscounts: 0,
                    totalRefunds: 0,
                    totalItemsSold: 0,
                    voidedAmount: 0,
                    averageOrderValue: 0,
                    largestTransaction: 0,
                    smallestTransaction: 0
                };
            }

            let grossSales = 0;
            let totalTax = 0;
            let totalDiscounts = 0;
            let totalRefunds = 0;
            let totalItemsSold = 0;
            let largestTransaction = 0;
            let smallestTransaction = Number.MAX_VALUE;

            for (const order of orders) {
                const orderTotal = order.subtotal || 0;
                grossSales += orderTotal;
                
                //TODO: Implementar los impuestos en las ordenes
                // Calcular impuestos (si tienes un campo tax en tu modelo)
                totalTax += order.tax || 0;
                
                // Calcular descuentos (si tienes un campo discount en tu modelo)
                totalDiscounts += order.discount || 0;
                
                //TODO: Agregar reembolsos
                // Calcular reembolsos (si es una orden de reembolso)
                // if (order.type === 'REFUND') {
                //     totalRefunds += orderTotal;
                // }
                
                // Contar items vendidos
                if (order.products && Array.isArray(order.products)) {
                    totalItemsSold += order.products.reduce((sum: number, product: any) => sum + (product.amount || 0), 0);
                }
                
                // Transacción más grande y más pequeña
                if (orderTotal > largestTransaction) {
                    largestTransaction = orderTotal;
                }
                if (orderTotal < smallestTransaction && orderTotal > 0) {
                    smallestTransaction = orderTotal;
                }
            }

            const netSales = grossSales - totalDiscounts - totalRefunds;
            const averageOrderValue = totalTransactions > 0 ? grossSales / totalTransactions : 0;
            
            if (smallestTransaction === Number.MAX_VALUE) {
                smallestTransaction = 0;
            }

            return {
                totalTransactions,
                grossSales,
                netSales,
                totalTax,
                totalDiscounts,
                totalRefunds,
                totalItemsSold,
                voidedAmount: 0, // Calcular según tu lógica de anulaciones
                averageOrderValue: Math.round(averageOrderValue * 100) / 100,
                largestTransaction,
                smallestTransaction
            };

        } catch (error) {
            console.error('[ERROR][calculateReportMetrics]', error);
            throw new Error('Error calculating report metrics');
        }
    }

    /**
     * Calcula el resumen por métodos de pago
     */
    private async calculatePaymentMethodSummary(orders: any[]): Promise<PaymentMethodSummary[]> {
        try {
            // Obtener los métodos de pago activos desde la BD
            const paymentMethods = await PaymentMethodModel.find({ isActive: true }).lean();

            // Inicializar contadores con los métodos de pago
            const paymentSummary: { [key: string]: { count: number; total: number; name: string } } = {};
            for (const method of paymentMethods) {
                paymentSummary[method._id.toString()] = { count: 0, total: 0, name: method.name };
            }

            let totalAmount = 0;

            // Recorrer las órdenes y acumular por método de pago
            for (const order of orders) {
                const paymentMethodId = order.paymentMethod?._id?.toString() || null;
                const amount = order.subtotal || 0;

                if (paymentMethodId && paymentSummary[paymentMethodId]) {
                    paymentSummary[paymentMethodId].count += 1;
                    paymentSummary[paymentMethodId].total += amount;
                }

                totalAmount += amount;
            }

            // Convertir al formato final con porcentajes
            const result: PaymentMethodSummary[] = [];
            for (const [methodId, data] of Object.entries(paymentSummary)) {
                const percentage = totalAmount > 0 ? (data.total / totalAmount) * 100 : 0;
                result.push({
                    methodId, // referenciamos el _id
                    methodName: data.name, // nombre legible
                    transactionCount: data.count,
                    totalAmount: data.total,
                    percentage: Math.round(percentage * 100) / 100
                });
            }

            // Solo retornar métodos con al menos una transacción
            return result.filter(item => item.transactionCount > 0);

        } catch (error) {
            console.error('[ERROR][calculatePaymentMethodSummary]', error);
            throw new Error('Error calculating payment method summary');
        }
    }

    /**
     * Calcula los productos más vendidos
     */
    private async calculateTopProducts(orders: any[], limit: number = 10): Promise<ProductSummary[]> {
        try {
            const productStats: { [key: string]: {
                productId: Types.ObjectId;
                name: string;
                category: string;
                quantity: number;
                revenue: number;
                totalPrice: number;
                count: number;
            } } = {};

            for (const order of orders) {
                if (order.products && Array.isArray(order.products)) {
                    for (const orderProduct of order.products) {
                        const product = orderProduct.product;
                        if (!product) continue;

                        const productId = product._id.toString();
                        const quantity = orderProduct.amount || 0;
                        const price = orderProduct.price || 0;
                        const revenue = quantity * price;

                        if (!productStats[productId]) {
                            productStats[productId] = {
                                productId: product._id,
                                name: product.name || 'Unknown Product',
                                category: product.category || 'Uncategorized',
                                quantity: 0,
                                revenue: 0,
                                totalPrice: 0,
                                count: 0
                            };
                        }

                        productStats[productId].quantity += quantity;
                        productStats[productId].revenue += revenue;
                        productStats[productId].totalPrice += price;
                        productStats[productId].count += 1;
                    }
                }
            }

            // Convertir a array y ordenar por cantidad vendida
            const topProducts: ProductSummary[] = Object.values(productStats)
                .map(stat => ({
                    productId: stat.productId,
                    productName: stat.name,
                    category: stat.category,
                    quantitySold: stat.quantity,
                    totalRevenue: Math.round(stat.revenue * 100) / 100,
                    averagePrice: stat.count > 0 ? Math.round((stat.totalPrice / stat.count) * 100) / 100 : 0
                }))
                .sort((a, b) => b.quantitySold - a.quantitySold)
                .slice(0, limit);

            return topProducts;

        } catch (error) {
            console.error('[ERROR][calculateTopProducts]', error);
            throw new Error('Error calculating top products');
        }
    }

    /**
     * Obtiene las transacciones anuladas de la sesión
     */
    private async getVoidedTransactions(sessionId: Types.ObjectId): Promise<VoidedTransaction[]> {
        try {
            // Implementar según tu lógica de anulaciones
            // Por ahora retorno array vacío como placeholder
            
            /*
            Ejemplo de implementación:
            
            const voidedOrders = await OrderPointModel.find({
                session: sessionId,
                status: 'VOIDED'
            }).populate('voidedBy');
            
            return voidedOrders.map(order => ({
                orderId: order._id,
                originalAmount: order.originalAmount,
                voidedAt: order.voidedAt,
                reason: order.voidReason,
                voidedBy: order.voidedBy
            }));
            */
            
            return [];

        } catch (error) {
            console.error('[ERROR][getVoidedTransactions]', error);
            return [];
        }
    }

    /**
     * Busca reportes Z con filtros
     */
    async findZReports(filters: ZReportFilters): Promise<IZReportDocument[]> {
        try {
            const query: any = {
                company: filters.companyId
            };

            if (filters.pointOfSalesId) {
                query.pointOfSales = filters.pointOfSalesId;
            }

            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.startDate && filters.endDate) {
                query.reportDate = {
                    $gte: filters.startDate,
                    $lte: filters.endDate
                };
            }

            return await ZReportModel.find(query)
                .populate('cashier pointOfSales generatedBy closedBy')
                .sort({ reportDate: -1 });

        } catch (error) {
            console.error('[ERROR][findZReports]', error);
            throw new Error('Error finding Z reports');
        }
    }

    /**
     * Busca reportes Z con paginación
     */
    async findZReportsWithPagination(
        filters: ZReportFilters,
        page: number = 1,
        limit: number = 10
    ): Promise<{
        reports: IZReportDocument[];
        total: number;
        totalPages: number;
        currentPage: number;
    }> {
        try {
            const skip = (page - 1) * limit;
            
            const query: any = {
                company: filters.companyId
            };

            if (filters.pointOfSalesId) {
                query.pointOfSales = filters.pointOfSalesId;
            }

            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.startDate && filters.endDate) {
                query.reportDate = {
                    $gte: filters.startDate,
                    $lte: filters.endDate
                };
            }

            const [reports, total] = await Promise.all([
                ZReportModel.find(query)
                    .populate('cashier pointOfSales generatedBy closedBy')
                    .sort({ reportDate: -1 })
                    .skip(skip)
                    .limit(limit),
                ZReportModel.countDocuments(query)
            ]);

            return {
                reports,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };

        } catch (error) {
            console.error('[ERROR][findZReportsWithPagination]', error);
            throw new Error('Error finding Z reports with pagination');
        }
    }

    /**
     * Obtiene un reporte Z por ID
     */
    async getZReportById(reportId: Types.ObjectId): Promise<IZReportDocument | null> {
        try {
            return await ZReportModel.findById(reportId)
                .populate('cashier pointOfSales generatedBy closedBy');

        } catch (error) {
            console.error('[ERROR][getZReportById]', error);
            throw new Error('Error getting Z report by ID');
        }
    }

    /**
     * Cierra un reporte Z
     */
    async closeZReport(reportId: Types.ObjectId, closedBy: Types.ObjectId, notes?: string): Promise<IZReportDocument> {
        try {
            const report = await ZReportModel.findById(reportId);
            if (!report) {
                throw new Error('Z report not found');
            }

            if (report.status === ZReportStatus.CLOSED) {
                throw new Error('Z report is already closed');
            }

            report.status = ZReportStatus.CLOSED;
            report.closedAt = new Date();
            report.closedBy = closedBy;
            
            if (notes) {
                report.notes = report.notes ? `${report.notes}\nClosure notes: ${notes}` : `Closure notes: ${notes}`;
            }

            await report.save();
            return await report.populate('cashier pointOfSales generatedBy closedBy') as IZReportDocument;

        } catch (error) {
            console.error('[ERROR][closeZReport]', error);
            throw error;
        }
    }

    /**
     * Obtiene resumen de múltiples reportes Z
     */
    async getZReportsSummary(reports: IZReportDocument[]): Promise<ZReportSummary> {
        try {
            const totalReports = reports.length;
            
            if (totalReports === 0) {
                return {
                    totalReports: 0,
                    totalGrossSales: 0,
                    totalNetSales: 0,
                    totalCashDifference: 0,
                    averageOrderValue: 0,
                    totalTransactions: 0
                };
            }

            const totalGrossSales = reports.reduce((sum, report) => sum + report.grossSales, 0);
            const totalNetSales = reports.reduce((sum, report) => sum + report.netSales, 0);
            const totalCashDifference = reports.reduce((sum, report) => sum + report.cashDifference, 0);
            const totalTransactions = reports.reduce((sum, report) => sum + report.totalTransactions, 0);
            const averageOrderValue = totalTransactions > 0 ? totalGrossSales / totalTransactions : 0;

            return {
                totalReports,
                totalGrossSales: Math.round(totalGrossSales * 100) / 100,
                totalNetSales: Math.round(totalNetSales * 100) / 100,
                totalCashDifference: Math.round(totalCashDifference * 100) / 100,
                averageOrderValue: Math.round(averageOrderValue * 100) / 100,
                totalTransactions
            };

        } catch (error) {
            console.error('[ERROR][getZReportsSummary]', error);
            throw new Error('Error getting Z reports summary');
        }
    }

    /**
     * Verifica si el usuario tiene permisos sobre el reporte
     */
    async hasPermission(reportId: Types.ObjectId, companyId: Types.ObjectId): Promise<boolean> {
        try {
            const report = await ZReportModel.findById(reportId);
            if (!report) return false;
            
            return report.company.toString() === companyId.toString();

        } catch (error) {
            console.error('[ERROR][hasPermission]', error);
            return false;
        }
    }

    /**
     * Obtiene estadísticas por período
     */
    // async getPerformanceAnalytics(
    //     companyId: Types.ObjectId,
    //     startDate: Date,
    //     endDate: Date,
    //     pointOfSalesId?: Types.ObjectId
    // ): Promise<{
    //     dailyTrends: Array<{
    //         date: string;
    //         totalSales: number;
    //         totalTransactions: number;
    //         averageOrderValue: number;
    //         cashDifference: number;
    //     }>;
    //     paymentMethodTrends: Array<{
    //         method: PaymentMethod;
    //         totalAmount: number;
    //         percentage: number;
    //         transactionCount: number;
    //     }>;
    //     topPerformingProducts: ProductSummary[];
    //     performanceMetrics: {
    //         bestDay: { date: string; sales: number };
    //         worstDay: { date: string; sales: number };
    //         totalCashVariance: number;
    //         averageDailySales: number;
    //     };
    // }> {
    //     try {
    //         const filters: ZReportFilters = {
    //             companyId,
    //             startDate,
    //             endDate
    //         };

    //         if (pointOfSalesId) {
    //             filters.pointOfSalesId = pointOfSalesId;
    //         }

    //         const reports = await this.findZReports(filters);

    //         // Análisis diario
    //         const dailyData: { [key: string]: {
    //             sales: number;
    //             transactions: number;
    //             cashDifference: number;
    //         } } = {};

    //         // Análisis de métodos de pago
    //         const paymentMethodData: { [key: string]: {
    //             amount: number;
    //             count: number;
    //         } } = {};

    //         // Productos más vendidos globalmente
    //         const allProducts: { [key: string]: ProductSummary } = {};

    //         let totalSales = 0;
    //         let bestDay = { date: '', sales: 0 };
    //         let worstDay = { date: '', sales: Number.MAX_VALUE };

    //         for (const report of reports) {
    //             const dateKey = report.reportDate.toISOString().split('T')[0];
                
    //             // Datos diarios
    //             if (!dailyData[dateKey]) {
    //                 dailyData[dateKey] = { sales: 0, transactions: 0, cashDifference: 0 };
    //             }
    //             dailyData[dateKey].sales += report.grossSales;
    //             dailyData[dateKey].transactions += report.totalTransactions;
    //             dailyData[dateKey].cashDifference += report.cashDifference;

    //             // Encontrar mejor y peor día
    //             if (report.grossSales > bestDay.sales) {
    //                 bestDay = { date: dateKey, sales: report.grossSales };
    //             }
    //             if (report.grossSales < worstDay.sales) {
    //                 worstDay = { date: dateKey, sales: report.grossSales };
    //             }

    //             totalSales += report.grossSales;

    //             // Análisis de métodos de pago
    //             for (const payment of report.paymentMethodSummary) {
    //                 if (!paymentMethodData[payment.method]) {
    //                     paymentMethodData[payment.method] = { amount: 0, count: 0 };
    //                 }
    //                 paymentMethodData[payment.method].amount += payment.totalAmount;
    //                 paymentMethodData[payment.method].count += payment.transactionCount;
    //             }

    //             // Productos más vendidos
    //             for (const product of report.topProducts) {
    //                 const productKey = product.productId.toString();
    //                 if (!allProducts[productKey]) {
    //                     allProducts[productKey] = {
    //                         productId: product.productId,
    //                         productName: product.productName,
    //                         category: product.category,
    //                         quantitySold: 0,
    //                         totalRevenue: 0,
    //                         averagePrice: 0
    //                     };
    //                 }
    //                 allProducts[productKey].quantitySold += product.quantitySold;
    //                 allProducts[productKey].totalRevenue += product.totalRevenue;
    //             }
    //         }

    //         // Calcular promedios para productos
    //         Object.values(allProducts).forEach(product => {
    //             product.averagePrice = product.quantitySold > 0 
    //                 ? Math.round((product.totalRevenue / product.quantitySold) * 100) / 100 
    //                 : 0;
    //         });

    //         // Formatear resultados
    //         const dailyTrends = Object.entries(dailyData).map(([date, data]) => ({
    //             date,
    //             totalSales: Math.round(data.sales * 100) / 100,
    //             totalTransactions: data.transactions,
    //             averageOrderValue: data.transactions > 0 
    //                 ? Math.round((data.sales / data.transactions) * 100) / 100 
    //                 : 0,
    //             cashDifference: Math.round(data.cashDifference * 100) / 100
    //         })).sort((a, b) => a.date.localeCompare(b.date));

    //         const totalPaymentAmount = Object.values(paymentMethodData)
    //             .reduce((sum, data) => sum + data.amount, 0);

    //         const paymentMethodTrends = Object.entries(paymentMethodData).map(([method, data]) => ({
    //             method: method as PaymentMethod,
    //             totalAmount: Math.round(data.amount * 100) / 100,
    //             percentage: totalPaymentAmount > 0 
    //                 ? Math.round((data.amount / totalPaymentAmount) * 100 * 100) / 100 
    //                 : 0,
    //             transactionCount: data.count
    //         }));

    //         const topPerformingProducts = Object.values(allProducts)
    //             .sort((a, b) => b.quantitySold - a.quantitySold)
    //             .slice(0, 10);

    //         const totalCashVariance = reports.reduce((sum, report) => sum + Math.abs(report.cashDifference), 0);
    //         const averageDailySales = dailyTrends.length > 0 
    //             ? totalSales / dailyTrends.length 
    //             : 0;

    //         if (worstDay.sales === Number.MAX_VALUE) {
    //             worstDay.sales = 0;
    //         }

    //         return {
    //             dailyTrends,
    //             paymentMethodTrends,
    //             topPerformingProducts,
    //             performanceMetrics: {
    //                 bestDay,
    //                 worstDay,
    //                 totalCashVariance: Math.round(totalCashVariance * 100) / 100,
    //                 averageDailySales: Math.round(averageDailySales * 100) / 100
    //             }
    //         };

    //     } catch (error) {
    //         console.error('[ERROR][getPerformanceAnalytics]', error);
    //         throw new Error('Error getting performance analytics');
    //     }
    // }

    /**
     * Exporta un reporte Z a formato JSON para impresión
     */
    async exportZReportForPrint(reportId: Types.ObjectId): Promise<{
        report: IZReportDocument;
        printData: any;
    }> {
        try {
            const report = await this.getZReportById(reportId);
            if (!report) {
                throw new Error('Z report not found');
            }

            const printData = {
                header: {
                    reportNumber: report.reportNumber,
                    reportDate: report.reportDate,
                    pointOfSales: (report.pointOfSales as any).name,
                    cashier: (report.cashier as any).name,
                    sessionNumber: report.sessionNumber,
                    sessionPeriod: {
                        start: report.sessionStartDate,
                        end: report.sessionEndDate
                    }
                },
                financialSummary: {
                    totalTransactions: report.totalTransactions,
                    grossSales: report.grossSales,
                    netSales: report.netSales,
                    totalTax: report.totalTax,
                    totalDiscounts: report.totalDiscounts,
                    totalRefunds: report.totalRefunds
                },
                paymentMethods: report.paymentMethodSummary,
                cashControl: {
                    initialCash: report.initialCash,
                    expectedCash: report.expectedCash,
                    actualCash: report.actualCash,
                    difference: report.cashDifference
                },
                productsSummary: {
                    totalItemsSold: report.totalItemsSold,
                    topProducts: report.topProducts
                },
                statistics: {
                    averageOrderValue: report.averageOrderValue,
                    largestTransaction: report.largestTransaction,
                    smallestTransaction: report.smallestTransaction
                },
                voidedTransactions: {
                    count: report.voidedTransactions.length,
                    totalAmount: report.voidedAmount,
                    transactions: report.voidedTransactions
                },
                footer: {
                    generatedAt: report.generatedAt,
                    generatedBy: (report.generatedBy as any).name,
                    status: report.status,
                    notes: report.notes
                }
            };

            return {
                report,
                printData
            };

        } catch (error) {
            console.error('[ERROR][exportZReportForPrint]', error);
            throw new Error('Error exporting Z report for print');
        }
    }
}