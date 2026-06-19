import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishOrderUpdated(
  orderId: string,
  status: string,
  supplierId: string,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'market.order.updated',
      messages: [
        {
          key: orderId,
          value: JSON.stringify({ orderId, status, supplierId, occurredAt: new Date().toISOString() }),
        },
      ],
    });
    logger.info({ orderId, status, context: 'orderUpdatedProducer' }, 'Published market.order.updated');
  } finally {
    await producer.disconnect();
  }
}
