import { Router} from 'express';

import { OrderPointController } from './OrderPointController';
import { validateJWTAdmin } from '../../middlewares';

const orderPointController = new OrderPointController();

export const OrderPointRouter: Router = Router();

OrderPointRouter.post('/create', validateJWTAdmin, orderPointController.createOrderPoint.bind(orderPointController))

OrderPointRouter.post('/updateProduct', validateJWTAdmin, orderPointController.updateOrderPoint.bind(orderPointController))