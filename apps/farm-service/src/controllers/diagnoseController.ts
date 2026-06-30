import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import * as diagnoseService from '../services/diagnoseService.js';
import { logger } from '../logger.js';

export async function submitDiagnosis(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const files = ((req as AuthenticatedRequest & { files?: Express.Multer.File[] }).files) ?? [];
    const { farm_id, subject_type, subject_name, symptoms, duration_days } = req.body as {
      farm_id: string;
      subject_type: 'plant' | 'animal';
      subject_name: string;
      symptoms?: string;
      duration_days?: string;
    };

    const authToken = (req.headers['authorization'] ?? '').replace('Bearer ', '');

    // Create a placeholder diagnosis ID for media uploads; real ID comes back from diagnosis-service
    const tempId = `tmp-${Date.now()}`;
    const imageUrls: string[] = [];

    for (const file of files) {
      try {
        const url = await diagnoseService.uploadImageToMedia(
          file.buffer,
          file.originalname,
          file.mimetype,
          tempId,
          authToken,
        );
        imageUrls.push(url);
      } catch (err) {
        logger.warn({ err, filename: file.originalname }, 'Image upload failed — skipping file');
      }
    }

    if (imageUrls.length === 0 && files.length > 0) {
      res.status(502).json({
        error_code: 'MEDIA_UPLOAD_FAILED',
        message_key: 'error.diagnose.image_upload_failed',
        request_id: req.headers['x-request-id'] ?? '',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await diagnoseService.submitDiagnosis({
      farm_id,
      farmer_id: req.user.id,
      subject_type,
      subject_name,
      image_urls: imageUrls,
      symptoms: symptoms || undefined,
      duration_days: duration_days ? parseInt(duration_days, 10) : undefined,
    });

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getDiagnosis(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { diagnosisId } = req.params as { diagnosisId: string };
    const county = req.query['county'] as string | undefined;
    const result = await diagnoseService.getDiagnosisResult(diagnosisId);

    // Enrich supplier list by farmer's county if provided via query param
    if (county && result.suppliers.length === 0) {
      const productNames = (result.prescriptions ?? [])
        .map((p) => p.product_name)
        .filter((n): n is string => Boolean(n));
      if (productNames.length > 0) {
        result.suppliers = await diagnoseService.getSuppliersByProductNames(productNames, county);
      }
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function listFarmDiagnoses(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { farmId } = req.params as { farmId: string };
    const skip = parseInt((req.query['skip'] as string) ?? '0', 10);
    const limit = Math.min(parseInt((req.query['limit'] as string) ?? '20', 10), 100);
    const result = await diagnoseService.listDiagnosesByFarm(farmId, skip, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function submitFeedback(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { diagnosisId } = req.params as { diagnosisId: string };
    await diagnoseService.submitFeedback(diagnosisId, req.body as { rating: number; outcome: string; notes?: string });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function listDiseases(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await diagnoseService.listDiseases();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDisease(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { diseaseCode } = req.params as { diseaseCode: string };
    const result = await diagnoseService.getDisease(diseaseCode);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
