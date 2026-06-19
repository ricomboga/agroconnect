import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishListingCreated(
  listingId: string,
  farmerId: string,
  crop: string,
  county: string,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'market.listing.created',
      messages: [
        {
          key: listingId,
          value: JSON.stringify({ listingId, farmerId, crop, county, occurredAt: new Date().toISOString() }),
        },
      ],
    });
    logger.info({ listingId, context: 'listingCreatedProducer' }, 'Published market.listing.created');
  } finally {
    await producer.disconnect();
  }
}
