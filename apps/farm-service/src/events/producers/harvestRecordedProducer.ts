import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishHarvestRecorded(
  harvestId: string,
  farmId: string,
  ownerId: string,
  crop: string,
  quantityKg: number,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'farm.harvest.recorded',
      messages: [
        {
          key: farmId,
          value: JSON.stringify({
            harvestId,
            farmId,
            ownerId,
            crop,
            quantityKg,
            occurredAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info({ harvestId, farmId, crop }, 'Published farm.harvest.recorded');
  } finally {
    await producer.disconnect();
  }
}
