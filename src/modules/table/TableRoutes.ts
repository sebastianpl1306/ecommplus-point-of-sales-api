import { Router } from "express";
import { TableController } from "./TableController";
import { validateJWTAdmin } from "../../middlewares";

const tableController = new TableController();

export const TableRoutes: Router = Router();

TableRoutes.post('/create', validateJWTAdmin, tableController.createTable.bind(tableController));

TableRoutes.post('/get', validateJWTAdmin, tableController.getTables.bind(tableController));