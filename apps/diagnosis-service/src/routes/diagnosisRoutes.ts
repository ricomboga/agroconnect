import { Router } from 'express';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { DiagnosisRepository } from '../repositories/diagnosisRepository.js';
import { DISEASE_TAXONOMY, TAXONOMY_BY_CODE } from '../taxonomy/diseases.js';
import { toResponse } from '../models/diagnosis.js';

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  outcome: z.enum(['resolved', 'improved', 'no_change', 'worsened']),
  notes: z.string().max(1000).optional(),
});

export function createDiagnosisRouter(repo: DiagnosisRepository): Router {
  const router = Router();

  // GET /diagnoses/farm/:farmId
  router.get('/farm/:farmId', async (req, res, next) => {
    try {
      const { farmId } = req.params as { farmId: string };
      const skip = parseInt((req.query['skip'] as string) ?? '0', 10);
      const limit = Math.min(parseInt((req.query['limit'] as string) ?? '20', 10), 100);

      const [docs, total] = await Promise.all([
        repo.findByFarm(farmId, skip, limit),
        repo.countByFarm(farmId),
      ]);

      res.json({ data: docs.map(toResponse), total });
    } catch (err) {
      next(err);
    }
  });

  // GET /diagnoses/:id
  router.get('/:id', async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      if (!ObjectId.isValid(id)) {
        res.status(404).json({ error: { message: 'Diagnosis not found' } });
        return;
      }
      const doc = await repo.findById(id);
      if (!doc) {
        res.status(404).json({ error: { message: 'Diagnosis not found' } });
        return;
      }
      res.json({ data: toResponse(doc) });
    } catch (err) {
      next(err);
    }
  });

  // POST /diagnoses/:id/feedback
  router.post('/:id/feedback', async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const parse = feedbackSchema.safeParse(req.body);
      if (!parse.success) {
        res.status(422).json({ error: { message: 'Validation failed', issues: parse.error.issues } });
        return;
      }
      const doc = await repo.findById(id);
      if (!doc) {
        res.status(404).json({ error: { message: 'Diagnosis not found' } });
        return;
      }
      await repo.addFeedback(id, { ...parse.data, submittedAt: new Date() });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // GET /diseases — disease library
  router.get('/diseases', (_req, res) => {
    res.json({ data: DISEASE_TAXONOMY, total: DISEASE_TAXONOMY.length });
  });

  // GET /diseases/:code
  router.get('/diseases/:code', (req, res) => {
    const entry = TAXONOMY_BY_CODE.get((req.params as { code: string }).code);
    if (!entry) {
      res.status(404).json({ error: { message: 'Disease not found' } });
      return;
    }
    res.json({ data: entry });
  });

  return router;
}
