import { createConsumer, Consumer } from '@agroconnect/kafka';
import { logger } from '../logger.js';
import { farmCreatedHandler } from '../handlers/farmCreatedHandler.js';
import { farmActivityCompletedHandler } from '../handlers/farmActivityCompletedHandler.js';
import { farmHarvestRecordedHandler } from '../handlers/farmHarvestRecordedHandler.js';
import { diagnosisCompletedHandler } from '../handlers/diagnosisCompletedHandler.js';
import { financeLoanAppliedHandler } from '../handlers/financeLoanAppliedHandler.js';
import { financeLoanDisbursedHandler } from '../handlers/financeLoanDisbursedHandler.js';
import { financePaymentConfirmedHandler } from '../handlers/financePaymentConfirmedHandler.js';
import { financePaymentFailedHandler } from '../handlers/financePaymentFailedHandler.js';
import { marketListingCreatedHandler } from '../handlers/marketListingCreatedHandler.js';
import { marketOrderPlacedHandler } from '../handlers/marketOrderPlacedHandler.js';
import { marketOrderUpdatedHandler } from '../handlers/marketOrderUpdatedHandler.js';
import { govtRegistrationSubmittedHandler } from '../handlers/govtRegistrationSubmittedHandler.js';
import { weatherAlertIssuedHandler } from '../handlers/weatherAlertIssuedHandler.js';
import { communityPostCreatedHandler } from '../handlers/communityPostCreatedHandler.js';
import { communityReplyCreatedHandler } from '../handlers/communityReplyCreatedHandler.js';
import { communityArticleCreatedHandler } from '../handlers/communityArticleCreatedHandler.js';
import { userRegisteredHandler } from '../handlers/userRegisteredHandler.js';
import { userPinResetHandler } from '../handlers/userPinResetHandler.js';
import { notificationSendHandler } from '../handlers/notificationSendHandler.js';
import { farmWorkerAssignedHandler } from '../handlers/farmWorkerAssignedHandler.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
const GROUP_ID = 'notification-service-consumer';

const TOPICS = [
  'farm.created',
  'farm.worker.assigned',
  'farm.activity.completed',
  'farm.harvest.recorded',
  'diagnosis.completed',
  'finance.loan.applied',
  'finance.loan.disbursed',
  'finance.payment.confirmed',
  'finance.payment.failed',
  'market.listing.created',
  'market.order.placed',
  'market.order.updated',
  'govt.registration.submitted',
  'weather.alert.issued',
  'community.post.created',
  'community.reply.created',
  'community.article.created',
  'user.registered',
  'user.pin_reset',
  'notification.send',
] as const;

type Topic = (typeof TOPICS)[number];

const HANDLER_MAP: Record<Topic, (payload: unknown) => Promise<void>> = {
  'farm.created': farmCreatedHandler,
  'farm.worker.assigned': farmWorkerAssignedHandler,
  'farm.activity.completed': farmActivityCompletedHandler,
  'farm.harvest.recorded': farmHarvestRecordedHandler,
  'diagnosis.completed': diagnosisCompletedHandler,
  'finance.loan.applied': financeLoanAppliedHandler,
  'finance.loan.disbursed': financeLoanDisbursedHandler,
  'finance.payment.confirmed': financePaymentConfirmedHandler,
  'finance.payment.failed': financePaymentFailedHandler,
  'market.listing.created': marketListingCreatedHandler,
  'market.order.placed': marketOrderPlacedHandler,
  'market.order.updated': marketOrderUpdatedHandler,
  'govt.registration.submitted': govtRegistrationSubmittedHandler,
  'weather.alert.issued': weatherAlertIssuedHandler,
  'community.post.created': communityPostCreatedHandler,
  'community.reply.created': communityReplyCreatedHandler,
  'community.article.created': communityArticleCreatedHandler,
  'user.registered': userRegisteredHandler,
  'user.pin_reset': userPinResetHandler,
  'notification.send': notificationSendHandler,
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
        const payload: unknown = JSON.parse(raw);
        const handler = HANDLER_MAP[topic as Topic];
        if (!handler) {
          logger.warn({ topic }, 'no handler registered for topic');
          return;
        }
        await handler(payload);
      } catch (err) {
        logger.error({ topic, err, context: 'consumer.eachMessage' }, 'handler threw — message skipped');
      }
    },
  });

  logger.info({ topics: TOPICS }, 'Kafka consumer running');
  return consumer;
}
