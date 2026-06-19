import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishLoanDisbursed(
  loanId: string,
  farmerId: string,
  farmId: string,
  amountKes: number,
  mpesaRef: string,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'finance.loan.disbursed',
      messages: [
        {
          key: farmerId,
          value: JSON.stringify({
            loanId,
            farmerId,
            farmId,
            amountKes,
            mpesaRef,
            occurredAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info({ loanId, farmerId, mpesaRef }, 'Published finance.loan.disbursed');
  } finally {
    await producer.disconnect();
  }
}
