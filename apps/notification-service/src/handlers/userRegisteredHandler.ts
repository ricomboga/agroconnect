import { logger } from '../logger.js';
import { UserRegisteredPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'user.registered';

export async function userRegisteredHandler(raw: unknown): Promise<void> {
  const result = UserRegisteredPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'userRegisteredHandler' }, 'invalid payload');
    return;
  }
  const { userId, fullName, county } = result.data;
  const token = await getToken(userId);
  if (!token) {
    logger.warn({ userId, context: 'userRegisteredHandler' }, 'no FCM token — skipping push');
    return;
  }
  const tpl = getPushTemplate('sw', TOPIC, { userId, fullName, county: county ?? '' });
  if (!tpl) return;
  const status = await sendPush(token, tpl.title, tpl.body);
  await logDelivery({ eventType: TOPIC, farmerId: userId, channel: 'push', status });
  logger.info({ userId, status }, 'userRegisteredHandler done');
}
