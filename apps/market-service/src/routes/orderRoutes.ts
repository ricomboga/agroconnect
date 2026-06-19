import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createOrderSchema } from '../schemas/createOrder.schema.js';
import { updateOrderStatusSchema } from '../schemas/updateOrderStatus.schema.js';
import { listOrdersQuerySchema } from '../schemas/listOrders.query.schema.js';
import * as orderController from '../controllers/orderController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.post('/', auth, validateBody(createOrderSchema), (req, res, next) =>
  orderController.placeOrder(req as AuthenticatedRequest, res, next),
);

router.get('/', auth, validateQuery(listOrdersQuerySchema), (req, res, next) =>
  orderController.listOrders(req as AuthenticatedRequest, res, next),
);

router.patch('/:orderId/status', auth, validateBody(updateOrderStatusSchema), (req, res, next) =>
  orderController.updateOrderStatus(req as AuthenticatedRequest, res, next),
);

export { router as orderRouter };
