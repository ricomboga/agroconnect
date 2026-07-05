import { Router, type Request, type Response, type NextFunction } from 'express';
import { authorize } from '@agroconnect/shared';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { assignLenderSchema } from '../schemas/assignLender.schema.js';
import * as farmerLenderController from '../controllers/farmerLenderController.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.patch(
  '/:id/lender',
  auth,
  authorize('admin'),
  validateBody(assignLenderSchema),
  (req, res, next) => farmerLenderController.assignLender(req as AuthenticatedRequest, res, next),
);

export { router as farmerLenderRouter };
