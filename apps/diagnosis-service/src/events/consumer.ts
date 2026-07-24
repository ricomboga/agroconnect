import { createConsumer, createProducer, type Consumer, type Producer } from '@agroconnect/kafka';
import { z } from 'zod';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { getProvider } from '../providers/index.js';
import { isRetryable, errorCode } from '../providers/errorClassification.js';
import { DiagnosisRepository } from '../repositories/diagnosisRepository.js';
import { publishCompleted } from './producer.js';
import { withTimeout } from '../utils/withTimeout.js';

const INFERENCE_TIMEOUT_MS = 45_000;
const RETRY_DELAYS_MS = [1000, 3000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SubmittedEventSchema = z.object({
  diagnosis_id: z.string(),
  farm_id: z.string(),
  farmer_id: z.string(),
  subject_type: z.enum(['plant', 'animal']),
  subject_name: z.string(),
  image_urls: z.array(z.string()),
  symptoms: z.string().optional(),
});

type SubmittedEvent = z.infer<typeof SubmittedEventSchema>;

async function handleEvent(
  event: SubmittedEvent,
  repo: DiagnosisRepository,
  producer: Producer,
): Promise<void> {
  logger.info({ diagnosisId: event.diagnosis_id }, 'inference started');
  await repo.setProcessing(event.diagnosis_id);

  const provider = getProvider();
  const startMs = Date.now();

  const attempts = 1 + RETRY_DELAYS_MS.length;
  let lastErr: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = await withTimeout(
        provider.analyze({
          imageUrls: event.image_urls,
          subjectType: event.subject_type,
          subjectName: event.subject_name,
          symptoms: event.symptoms,
        }),
        INFERENCE_TIMEOUT_MS,
        'inference',
      );

      const processingTimeMs = Date.now() - startMs;
      await repo.setCompleted(event.diagnosis_id, result, processingTimeMs);

      await publishCompleted(producer, {
        diagnosisId: event.diagnosis_id,
        farmId: event.farm_id,
        farmerId: event.farmer_id,
        subjectType: event.subject_type,
        subjectName: event.subject_name,
        result,
      });

      logger.info(
        { diagnosisId: event.diagnosis_id, diseaseCode: result.diseaseCode, confidence: result.confidence, processingTimeMs, provider: result.providerName, attempt },
        'inference complete',
      );
      return;
    } catch (err) {
      lastErr = err;
      const retryable = isRetryable(err);
      const isLastAttempt = attempt === attempts - 1;

      logger.warn(
        { err, diagnosisId: event.diagnosis_id, attempt, retryable, errorCode: errorCode(err) },
        'inference attempt failed',
      );

      if (!retryable || isLastAttempt) break;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  logger.error({ err: lastErr, diagnosisId: event.diagnosis_id, errorCode: errorCode(lastErr) }, 'inference failed');
  await repo.setFailed(event.diagnosis_id, msg, errorCode(lastErr));
}

let _consumer: Consumer | null = null;
let _producer: Producer | null = null;

export async function startDiagnosisConsumer(repo: DiagnosisRepository): Promise<void> {
  _producer = await createProducer(config.kafkaBrokers);
  _consumer = await createConsumer(config.kafkaBrokers, config.kafkaConsumerGroup);

  await _consumer.subscribe({ topic: 'diagnosis.submitted', fromBeginning: false });

  await _consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(message.value.toString());
      } catch {
        logger.warn({ offset: message.offset }, 'malformed Kafka message — skipping');
        return;
      }

      const result = SubmittedEventSchema.safeParse(parsed);
      if (!result.success) {
        logger.warn({ errors: result.error.issues, offset: message.offset }, 'invalid diagnosis.submitted event — skipping');
        return;
      }

      await handleEvent(result.data, repo, _producer!);
    },
  });

  logger.info({ topic: 'diagnosis.submitted', group: config.kafkaConsumerGroup }, 'Kafka consumer started');
}

export async function stopDiagnosisConsumer(): Promise<void> {
  await _consumer?.disconnect();
  await _producer?.disconnect();
}
