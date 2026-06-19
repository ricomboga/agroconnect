import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishListingInquiry(
  listingId: string,
  farmerId: string,
  buyerId: string,
  message: string,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'market.listing.inquiry',
      messages: [
        {
          key: listingId,
          value: JSON.stringify({ listingId, farmerId, buyerId, message, occurredAt: new Date().toISOString() }),
        },
      ],
    });
    logger.info({ listingId, buyerId, context: 'listingInquiryProducer' }, 'Published market.listing.inquiry');
  } finally {
    await producer.disconnect();
  }
}
