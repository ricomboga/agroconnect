import { logger } from '../logger.js';
import { FarmCreatedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'farm.created';

export async function farmCreatedHandler(raw: unknown): Promise<void> {
  const result = FarmCreatedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'farmCreatedHandler' }, 'invalid payload');
    return;
  }
  const { farmId, ownerId, county } = result.data;
  const token = await getToken(ownerId);
  if (!token) {
    logger.warn({ ownerId, context: 'farmCreatedHandler' }, 'no FCM token — skipping push');
    return;
  }
  const tpl = getPushTemplate('sw', TOPIC, { farmId, county });
  if (!tpl) return;
  const status = await sendPush(token, tpl.title, tpl.body);
  await logDelivery({ eventType: TOPIC, farmerId: ownerId, channel: 'push', status });
  logger.info({ ownerId, farmId, status }, 'farmCreatedHandler done');
}
