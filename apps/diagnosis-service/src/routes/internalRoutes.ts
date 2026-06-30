import { Router } from 'express';
import { z } from 'zod';
import { createProducer } from '@agroconnect/kafka';
import { config } from '../config.js';
import { DiagnosisRepository } from '../repositories/diagnosisRepository.js';
import { logger } from '../logger.js';

const submitSchema = z.object({
  farm_id: z.string().min(1),
  farmer_id: z.string().min(1),
  subject_type: z.enum(['plant', 'animal']),
  subject_name: z.string().min(1),
  image_urls: z.array(z.string().url()).min(1).max(5),
  symptoms: z.string().max(2000).optional(),
  duration_days: z.number().int().positive().optional(),
});

let _producer: Awaited<ReturnType<typeof createProducer>> | null = null;

async function getProducer() {
  if (!_producer) {
    _producer = await createProducer(config.kafkaBrokers);
  }
  return _producer;
}

export function createInternalRouter(repo: DiagnosisRepository): Router {
  const router = Router();

  // POST /internal/diagnoses/submit — called by farm-service after uploading images to media-service
  router.post('/diagnoses/submit', async (req, res, next) => {
    try {
      const parse = submitSchema.safeParse(req.body);
      if (!parse.success) {
        res.status(422).json({ error: { message: 'Validation failed', issues: parse.error.issues } });
        return;
      }

      const data = parse.data;
      const now = new Date();

      const doc = await repo.create({
        farmId: data.farm_id,
        farmerId: data.farmer_id,
        subjectType: data.subject_type,
        subjectName: data.subject_name,
        imageUrls: data.image_urls,
        symptoms: data.symptoms,
        durationDays: data.duration_days,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });

      const diagnosisId = doc._id.toHexString();

      const producer = await getProducer();
      await producer.send({
        topic: 'diagnosis.submitted',
        messages: [{
          key: diagnosisId,
          value: JSON.stringify({
            diagnosis_id: diagnosisId,
            farm_id: data.farm_id,
            farmer_id: data.farmer_id,
            subject_type: data.subject_type,
            subject_name: data.subject_name,
            image_urls: data.image_urls,
            symptoms: data.symptoms,
          }),
        }],
      });

      logger.info({ diagnosisId, farmId: data.farm_id }, 'diagnosis.submitted published');
      res.status(201).json({ id: diagnosisId, status: 'pending' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
