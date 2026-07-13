import { createProducer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export interface UserPinResetPayload {
  userId: string;
  phone: string;
  fullName: string;
  newPin: string;
  resetByUserId: string;
  occurredAt: string;
}

// newPin travels only in this transient Kafka message — it is never persisted in
// plaintext anywhere (not in the DB, not in the audit log, not in this producer's logs).
export async function publishUserPinReset(payload: UserPinResetPayload): Promise<void> {
  const producer = await createProducer(BROKERS);
  try {
    await producer.send({
      topic: 'user.pin_reset',
      messages: [
        {
          key: payload.userId,
          value: JSON.stringify(payload),
          headers: { 'content-type': 'application/json' },
        },
      ],
    });
    logger.info({ userId: payload.userId }, 'Published user.pin_reset');
  } finally {
    await producer.disconnect();
  }
}
