import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export async function publishReplyCreated(params: {
  replyId: string;
  threadId: string;
  threadTitle: string;
  threadAuthorId: string;
  replierId: string;
  replierName: string;
}): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'community.reply.created',
      messages: [
        {
          key: params.threadId,
          value: JSON.stringify({ ...params, occurredAt: new Date().toISOString() }),
        },
      ],
    });
    logger.info({ threadId: params.threadId, replyId: params.replyId }, 'Published community.reply.created');
  } finally {
    await producer.disconnect();
  }
}
