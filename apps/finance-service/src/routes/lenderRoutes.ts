import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { lenderStatusUpdateSchema } from '../schemas/lenderStatusUpdate.schema.js';
import { reportQuerySchema } from '../schemas/reportQuery.schema.js';
import * as lenderController from '../controllers/lenderController.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

function toAuthReq(
  handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) =>
    handler(req as AuthenticatedRequest, res, next);
}

router.get('/institution', auth, toAuthReq(lenderController.getLenderInstitution));
router.get('/loans', auth, toAuthReq(lenderController.getLenderPipeline));
router.get('/loans/:loanId', auth, toAuthReq(lenderController.getLenderLoanDetail));
router.get(
  '/loans/:loanId/report',
  auth,
  validateQuery(reportQuerySchema),
  toAuthReq(lenderController.getLenderFarmerReport),
);
router.patch(
  '/loans/:loanId/status',
  auth,
  validateBody(lenderStatusUpdateSchema),
  toAuthReq(lenderController.updateLoanStatus),
);

export { router as lenderRouter };
