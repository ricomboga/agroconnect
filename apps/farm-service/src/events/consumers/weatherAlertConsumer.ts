import { createConsumer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
const GROUP_ID = 'farm-service-consumer';

export async function startWeatherAlertConsumer(): Promise<void> {
  const consumer = await createConsumer(BROKERS, GROUP_ID);
  await consumer.subscribe({ topic: 'weather.alert.issued', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value?.toString() ?? '{}') as Record<string, unknown>;
        logger.info({ county: payload['county'], alertType: payload['alertType'] }, 'Received weather.alert.issued');
        // Future: flag activities in the affected county as needing review
      } catch (err) {
        logger.error({ err, context: 'weatherAlertConsumer' }, 'Failed to process weather.alert.issued');
        throw err;
      }
    },
  });
}
