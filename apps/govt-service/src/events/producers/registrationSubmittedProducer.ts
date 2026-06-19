import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishRegistrationSubmitted(
  registrationId: string,
  farmerId: string,
  county: string,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'govt.registration.submitted',
      messages: [
        {
          key: registrationId,
          value: JSON.stringify({
            registrationId,
            farmerId,
            county,
            occurredAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info({ registrationId }, 'Published govt.registration.submitted');
  } finally {
    await producer.disconnect();
  }
}
