import { createConsumer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
const GROUP_ID = 'farm-service-consumer';

export async function startDiagnosisCompletedConsumer(): Promise<void> {
  const consumer = await createConsumer(BROKERS, GROUP_ID);
  await consumer.subscribe({ topic: 'diagnosis.completed', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value?.toString() ?? '{}') as Record<string, unknown>;
        logger.info({ farmId: payload['farmId'], diagnosisId: payload['diagnosisId'] }, 'Received diagnosis.completed');
        // Future: persist diagnosis result reference on the farm/activity record
      } catch (err) {
        logger.error({ err, context: 'diagnosisCompletedConsumer' }, 'Failed to process diagnosis.completed');
        throw err;
      }
    },
  });
}
