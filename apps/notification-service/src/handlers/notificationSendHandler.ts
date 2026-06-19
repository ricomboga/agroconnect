import { logger } from '../logger.js';
import { NotificationSendPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { sendSms } from '../services/smsService.js';
import { logDelivery } from '../deliveryLogger.js';

const TOPIC = 'notification.send';

export async function notificationSendHandler(raw: unknown): Promise<void> {
  const result = NotificationSendPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'notificationSendHandler' }, 'invalid payload');
    return;
  }
  const { userId, title, body, channel, phone, fcmToken } = result.data;

  if (channel === 'sms') {
    if (!phone) {
      logger.warn({ userId, context: 'notificationSendHandler' }, 'SMS channel requested but no phone provided');
      return;
    }
    const status = await sendSms(phone, body);
    await logDelivery({ eventType: TOPIC, farmerId: userId, channel: 'sms', status });
    logger.info({ userId, status }, 'notificationSendHandler SMS done');
    return;
  }

  const token = fcmToken ?? (await getToken(userId));
  if (!token) {
    logger.warn({ userId, context: 'notificationSendHandler' }, 'no FCM token — skipping push');
    return;
  }
  const status = await sendPush(token, title, body);
  await logDelivery({ eventType: TOPIC, farmerId: userId, channel: 'push', status });
  logger.info({ userId, status }, 'notificationSendHandler push done');
}
