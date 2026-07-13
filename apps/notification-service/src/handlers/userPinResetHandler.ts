import { logger } from '../logger.js';
import { UserPinResetPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { sendSms } from '../services/smsService.js';
import { logDelivery } from '../deliveryLogger.js';
import { recordNotification } from '../notificationRecorder.js';
import { getPushTemplate, getSmsTemplate } from '../templates/index.js';

const TOPIC = 'user.pin_reset';

// SMS isn't configured yet (no real Africa's Talking credentials) — until it is, the
// admin who triggered the reset gets an in-app notification (+ push) with the new PIN
// so they can share it with the farmer directly. The SMS attempt is still made so it
// starts working automatically once AT_API_KEY/AT_USERNAME are set.
export async function userPinResetHandler(raw: unknown): Promise<void> {
  const result = UserPinResetPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'userPinResetHandler' }, 'invalid payload');
    return;
  }
  const { userId, phone, fullName, newPin, resetByUserId } = result.data;
  const data = { userId, phone, fullName, newPin };

  const tpl = getPushTemplate('sw', TOPIC, data);
  if (tpl) {
    await recordNotification({ userId: resetByUserId, type: TOPIC, title: tpl.title, body: tpl.body });
    const token = await getToken(resetByUserId);
    if (token) {
      const status = await sendPush(token, tpl.title, tpl.body);
      await logDelivery({ eventType: TOPIC, farmerId: resetByUserId, channel: 'push', status });
    }
  }

  const smsText = getSmsTemplate('sw', TOPIC, data);
  if (smsText) {
    const status = await sendSms(phone, smsText);
    await logDelivery({ eventType: TOPIC, farmerId: userId, channel: 'sms', status });
  }

  logger.info({ userId, resetByUserId }, 'userPinResetHandler done');
}
