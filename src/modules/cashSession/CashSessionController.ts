import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { PointOfSalesModel } from '../../database/models';
import { CashSessionService } from './CashSessionServices';

interface InfoTokenSave {
    companyId: string;
    uid: string;
}

export class CashSessionController {
    private cashSessionService: CashSessionService;

    constructor() {
        this.cashSessionService = new CashSessionService();
    }

    /**
     * Abrir una nueva sesión de caja
     */
    async openCashSession(request: Request, response: Response): Promise<void> {
        const { pointOfSalesId, initialCash, notes } = request.body;
        const { companyId, uid }: InfoTokenSave = request.body.tokenInfo;

        try {
            // Validaciones básicas
            if (!pointOfSalesId || initialCash === undefined) {
                response.status(400).json({
                    ok: false,
                    msg: 'Missing required information: pointOfSalesId and initialCash are required.'
                });
                return;
            }

            if (initialCash < 0) {
                response.status(400).json({
                    ok: false,
                    msg: 'Initial cash amount cannot be negative.'
                });
                return;
            }

            // Verificar que el punto de venta existe y pertenece a la empresa
            const pointOfSales = await PointOfSalesModel.findById(pointOfSalesId);
            if (!pointOfSales || pointOfSales.company.toString() !== companyId) {
                response.status(404).json({
                    ok: false,
                    msg: 'Point of sales not found or unauthorized.'
                });
                return;
            }

            // Crear nueva sesión usando el servicio
            const newSession = await this.cashSessionService.createSession({
                pointOfSalesId: new Types.ObjectId(pointOfSalesId),
                userId: new Types.ObjectId(uid),
                companyId: new Types.ObjectId(companyId),
                initialCash,
                notes
            });

            if (!newSession) {
                response.status(500).json({
                    ok: false,
                    msg: 'Error creating cash session'
                });
                return;
            }

            pointOfSales.activeSession = newSession;

            await pointOfSales.save();

            response.status(201).json({
                ok: true,
                msg: 'Cash session opened successfully',
                session: newSession
            });

        } catch (error: any) {
            console.error('[ERROR][openCashSession]', error);
            
            if (error.message.includes('Active session already exists')) {
                response.status(400).json({
                    ok: false,
                    msg: error.message
                });
                return;
            }

            response.status(500).json({
                ok: false,
                msg: 'Error opening cash session'
            });
        }
    }

    /**
     * Cerrar sesión de caja
     */
    async closeCashSession(request: Request, response: Response): Promise<void> {
        const { sessionId } = request.params;
        const { finalCash, notes } = request.body;
        const { companyId, uid }: InfoTokenSave = request.body.tokenInfo;

        try {
            if (!sessionId || finalCash === undefined) {
                response.status(400).json({
                    ok: false,
                    msg: 'Missing required information: sessionId and finalCash are required.'
                });
                return;
            }

            if (finalCash < 0) {
                response.status(400).json({
                    ok: false,
                    msg: 'Final cash amount cannot be negative.'
                });
                return;
            }

            // Verificar permisos
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

            // Cerrar sesión usando el servicio
            const closedSession = await this.cashSessionService.closeSession({
                sessionId: new Types.ObjectId(sessionId),
                finalCash,
                closedBy: new Types.ObjectId(uid),
                notes
            });

            response.status(200).json({
                ok: true,
                msg: 'Cash session closed successfully',
                session: closedSession,
                summary: {
                    initialCash: closedSession.initialCash,
                    finalCash: closedSession.finalCash,
                    expectedCash: closedSession.expectedCash,
                    cashDifference: closedSession.cashDifference,
                    sessionDuration: this.cashSessionService.getDurationInHours(closedSession)
                }
            });

        } catch (error: any) {
            console.error('[ERROR][closeCashSession]', error);
            
            if (error.message.includes('Session not found') || error.message.includes('already closed')) {
                response.status(400).json({
                    ok: false,
                    msg: error.message
                });
                return;
            }

            response.status(500).json({
                ok: false,
                msg: 'Error closing cash session'
            });
        }
    }

