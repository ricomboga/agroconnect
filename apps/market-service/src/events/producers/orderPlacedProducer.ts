import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishOrderPlaced(
  orderId: string,
  buyerId: string,
  supplierId: string,
  totalPriceKes: number,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'market.order.placed',
      messages: [
        {
          key: orderId,
          value: JSON.stringify({ orderId, buyerId, supplierId, totalPriceKes, occurredAt: new Date().toISOString() }),
        },
      ],
    });
    logger.info({ orderId, context: 'orderPlacedProducer' }, 'Published market.order.placed');
  } finally {
    await producer.disconnect();
  }
}
