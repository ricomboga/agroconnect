import { createConsumer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
const GROUP_ID = 'govt-service-consumer';

export async function startFarmCreatedConsumer(): Promise<void> {
  const consumer = await createConsumer(BROKERS, GROUP_ID);
  await consumer.subscribe({ topic: 'farm.created', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value?.toString() ?? '{}') as Record<string, unknown>;
        const farmId = payload['farmId'] as string | undefined;
        const farmerId = payload['farmerId'] as string | undefined;
        const county = payload['county'] as string | undefined;

        logger.info(
          { farmId, farmerId, county, context: 'farmCreatedConsumer' },
          'farm.created received — checking registration eligibility',
        );

        // Future: auto-create a draft govt registration for the new farm,
        // or flag farm in the county officer's queue for verification.
      } catch (err) {
        logger.error({ err, context: 'farmCreatedConsumer' }, 'Failed to process farm.created');
        throw err;
      }
    },
  });
}
