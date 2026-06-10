import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishActivityCompleted(
  activityId: string,
  farmId: string,
  ownerId: string,
  activityType: string,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'farm.activity.completed',
      messages: [
        {
          key: farmId,
          value: JSON.stringify({
            activityId,
            farmId,
            ownerId,
            activityType,
            occurredAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info({ activityId, farmId }, 'Published farm.activity.completed');
  } finally {
    await producer.disconnect();
  }
}
