import { Router } from "express";
import { validateJWTAdmin, validateJWTPointOfSales } from "../../middlewares";
import { PointOfSalesController } from "./PointOfSalesController";

const pointOfSalesController = new PointOfSalesController();

export const PointOfSalesRoutes: Router = Router();

PointOfSalesRoutes.get('/:pointOfSalesId', validateJWTPointOfSales, pointOfSalesController.getPointOfSalesById.bind(pointOfSalesController));
PointOfSalesRoutes.get('/getAll', validateJWTAdmin, pointOfSalesController.getPointOfSalesByCompanyId.bind(pointOfSalesController));
PointOfSalesRoutes.post('/create', validateJWTAdmin, pointOfSalesController.createPointOfSale.bind(pointOfSalesController));