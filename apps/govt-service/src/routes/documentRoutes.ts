import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { uploadDocumentBodySchema } from '../schemas/uploadDocument.schema.js';
import * as documentController from '../controllers/documentController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post(
  '/',
  auth,
  upload.single('file'),
  validateBody(uploadDocumentBodySchema),
  (req, res, next) => documentController.uploadDocument(req as AuthenticatedRequest, res, next),
);

router.get(
  '/',
  auth,
  (req, res, next) => documentController.listDocuments(req as AuthenticatedRequest, res, next),
);

export { router as documentRouter };
