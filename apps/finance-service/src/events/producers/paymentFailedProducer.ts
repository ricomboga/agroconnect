import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishPaymentFailed(
  loanId: string,
  farmerId: string,
  resultCode: number,
  resultDesc: string,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'finance.payment.failed',
      messages: [
        {
          key: farmerId,
          value: JSON.stringify({
            loanId,
            farmerId,
            resultCode,
            resultDesc,
            occurredAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info({ loanId, farmerId, resultCode }, 'Published finance.payment.failed');
  } finally {
    await producer.disconnect();
  }
}
