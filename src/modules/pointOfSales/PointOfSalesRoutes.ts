import { Router } from "express";
import { validateJWTAdmin } from "../../middlewares";
import { PointOfSalesController } from "./PointOfSalesController";

const pointOfSalesController = new PointOfSalesController();

export const PointOfSalesRoutes: Router = Router();

PointOfSalesRoutes.post('/create', validateJWTAdmin, pointOfSalesController.createPointOfSale.bind(pointOfSalesController));