import { logger } from '../logger.js';
import { FarmActivityCompletedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'farm.activity.completed';

export async function farmActivityCompletedHandler(raw: unknown): Promise<void> {
  const result = FarmActivityCompletedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'farmActivityCompletedHandler' }, 'invalid payload');
    return;
  }
  const { activityId, farmId, ownerId, activityType, assignedToWorkerId } = result.data;
  const recipientId = assignedToWorkerId ?? ownerId;
  const token = await getToken(recipientId);
  if (!token) {
    logger.warn({ recipientId, context: 'farmActivityCompletedHandler' }, 'no FCM token — skipping push');
    return;
  }
  const tpl = getPushTemplate('sw', TOPIC, { activityId, farmId, activityType });
  if (!tpl) return;
  const status = await sendPush(token, tpl.title, tpl.body);
  await logDelivery({ eventType: TOPIC, farmerId: recipientId, channel: 'push', status });
  logger.info({ recipientId, activityId, status }, 'farmActivityCompletedHandler done');
}
