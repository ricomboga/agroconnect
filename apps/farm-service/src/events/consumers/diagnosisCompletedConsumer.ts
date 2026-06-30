import { createConsumer } from '@agroconnect/kafka';
import { prisma } from '@agroconnect/db/farm';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
const GROUP_ID = 'farm-service-consumer';

// Fields match the Python DiagnosisCompletedEvent (snake_case)
interface DiagnosisCompletedPayload {
  diagnosis_id: string;
  farm_id: string;
  farmer_id: string;
  subject_type: string;
  subject_name: string;
  disease_code: string;
  disease_name: string;
  confidence: number;
  severity: string; // 'mild' | 'moderate' | 'severe' | 'critical'
  status: string;
  occurred_at: string;
}

function normalizeSeverity(severity: string): 'low' | 'medium' | 'high' {
  if (severity === 'critical') return 'high';
  if (severity === 'severe') return 'medium';
  return 'low';
}

export async function startDiagnosisCompletedConsumer(): Promise<void> {
  const consumer = await createConsumer(BROKERS, GROUP_ID);
  await consumer.subscribe({ topic: 'diagnosis.completed', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value?.toString() ?? '{}') as DiagnosisCompletedPayload;

        if (!payload.farm_id || !payload.diagnosis_id) {
          logger.warn({ payload, context: 'diagnosisCompletedConsumer' }, 'Missing required fields — skipping');
          return;
        }

        const normalized = normalizeSeverity(payload.severity ?? 'mild');

        logger.info(
          { farmId: payload.farm_id, diagnosisId: payload.diagnosis_id, severity: normalized },
          'Processing diagnosis.completed',
        );

        if (normalized === 'low') return;

        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 1);

        const subjectLabel = payload.subject_type === 'animal' ? 'mnyama' : 'zao';
        const title = `Tibu ${payload.disease_name} — ${subjectLabel} (${payload.subject_name})`;
        const notes = `Ugonjwa uliogundulika: ${payload.disease_name} (${payload.disease_code}) — ukali: ${payload.severity}. Nambari ya uchunguzi: ${payload.diagnosis_id.slice(0, 8)}`;
        const activityType = payload.subject_type === 'animal' ? 'other' : 'pesticide';

        await prisma.activity.create({
          data: {
            farmId: payload.farm_id,
            plotId: null,
            type: activityType,
            title,
            notes,
            scheduledDate,
            status: 'pending',
            labourCostKes: 0,
          },
        });

        logger.info(
          { farmId: payload.farm_id, diagnosisId: payload.diagnosis_id },
          'Treatment activity created from diagnosis',
        );
      } catch (err) {
        logger.error({ err, context: 'diagnosisCompletedConsumer' }, 'Failed to process diagnosis.completed');
        throw err;
      }
    },
  });
}
