import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishFarmCreated(
  farmId: string,
  ownerId: string,
  county: string,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'farm.created',
      messages: [
        {
          key: farmId,
          value: JSON.stringify({
            farmId,
            ownerId,
            county,
            occurredAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info({ farmId }, 'Published farm.created');
  } finally {
    await producer.disconnect();
  }
}
