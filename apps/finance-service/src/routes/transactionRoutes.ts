import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import * as transactionController from '../controllers/transactionController.js';
import { AuthenticatedRequest } from '../types/index.js';
import { createTransactionSchema } from '../schemas/createTransaction.schema.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

function toAuth(
  handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) =>
    handler(req as AuthenticatedRequest, res, next);
}

router.get('/', auth, toAuth(transactionController.listTransactions));
router.post('/', auth, validateBody(createTransactionSchema), toAuth(transactionController.createTransaction));

export { router as transactionRouter };
