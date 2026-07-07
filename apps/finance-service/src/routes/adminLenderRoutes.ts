import { Router, type Request, type Response, type NextFunction } from 'express';
import { authorize } from '@agroconnect/shared';
import { requireAuth } from '../middleware/auth.js';
import * as lenderController from '../controllers/lenderController.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get(
  '/lenders/:partnerBankId/summary',
  auth,
  authorize('admin'),
  lenderController.getLenderSummaryForAdmin,
);

export { router as adminLenderRouter };
