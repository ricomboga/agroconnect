import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { AuthenticatedRequest } from '../types/index.js';
import * as mediaController from '../controllers/mediaController.js';

const router = Router();

const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const admin = authorize('admin') as (req: Request, res: Response, next: NextFunction) => void;

router.post(
  '/upload',
  auth,
  upload.single('file'),
  (req, res, next) => mediaController.uploadMedia(req as AuthenticatedRequest, res, next),
);

// GET /sign/* — pre-signed URL for private documents; key may contain slashes
router.get('/sign/*', auth, (req, res, next) =>
  mediaController.signMedia(req as AuthenticatedRequest, res, next),
);

// DELETE /* — admin only; key may contain slashes
router.delete('/*', auth, admin, mediaController.deleteMedia);

export { router as mediaRouter };
