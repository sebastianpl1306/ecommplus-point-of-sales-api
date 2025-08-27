import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ZReportFilters, ZReportService } from './ZReportService';
import { CashSessionService } from '../cashSession/CashSessionServices';

interface InfoTokenSave {
    companyId: string;
    uid: string;
}

export class ZReportController {
    private zReportService: ZReportService;
    private cashSessionService: CashSessionService;

    constructor() {
        this.zReportService = new ZReportService();
        this.cashSessionService = new CashSessionService();
    }

    /**
     * Generar un nuevo reporte Z
     */
    async generateZReport(request: Request, response: Response): Promise<void> {
        const { sessionId, notes } = request.body;
        const { companyId, uid }: InfoTokenSave = request.body.tokenInfo;

        try {
            // Validaciones básicas
            if (!sessionId) {
                response.status(400).json({
                    ok: false,
                    msg: 'Session ID is required to generate Z report.'
                });
                return;
            }

            // Verificar permisos de la sesión
            const hasPermission = await this.cashSessionService.hasPermission(
                new Types.ObjectId(sessionId),
                new Types.ObjectId(companyId)
            );

            if (!hasPermission) {
                response.status(401).json({
                    ok: false,
                    msg: 'Unauthorized: Session does not belong to your company.'
                });
                return;
            }

            // Generar el reporte Z
            const zReport = await this.zReportService.generateZReport({
                sessionId: new Types.ObjectId(sessionId),
                generatedBy: new Types.ObjectId(uid),
                notes
            });

            response.status(201).json({
                ok: true,
                msg: 'Z report generated successfully',
                zReport
            });

        } catch (error: any) {
            console.error('[ERROR][generateZReport]', error);

            // Manejar errores específicos
            if (error.message.includes('not found') || 
                error.message.includes('must be closed') || 
                error.message.includes('already exists')) {
                response.status(400).json({
                    ok: false,
                    msg: error.message
                });
                return;
            }

            response.status(500).json({
                ok: false,
                msg: 'Error generating Z report'
            });
        }
    }

    /**
     * Obtener lista de reportes Z con filtros
     */
    async getZReports(request: Request, response: Response): Promise<void> {
        const { companyId }: InfoTokenSave = request.body.tokenInfo;
        const {
            pointOfSalesId,
            startDate,
            endDate,
            status,
            page = 1,
            limit = 10
        } = request.query;

        try {
            const pageNum = parseInt(page as string);
            const limitNum = parseInt(limit as string);

            // Construir filtros
            const filters: ZReportFilters = {
                companyId: new Types.ObjectId(companyId)
            };

            if (pointOfSalesId) {
                filters.pointOfSalesId = new Types.ObjectId(pointOfSalesId as string);
            }

            if (status) {
                filters.status = status as any;
            }

            if (startDate && endDate) {
                filters.startDate = new Date(startDate as string);
                filters.endDate = new Date(endDate as string);
            }

            const result = await this.zReportService.findZReportsWithPagination(
                filters,
                pageNum,
                limitNum
            );

            const summary = await this.zReportService.getZReportsSummary(result.reports);

            response.status(200).json({
                ok: true,
                reports: result.reports,
                pagination: {
                    page: result.currentPage,
                    limit: limitNum,
                    total: result.total,
                    pages: result.totalPages
                },
                summary
            });

        } catch (error) {
            console.error('[ERROR][getZReports]', error);
            response.status(500).json({
                ok: false,
                msg: 'Error getting Z reports'
            });
        }
    }

    /**
     * Obtener detalles de un reporte Z específico
     */
    async getZReportDetails(request: Request, response: Response): Promise<void> {
        const { reportId } = request.params;
        const { companyId }: InfoTokenSave = request.body.tokenInfo;

        try {
            if (!reportId) {
                response.status(400).json({
                    ok: false,
                    msg: 'Report ID is required.'
                });
                return;
            }

            // Verificar permisos
            const hasPermission = await this.zReportService.hasPermission(
                new Types.ObjectId(reportId),
                new Types.ObjectId(companyId)
            );

            if (!hasPermission) {
                response.status(401).json({
                    ok: false,
                    msg: 'Unauthorized: Report does not belong to your company.'
                });
                return;
            }

            const zReport = await this.zReportService.getZReportById(new Types.ObjectId(reportId));

            if (!zReport) {
                response.status(404).json({
                    ok: false,
                    msg: 'Z report not found.'
                });
                return;
            }

            response.status(200).json({
                ok: true,
                zReport
            });

        } catch (error) {
            console.error('[ERROR][getZReportDetails]', error);
            response.status(500).json({
                ok: false,
                msg: 'Error getting Z report details'
            });
        }
    }

