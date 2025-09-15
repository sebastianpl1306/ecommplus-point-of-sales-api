import { Router } from "express";
import { ZReportController } from "./ZReportController";
import { validateJWTPointOfSales } from "../../middlewares";

export const ZReportRoutes = Router();
const zReportController = new ZReportController();

/**
 * @route   POST /api/z-reports/exportForPrint
 * @desc    Exportar reporte Z para impresión
 */
ZReportRoutes.get('/exportForPrint/:reportId', validateJWTPointOfSales, zReportController.exportZReportForPrint.bind(zReportController));

/**
 * @route   POST /api/z-reports/generate
 * @desc    Generar nuevo reporte Z
 * @access  Private
 * @body    { sessionId: string, notes?: string }
 */
ZReportRoutes.post('/generate', validateJWTPointOfSales, zReportController.generateZReport.bind(zReportController));

/**
 * @route   GET /api/z-reports
 * @desc    Obtener lista de reportes Z con filtros y paginación
 * @access  Private
 * @query   pointOfSalesId?: string, startDate?: string, endDate?: string, status?: string, page?: number, limit?: number
 */
ZReportRoutes.get('/', validateJWTPointOfSales, zReportController.getZReports.bind(zReportController));