import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createLoanSchema } from '../schemas/createLoan.schema.js';
import { addDocumentSchema } from '../schemas/addDocument.schema.js';
import * as loanController from '../controllers/loanController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

function toAuth(
  handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) =>
    handler(req as AuthenticatedRequest, res, next);
}

router.post('/', auth, validateBody(createLoanSchema), toAuth(loanController.submitLoan));
router.get('/', auth, toAuth(loanController.listLoans));
router.get('/:loanId', auth, toAuth(loanController.getLoan));

router.post('/:loanId/cancel', auth, toAuth(loanController.cancelLoan));
router.get('/:loanId/documents', auth, toAuth(loanController.listDocuments));
router.post(
  '/:loanId/documents',
  auth,
  validateBody(addDocumentSchema),
  toAuth(loanController.addDocument),
);
router.delete('/:loanId/documents/:docId', auth, toAuth(loanController.deleteDocument));

export { router as loanRouter };
