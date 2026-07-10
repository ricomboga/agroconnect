import { Router } from 'express';
import type { RequestHandler } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import {
  getFarmersByCounty,
  getLivestockStats,
  getLoansByInstitution,
  getExpertDirectory,
  getSupplierDirectory,
  getLenderDirectory,
  getOfficerDirectory,
  exportReport,
} from '../controllers/reportsController.js';
import { livestockReportQuerySchema } from '../schemas/reportsQuery.schema.js';
import type { AdminRequest } from '../types/index.js';

const router = Router();

const auth = requireAuth as RequestHandler;
const adminOnly = authorize('admin') as RequestHandler;

router.get('/reports/farmers-by-county', auth, adminOnly, (req, res, next) =>
  getFarmersByCounty(req as AdminRequest, res, next),
);
router.get(
  '/reports/livestock',
  auth,
  adminOnly,
  validateQuery(livestockReportQuerySchema),
  (req, res, next) => getLivestockStats(req as AdminRequest, res, next),
);
router.get('/reports/loans-by-institution', auth, adminOnly, (req, res, next) =>
  getLoansByInstitution(req as AdminRequest, res, next),
);
router.get(
  '/reports/experts',
  auth,
  adminOnly,
  validateQuery(livestockReportQuerySchema),
  (req, res, next) => getExpertDirectory(req as AdminRequest, res, next),
);
router.get(
  '/reports/suppliers',
  auth,
  adminOnly,
  validateQuery(livestockReportQuerySchema),
  (req, res, next) => getSupplierDirectory(req as AdminRequest, res, next),
);
router.get('/reports/lenders', auth, adminOnly, (req, res, next) =>
  getLenderDirectory(req as AdminRequest, res, next),
);
router.get(
  '/reports/govt-officers',
  auth,
  adminOnly,
  validateQuery(livestockReportQuerySchema),
  (req, res, next) => getOfficerDirectory(req as AdminRequest, res, next),
);
router.get(
  '/reports/:type/export',
  auth,
  adminOnly,
  validateQuery(livestockReportQuerySchema),
  (req, res, next) => exportReport(req as AdminRequest, res, next),
);

export { router as reportsRouter };
