import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { listOrdersQuerySchema } from '../schemas/listOrders.query.schema.js';
import { listCustomersQuerySchema } from '../schemas/listCustomers.query.schema.js';
import { supplierSummaryQuerySchema } from '../schemas/supplierSummary.query.schema.js';
import * as supplierController from '../controllers/supplierController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const supplierOnly = authorize('supplier', 'admin') as (req: Request, res: Response, next: NextFunction) => void;

router.get(
  '/me/orders',
  auth,
  supplierOnly,
  validateQuery(listOrdersQuerySchema),
  (req, res, next) => supplierController.getMyOrders(req as AuthenticatedRequest, res, next),
);

router.get(
  '/me/customers',
  auth,
  supplierOnly,
  validateQuery(listCustomersQuerySchema),
  (req, res, next) => supplierController.getMyCustomers(req as AuthenticatedRequest, res, next),
);

router.get(
  '/me/summary',
  auth,
  supplierOnly,
  validateQuery(supplierSummaryQuerySchema),
  (req, res, next) => supplierController.getMySummary(req as AuthenticatedRequest, res, next),
);

export { router as supplierRouter };
