import { createConsumer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';
import * as txRepo from '../../repositories/transactionRepository.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
const GROUP_ID = 'finance-service-consumer';

interface CollectionPaidPayload {
  collectionId: string;
  farmId: string;
  ownerId: string;
  productType: string;
  totalAmountKes: number;
  paidDate: string;
}

export async function startCollectionPaidConsumer(): Promise<void> {
  const consumer = await createConsumer(BROKERS, GROUP_ID);
  await consumer.subscribe({ topic: 'farm.collection.paid', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value?.toString() ?? '{}') as CollectionPaidPayload;

        if (!payload.ownerId || !payload.collectionId || !payload.totalAmountKes) {
          logger.warn({ payload, context: 'collectionPaidConsumer' }, 'Missing required fields — skipping');
          return;
        }

        await txRepo.createTransaction(payload.ownerId, {
          type: 'income',
          amountKes: payload.totalAmountKes,
          category: 'farm_collection',
          linkedTo: payload.collectionId,
          buyerSupplier: undefined,
          date: payload.paidDate,
          notes: `Auto-recorded from paid collection (${payload.productType})`,
        });

        logger.info(
          { collectionId: payload.collectionId, ownerId: payload.ownerId, amountKes: payload.totalAmountKes },
          'Recorded income from farm.collection.paid',
        );
      } catch (err) {
        logger.error({ err, context: 'collectionPaidConsumer' }, 'Failed to process farm.collection.paid');
        throw err;
      }
    },
  });
}
