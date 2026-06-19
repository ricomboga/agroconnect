import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export interface UserRegisteredPayload {
  userId: string;
  phone: string;
  role: string;
  fullName: string;
  registeredAt: string;
}

export async function publishUserRegistered(payload: UserRegisteredPayload): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'user.registered',
      messages: [
        {
          key: payload.userId,
          value: JSON.stringify(payload),
          headers: { 'content-type': 'application/json' },
        },
      ],
    });
    logger.info({ userId: payload.userId }, 'Published user.registered');
  } finally {
    await producer.disconnect();
  }
}
