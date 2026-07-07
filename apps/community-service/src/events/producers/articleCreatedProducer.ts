import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishArticleCreated(
  articleId: string,
  slug: string,
  title: string,
  type: string,
): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'community.article.created',
      messages: [
        {
          key: articleId,
          value: JSON.stringify({
            articleId,
            slug,
            title,
            type,
            occurredAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.info({ articleId, type }, 'Published community.article.created');
  } finally {
    await producer.disconnect();
  }
}
