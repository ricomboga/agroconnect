import { createConsumer, Consumer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
const GROUP_ID = 'admin-service-consumer';

const TOPICS = [
  'finance.loan.applied',
  'govt.registration.submitted',
  'community.post.created',
  'dead_letter',
] as const;

type Topic = (typeof TOPICS)[number];

async function handleLoanApplied(payload: Record<string, unknown>): Promise<void> {
  logger.info(
    { loanId: payload['loanId'], farmerId: payload['farmerId'], type: payload['type'] },
    'admin: finance.loan.applied received',
  );
  // Future: persist to admin analytics table, trigger compliance review for large loans
}

async function handleRegistrationSubmitted(payload: Record<string, unknown>): Promise<void> {
  logger.info(
    { registrationId: payload['registrationId'], county: payload['county'] },
    'admin: govt.registration.submitted received',
  );
  // Future: queue for officer assignment, update county registration counters
}

async function handlePostCreated(payload: Record<string, unknown>): Promise<void> {
  logger.info(
    { threadId: payload['threadId'], authorId: payload['authorId'] },
    'admin: community.post.created received',
  );
  // Future: run content moderation pipeline, flag for review if needed
}

async function handleDeadLetter(payload: Record<string, unknown>): Promise<void> {
  logger.error(
    { originalTopic: payload['originalTopic'], error: payload['error'], payload },
    'admin: dead_letter message received — manual inspection required',
  );
  // Future: persist to dead_letter_events table, alert on-call
}

const HANDLER_MAP: Record<Topic, (payload: Record<string, unknown>) => Promise<void>> = {
  'finance.loan.applied': handleLoanApplied,
  'govt.registration.submitted': handleRegistrationSubmitted,
  'community.post.created': handlePostCreated,
  dead_letter: handleDeadLetter,
};

export async function startConsumers(): Promise<Consumer> {
  const consumer = await createConsumer(BROKERS, GROUP_ID);

  for (const topic of TOPICS) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const raw = message.value?.toString();
        if (!raw) return;
        const payload = JSON.parse(raw) as Record<string, unknown>;
        const handler = HANDLER_MAP[topic as Topic];
        if (!handler) {
          logger.warn({ topic }, 'admin-service: no handler for topic');
          return;
        }
        await handler(payload);
      } catch (err) {
        logger.error({ topic, err, context: 'admin.consumer.eachMessage' }, 'handler threw — message skipped');
      }
    },
  });

  logger.info({ topics: TOPICS }, 'admin-service Kafka consumers running');
  return consumer;
}
