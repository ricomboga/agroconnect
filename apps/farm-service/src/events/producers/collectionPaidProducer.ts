import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishCollectionPaid(
  collectionId: string,
  farmId: string,
  ownerId: string,
  productType: string,
  totalAmountKes: number,
  paidDate: string,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'farm.collection.paid',
      messages: [
        {
          key: farmId,
          value: JSON.stringify({
            collectionId,
            farmId,
            ownerId,
            productType,
            totalAmountKes,
            paidDate,
            occurredAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info({ collectionId, farmId, totalAmountKes }, 'Published farm.collection.paid');
  } finally {
    await producer.disconnect();
  }
}
