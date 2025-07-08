import { Router } from "express";
import { TableController } from "./TableController";
import { validateJWTAdmin, validateJWTPointOfSales } from "../../middlewares";

const tableController = new TableController();

export const TableRoutes: Router = Router();

TableRoutes.post('/create', validateJWTAdmin, tableController.createTable.bind(tableController));

TableRoutes.get('/get', [ validateJWTPointOfSales ], tableController.getTables.bind(tableController));

TableRoutes.get('/get-by-id', [ validateJWTPointOfSales ], tableController.getTableById.bind(tableController));