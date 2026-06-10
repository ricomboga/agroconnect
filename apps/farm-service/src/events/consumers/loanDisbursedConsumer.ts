import { createConsumer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
const GROUP_ID = 'farm-service-consumer';

export async function startLoanDisbursedConsumer(): Promise<void> {
  const consumer = await createConsumer(BROKERS, GROUP_ID);
  await consumer.subscribe({ topic: 'finance.loan.disbursed', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value?.toString() ?? '{}') as Record<string, unknown>;
        logger.info({ farmId: payload['farmId'], loanId: payload['loanId'] }, 'Received finance.loan.disbursed');
        // Future: update farm finance summary or trigger notification
      } catch (err) {
        logger.error({ err, context: 'loanDisbursedConsumer' }, 'Failed to process finance.loan.disbursed');
        throw err;
      }
    },
  });
}
