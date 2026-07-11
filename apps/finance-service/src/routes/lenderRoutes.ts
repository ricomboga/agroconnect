import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { lenderStatusUpdateSchema } from '../schemas/lenderStatusUpdate.schema.js';
import { reportQuerySchema } from '../schemas/reportQuery.schema.js';
import { createInputDistributionSchema } from '../schemas/createInputDistribution.schema.js';
import { updateOperatingCountiesSchema } from '../schemas/updateOperatingCounties.schema.js';
import * as lenderController from '../controllers/lenderController.js';
import * as inputDistributionController from '../controllers/inputDistributionController.js';
import * as lenderReportsController from '../controllers/lenderReportsController.js';
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
router.patch(
  '/institution/operating-counties',
  auth,
  validateBody(updateOperatingCountiesSchema),
  toAuthReq(lenderController.updateLenderOperatingCounties),
);
router.get('/dashboard', auth, toAuthReq(lenderController.getLenderDashboard));
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

router.post(
  '/input-distributions',
  auth,
  validateBody(createInputDistributionSchema),
  toAuthReq(inputDistributionController.createInputDistributionHandler),
);
router.get(
  '/input-distributions',
  auth,
  validateQuery(reportQuerySchema),
  toAuthReq(inputDistributionController.listInputDistributionsHandler),
);

router.get(
  '/reports/farmers',
  auth,
  toAuthReq(lenderReportsController.getFarmersListReportHandler),
);
router.get(
  '/reports/income-statement',
  auth,
  validateQuery(reportQuerySchema),
  toAuthReq(lenderReportsController.getIncomeStatementReportHandler),
);

export { router as lenderRouter };
