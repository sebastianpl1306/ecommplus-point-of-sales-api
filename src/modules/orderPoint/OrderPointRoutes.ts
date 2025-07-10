import { Router} from 'express';

import { OrderPointController } from './OrderPointController';
import { validateJWTPointOfSales } from '../../middlewares';

const orderPointController = new OrderPointController();

export const OrderPointRouter: Router = Router();

OrderPointRouter.post('/create', validateJWTPointOfSales, orderPointController.createOrderPoint.bind(orderPointController))

OrderPointRouter.put('/updateProduct/:orderPointId', validateJWTPointOfSales, orderPointController.updateOrderPoint.bind(orderPointController))

OrderPointRouter.put('/removeProduct/:orderPointId', validateJWTPointOfSales, orderPointController.removeProductFromOrderPoint.bind(orderPointController))