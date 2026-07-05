import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import * as reportController from '../controllers/reportController.js';
import { AuthenticatedRequest } from '../types/index.js';
import { reportQuerySchema } from '../schemas/reportQuery.schema.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

function toAuth(
  handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) =>
    handler(req as AuthenticatedRequest, res, next);
}

router.get('/me', auth, validateQuery(reportQuerySchema), toAuth(reportController.getMyReport));

export { router as reportRouter };