    /**
     * Cerrar un reporte Z
     */
    async closeZReport(request: Request, response: Response): Promise<void> {
        const { reportId } = request.params;
        const { notes } = request.body;
        const { companyId, uid }: InfoTokenSave = request.body.tokenInfo;

        try {
            if (!reportId) {
                response.status(400).json({
                    ok: false,
                    msg: 'Report ID is required.'
                });
                return;
            }

            // Verificar permisos
            const hasPermission = await this.zReportService.hasPermission(
                new Types.ObjectId(reportId),
                new Types.ObjectId(companyId)
            );

            if (!hasPermission) {
                response.status(401).json({
                    ok: false,
                    msg: 'Unauthorized: Report does not belong to your company.'
                });
                return;
            }

            const closedReport = await this.zReportService.closeZReport(
                new Types.ObjectId(reportId),
                new Types.ObjectId(uid),
                notes
            );

            response.status(200).json({
                ok: true,
                msg: 'Z report closed successfully',
                zReport: closedReport
            });

        } catch (error: any) {
            console.error('[ERROR][closeZReport]', error);

            if (error.message.includes('not found') || error.message.includes('already closed')) {
                response.status(400).json({
                    ok: false,
                    msg: error.message
                });
                return;
            }

            response.status(500).json({
                ok: false,
                msg: 'Error closing Z report'
            });
        }
    }

    /**
     * Obtener análisis de rendimiento por período
     */
    // async getPerformanceAnalytics(request: Request, response: Response): Promise<void> {
    //     const { companyId }: InfoTokenSave = request.body.tokenInfo;
    //     const { startDate, endDate, pointOfSalesId } = request.query;

    //     try {
    //         if (!startDate || !endDate) {
    //             response.status(400).json({
    //                 ok: false,
    //                 msg: 'Start date and end date are required for analytics.'
    //             });
    //             return;
    //         }

    //         const analytics = await this.zReportService.getPerformanceAnalytics(
    //             new Types.ObjectId(companyId),
    //             new Date(startDate as string),
    //             new Date(endDate as string),
    //             pointOfSalesId ? new Types.ObjectId(pointOfSalesId as string) : undefined
    //         );

    //         response.status(200).json({
    //             ok: true,
    //             analytics,
    //             period: {
    //                 startDate: startDate,
    //                 endDate: endDate
    //             }
    //         });

    //     } catch (error) {
    //         console.error('[ERROR][getPerformanceAnalytics]', error);
    //         response.status(500).json({
    //             ok: false,
    //             msg: 'Error getting performance analytics'
    //         });
    //     }
    // }

    /**
     * Exportar reporte Z para impresión
     */
    async exportZReportForPrint(request: Request, response: Response): Promise<void> {
        const { reportId } = request.params;
        const { companyId }: InfoTokenSave = request.body.tokenInfo;

        try {
            if (!reportId) {
                response.status(400).json({
                    ok: false,
                    msg: 'Report ID is required.'
                });
                return;
            }

            // Verificar permisos
            const hasPermission = await this.zReportService.hasPermission(
                new Types.ObjectId(reportId),
                new Types.ObjectId(companyId)
            );

            if (!hasPermission) {
                response.status(401).json({
                    ok: false,
                    msg: 'Unauthorized: Report does not belong to your company.'
                });
                return;
            }

            const exportData = await this.zReportService.exportZReportForPrint(
                new Types.ObjectId(reportId)
            );

            response.status(200).json({
                ok: true,
                exportData
            });

        } catch (error: any) {
            console.error('[ERROR][exportZReportForPrint]', error);

            if (error.message.includes('not found')) {
                response.status(404).json({
                    ok: false,
                    msg: error.message
                });
                return;
            }

            response.status(500).json({
                ok: false,
                msg: 'Error exporting Z report for print'
            });
        }
    }

