import { Router, type Request, type Response, type NextFunction } from 'express';
import { authorize } from '@agroconnect/shared';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { reportQuerySchema } from '../schemas/reportQuery.schema.js';
import * as reportController from '../controllers/reportController.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get(
  '/farmers/:farmerId/report',
  auth,
  authorize('admin'),
  validateQuery(reportQuerySchema),
  reportController.getFarmerReportForAdmin,
);

export { router as adminFarmerRouter };
