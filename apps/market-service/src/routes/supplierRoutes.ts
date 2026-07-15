import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateQuery, validateBody } from '../middleware/validate.js';
import { listOrdersQuerySchema } from '../schemas/listOrders.query.schema.js';
import { listCustomersQuerySchema } from '../schemas/listCustomers.query.schema.js';
import { supplierSummaryQuerySchema } from '../schemas/supplierSummary.query.schema.js';
import { updateSupplierProfileSchema } from '../schemas/updateSupplierProfile.schema.js';
import * as supplierController from '../controllers/supplierController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const supplierOnly = authorize('supplier', 'admin') as (req: Request, res: Response, next: NextFunction) => void;
const adminOnly = authorize('admin') as (req: Request, res: Response, next: NextFunction) => void;

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

router.get(
  '/me/profile',
  auth,
  supplierOnly,
  (req, res, next) => supplierController.getMyProfile(req as AuthenticatedRequest, res, next),
);

router.patch(
  '/me/profile',
  auth,
  supplierOnly,
  validateBody(updateSupplierProfileSchema),
  (req, res, next) => supplierController.updateMyProfile(req as AuthenticatedRequest, res, next),
);

router.get(
  '/:supplierId/orders',
  auth,
  adminOnly,
  validateQuery(listOrdersQuerySchema),
  (req, res, next) => supplierController.getOrdersForAdmin(req as AuthenticatedRequest, res, next),
);

router.get(
  '/:supplierId/customers',
  auth,
  adminOnly,
  validateQuery(listCustomersQuerySchema),
  (req, res, next) => supplierController.getCustomersForAdmin(req as AuthenticatedRequest, res, next),
);

router.get(
  '/:supplierId/summary',
  auth,
  adminOnly,
  validateQuery(supplierSummaryQuerySchema),
  (req, res, next) => supplierController.getSummaryForAdmin(req as AuthenticatedRequest, res, next),
);

export { router as supplierRouter };
