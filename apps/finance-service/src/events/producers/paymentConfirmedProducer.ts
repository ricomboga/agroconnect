import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishPaymentConfirmed(
  orderId: string,
  farmerId: string,
  amountKes: number,
  mpesaRef: string,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'finance.payment.confirmed',
      messages: [
        {
          key: orderId,
          value: JSON.stringify({
            orderId,
            farmerId,
            amountKes,
            mpesaRef,
            occurredAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info({ orderId, farmerId, mpesaRef }, 'Published finance.payment.confirmed');
  } finally {
    await producer.disconnect();
  }
}