    /**
     * Obtener sesión activa
     */
    async getActiveSession(request: Request, response: Response): Promise<void> {
        const { pointOfSalesId } = request.params;
        const { companyId }: InfoTokenSave = request.body.tokenInfo;

        try {
            if (!pointOfSalesId) {
                response.status(400).json({
                    ok: false,
                    msg: 'Point of sales ID is required.'
                });
                return;
            }

            // Verificar que el punto de venta pertenece a la empresa
            const pointOfSales = await PointOfSalesModel.findById(pointOfSalesId);
            if (!pointOfSales || pointOfSales.company.toString() !== companyId) {
                response.status(404).json({
                    ok: false,
                    msg: 'Point of sales not found or unauthorized.'
                });
                return;
            }

            const activeSession = await this.cashSessionService.findActiveSession(new Types.ObjectId(pointOfSalesId));

            if (!activeSession) {
                response.status(404).json({
                    ok: false,
                    msg: 'No active session found for this point of sales.'
                });
                return;
            }

            response.status(200).json({
                ok: true,
                session: activeSession,
                sessionDuration: this.cashSessionService.getDurationInHours(activeSession)
            });

        } catch (error) {
            console.error('[ERROR][getActiveSession]', error);
            response.status(500).json({
                ok: false,
                msg: 'Error getting active session'
            });
        }
    }

    /**
     * Obtener historial de sesiones
     */
    async getSessionHistory(request: Request, response: Response): Promise<void> {
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
            const filters: any = { 
                companyId: new Types.ObjectId(companyId) 
            };
            
            if (pointOfSalesId) {
                filters.pointOfSalesId = new Types.ObjectId(pointOfSalesId as string);
            }
            
            if (status) {
                filters.status = status;
            }
            
            if (startDate && endDate) {
                filters.dateRange = {
                    start: new Date(startDate as string),
                    end: new Date(endDate as string)
                };
            }

            const result = await this.cashSessionService.findSessionsWithPagination(
                filters,
                pageNum,
                limitNum
            );

            const summary = await this.cashSessionService.getSessionsSummary(result.sessions);

            response.status(200).json({
                ok: true,
                sessions: result.sessions,
                pagination: {
                    page: result.currentPage,
                    limit: limitNum,
                    total: result.total,
                    pages: result.totalPages
                },
                summary
            });

        } catch (error) {
            console.error('[ERROR][getSessionHistory]', error);
            response.status(500).json({
                ok: false,
                msg: 'Error getting session history'
            });
        }
    }

    /**
     * Obtener detalles de una sesión específica
     */
    async getSessionDetails(request: Request, response: Response): Promise<void> {
        const { sessionId } = request.params;
        const { companyId }: InfoTokenSave = request.body.tokenInfo;

        try {
            // Verificar permisos
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

            const session = await this.cashSessionService.findActiveSession(new Types.ObjectId(sessionId));
            
            if (!session) {
                response.status(404).json({
                    ok: false,
                    msg: 'Session not found.'
                });
                return;
            }

            // Obtener estadísticas de la sesión
            const sessionStats = await this.cashSessionService.getSessionStatistics(session._id as Types.ObjectId);

            response.status(200).json({
                ok: true,
                session,
                statistics: sessionStats,
                sessionDuration: this.cashSessionService.getDurationInHours(session)
            });

        } catch (error) {
            console.error('[ERROR][getSessionDetails]', error);
            response.status(500).json({
                ok: false,
                msg: 'Error getting session details'
            });
        }
    }

    /**
     * Obtener resumen de sesiones por período
     */
    async getSessionsSummaryByPeriod(request: Request, response: Response): Promise<void> {
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

            const filters: any = {
                companyId: new Types.ObjectId(companyId),
                dateRange: {
                    start: new Date(startDate as string),
                    end: new Date(endDate as string)
                }
            };

            if (pointOfSalesId) {
                filters.pointOfSalesId = new Types.ObjectId(pointOfSalesId as string);
            }

            const sessions = await this.cashSessionService.findSessionsByDateRange(filters);
            const summary = await this.cashSessionService.getSessionsSummary(sessions);

            response.status(200).json({
                ok: true,
                summary,
                period: {
                    startDate: startDate,
                    endDate: endDate,
                    totalSessions: sessions.length
                }
            });

        } catch (error) {
            console.error('[ERROR][getSessionsSummaryByPeriod]', error);
            response.status(500).json({
                ok: false,
                msg: 'Error getting sessions summary by period'
            });
        }
    }
}