import { NextFunction, Request, Response, Router } from 'express';
import { OrderPointRouter, PointOfSalesRoutes, TableRoutes, CashSessionRoutes } from './modules';
import { ZReportRoutes } from './modules/reports/ZReportRoutes';

export const router = Router();

router.use((request: Request, response: Response, next: NextFunction) => {
  console.log(`[INFO][EXECUTE] ${request.method} ${request.url}`);
  next();
});

//Pedidos en el punto de venta
router.use('/api/orderPoint', OrderPointRouter);

router.use('/api/pointOfSales', PointOfSalesRoutes);

router.use('/api/table', TableRoutes);

router.use('/api/cash-sessions', CashSessionRoutes);

router.use('/api/reports', ZReportRoutes);