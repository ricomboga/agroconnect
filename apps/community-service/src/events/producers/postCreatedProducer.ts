import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishPostCreated(
  threadId: string,
  authorId: string,
  category: string,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'community.post.created',
      messages: [
        {
          key: threadId,
          value: JSON.stringify({
            threadId,
            authorId,
            category,
            occurredAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info({ threadId }, 'Published community.post.created');
  } finally {
    await producer.disconnect();
  }
}
