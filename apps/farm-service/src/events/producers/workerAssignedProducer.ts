import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishWorkerAssigned(
  farmId: string,
  farmName: string,
  workerId: string,
  workerRole: string,
  ownerId: string,
  addedAt: Date,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'farm.worker.assigned',
      messages: [
        {
          key: farmId,
          value: JSON.stringify({
            farmId,
            farmName,
            workerId,
            workerRole,
            ownerId,
            addedAt: addedAt.toISOString(),
          }),
        },
      ],
    });
    logger.info({ farmId, workerId }, 'Published farm.worker.assigned');
  } finally {
    await producer.disconnect();
  }
}
