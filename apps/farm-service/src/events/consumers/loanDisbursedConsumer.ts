import { createConsumer } from '@agroconnect/kafka';
import { prisma } from '@agroconnect/db/farm';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
const GROUP_ID = 'farm-service-consumer';

interface LoanDisbursedPayload {
  loanId: string;
  farmId?: string;
  ownerId: string;
  amountKes: number;
  disbursedAt: string;
}

export async function startLoanDisbursedConsumer(): Promise<void> {
  const consumer = await createConsumer(BROKERS, GROUP_ID);
  await consumer.subscribe({ topic: 'finance.loan.disbursed', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value?.toString() ?? '{}') as LoanDisbursedPayload;

        if (!payload.ownerId || !payload.loanId) {
          logger.warn({ payload, context: 'loanDisbursedConsumer' }, 'Missing required fields — skipping');
          return;
        }

        logger.info(
          { loanId: payload.loanId, ownerId: payload.ownerId, amountKes: payload.amountKes },
          'Processing finance.loan.disbursed',
        );

        // If a specific farm was referenced in the loan, add a note activity to help the farmer
        // track that funds are available for planned inputs/labour.
        if (!payload.farmId) return;

        const farm = await prisma.farm.findFirst({
          where: { id: payload.farmId, ownerId: payload.ownerId, deletedAt: null },
          select: { id: true },
        });

        if (!farm) return;

        const disbursedDate = payload.disbursedAt ? new Date(payload.disbursedAt) : new Date();

        await prisma.activity.create({
          data: {
            farmId: payload.farmId,
            type: 'other',
            title: `Loan disbursed — KES ${payload.amountKes.toLocaleString()}`,
            notes: `Loan ID: ${payload.loanId}. Funds available for farm inputs and labour.`,
            scheduledDate: disbursedDate,
            status: 'completed',
            completedDate: disbursedDate,
            labourCostKes: 0,
          },
        });

        logger.info(
          { farmId: payload.farmId, loanId: payload.loanId },
          'Loan disbursement activity recorded on farm',
        );
      } catch (err) {
        logger.error({ err, context: 'loanDisbursedConsumer' }, 'Failed to process finance.loan.disbursed');
        throw err;
      }
    },
  });
}