    /**
     * Obtener resumen de reportes por período
     */
    async getZReportsSummaryByPeriod(request: Request, response: Response): Promise<void> {
        const { companyId }: InfoTokenSave = request.body.tokenInfo;
        const { startDate, endDate, pointOfSalesId } = request.query;

        try {
            if (!startDate || !endDate) {
                response.status(400).json({
                    ok: false,
                    msg: 'Start date and end date are required.'
                });
                return;
            }

            const filters: ZReportFilters = {
                companyId: new Types.ObjectId(companyId),
                startDate: new Date(startDate as string),
                endDate: new Date(endDate as string)
            };

            if (pointOfSalesId) {
                filters.pointOfSalesId = new Types.ObjectId(pointOfSalesId as string);
            }

            const reports = await this.zReportService.findZReports(filters);
            const summary = await this.zReportService.getZReportsSummary(reports);

            response.status(200).json({
                ok: true,
                summary,
                period: {
                    startDate: startDate,
                    endDate: endDate,
                    totalReports: reports.length
                },
                reports: reports.map(report => ({
                    id: report._id,
                    reportNumber: report.reportNumber,
                    reportDate: report.reportDate,
                    grossSales: report.grossSales,
                    netSales: report.netSales,
                    totalTransactions: report.totalTransactions,
                    cashDifference: report.cashDifference,
                    status: report.status
                }))
            });

        } catch (error) {
            console.error('[ERROR][getZReportsSummaryByPeriod]', error);
            response.status(500).json({
                ok: false,
                msg: 'Error getting Z reports summary by period'
            });
        }
    }

    /**
     * Obtener dashboard de reportes Z
     */
    // async getZReportsDashboard(request: Request, response: Response): Promise<void> {
    //     const { companyId }: InfoTokenSave = request.body.tokenInfo;
    //     const { pointOfSalesId } = request.query;

    //     try {
    //         const today = new Date();
    //         const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    //         const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    //         const filters: ZReportFilters = {
    //             companyId: new Types.ObjectId(companyId),
    //             startDate: startOfMonth,
    //             endDate: endOfMonth
    //         };

    //         if (pointOfSalesId) {
    //             filters.pointOfSalesId = new Types.ObjectId(pointOfSalesId as string);
    //         }

    //         const [monthlyReports, analytics] = await Promise.all([
    //             this.zReportService.findZReports(filters),
    //             this.zReportService.getPerformanceAnalytics(
    //                 new Types.ObjectId(companyId),
    //                 startOfMonth,
    //                 endOfMonth,
    //                 pointOfSalesId ? new Types.ObjectId(pointOfSalesId as string) : undefined
    //             )
    //         ]);

    //         const summary = await this.zReportService.getZReportsSummary(monthlyReports);

    //         // Obtener reportes recientes (últimos 5)
    //         const recentReports = monthlyReports
    //             .sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime())
    //             .slice(0, 5)
    //             .map(report => ({
    //                 id: report._id,
    //                 reportNumber: report.reportNumber,
    //                 reportDate: report.reportDate,
    //                 grossSales: report.grossSales,
    //                 totalTransactions: report.totalTransactions,
    //                 cashDifference: report.cashDifference,
    //                 status: report.status,
    //                 cashier: (report.cashier as any).name
    //             }));

    //         response.status(200).json({
    //             ok: true,
    //             dashboard: {
    //                 monthlySummary: summary,
    //                 analytics,
    //                 recentReports,
    //                 period: {
    //                     startDate: startOfMonth,
    //                     endDate: endOfMonth,
    //                     currentMonth: today.toISOString().slice(0, 7)
    //                 }
    //             }
    //         });

    //     } catch (error) {
    //         console.error('[ERROR][getZReportsDashboard]', error);
    //         response.status(500).json({
    //             ok: false,
    //             msg: 'Error getting Z reports dashboard'
    //         });
    //     }
    // }
}