import { logger } from '../logger.js';
import { UserRegisteredPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { sendSms } from '../services/smsService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate, getSmsTemplate } from '../templates/index.js';

const TOPIC = 'user.registered';

export async function userRegisteredHandler(raw: unknown): Promise<void> {
  const result = UserRegisteredPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'userRegisteredHandler' }, 'invalid payload');
    return;
  }
  const { userId, phone, fullName, county } = result.data;
  const data = { userId, fullName, county: county ?? '' };

  const token = await getToken(userId);
  if (token) {
    const tpl = getPushTemplate('sw', TOPIC, data);
    if (tpl) {
      const status = await sendPush(token, tpl.title, tpl.body);
      await logDelivery({ eventType: TOPIC, farmerId: userId, channel: 'push', status });
    }
  } else {
    logger.warn({ userId, context: 'userRegisteredHandler' }, 'no FCM token — skipping push');
  }

  const smsText = getSmsTemplate('sw', TOPIC, data);
  if (smsText) {
    const status = await sendSms(phone, smsText);
    await logDelivery({ eventType: TOPIC, farmerId: userId, channel: 'sms', status });
  }

  logger.info({ userId }, 'userRegisteredHandler done');
}
