import { Router } from 'express';
import { CashSessionController } from './CashSessionController';
import { validateJWT, validateJWTPointOfSales } from '../../middlewares';

export const CashSessionRoutes = Router();
const cashSessionController = new CashSessionController();

/**
 * @route   POST /api/cash-sessions/open
 * @desc    Abrir nueva sesión de caja
 * @access  Private
 * @body    { pointOfSalesId: string, initialCash: number, notes?: string }
 */
CashSessionRoutes.post('/open', validateJWTPointOfSales, cashSessionController.openCashSession.bind(cashSessionController));

/**
 * @route   PUT /api/cash-sessions/close/:sessionId
 * @desc    Cerrar sesión de caja
 * @access  Private
 * @params  sessionId: string
 * @body    { finalCash: number, notes?: string }
 */
CashSessionRoutes.put('/close/:sessionId', validateJWTPointOfSales, cashSessionController.closeCashSession.bind(cashSessionController));

/**
 * @route   GET /api/cash-sessions/active/:pointOfSalesId
 * @desc    Obtener sesión activa para un punto de venta
 * @access  Private
 * @params  pointOfSalesId: string
 */
CashSessionRoutes.get('/active/:pointOfSalesId', validateJWTPointOfSales, cashSessionController.getActiveSession.bind(cashSessionController));

/**
 * @route   GET /api/cash-sessions/history
 * @desc    Obtener historial de sesiones
 * @access  Private
 * @query   pointOfSalesId?: string, startDate?: string, endDate?: string, status?: string, page?: number, limit?: number
 */
CashSessionRoutes.get('/history', validateJWTPointOfSales, cashSessionController.getSessionHistory.bind(cashSessionController));

