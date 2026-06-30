import { Router, Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { z } from 'zod';
import * as diagnoseController from '../controllers/diagnoseController.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

// Images stay in memory; max 5 files, 5 MB each — consistent with media-service limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    cb(null, ['image/jpeg', 'image/png'].includes(file.mimetype));
  },
});

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  outcome: z.enum(['resolved', 'improved', 'no_change', 'worsened']),
  notes: z.string().max(1000).optional(),
});

// POST /api/v1/diagnose — submit images for AI diagnosis
router.post(
  '/',
  auth,
  upload.array('images', 5),
  (req, res, next) => diagnoseController.submitDiagnosis(req as AuthenticatedRequest, res, next),
);

// GET /api/v1/diagnose/diseases — browse disease library (must come before /:diagnosisId)
router.get('/diseases', auth, (req, res, next) =>
  diagnoseController.listDiseases(req as AuthenticatedRequest, res, next),
);

// GET /api/v1/diagnose/diseases/:code
router.get('/diseases/:diseaseCode', auth, (req, res, next) =>
  diagnoseController.getDisease(req as AuthenticatedRequest, res, next),
);

// GET /api/v1/diagnose/farm/:farmId — all diagnoses for a farm
router.get('/farm/:farmId', auth, (req, res, next) =>
  diagnoseController.listFarmDiagnoses(req as AuthenticatedRequest, res, next),
);

// GET /api/v1/diagnose/:diagnosisId — poll result (enriched with suppliers)
router.get('/:diagnosisId', auth, (req, res, next) =>
  diagnoseController.getDiagnosis(req as AuthenticatedRequest, res, next),
);

// POST /api/v1/diagnose/:diagnosisId/feedback
router.post('/:diagnosisId/feedback', auth, validateBody(feedbackSchema), (req, res, next) =>
  diagnoseController.submitFeedback(req as AuthenticatedRequest, res, next),
);

export { router as diagnoseRouter };
