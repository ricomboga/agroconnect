import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishLoanApplied(
  loanId: string,
  farmerId: string,
  farmId: string,
  type: string,
  amountRequestedKes: number,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'finance.loan.applied',
      messages: [
        {
          key: farmerId,
          value: JSON.stringify({
            loanId,
            farmerId,
            farmId,
            type,
            amountRequestedKes,
            occurredAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info({ loanId, farmerId, type }, 'Published finance.loan.applied');
  } finally {
    await producer.disconnect();
  }
}
