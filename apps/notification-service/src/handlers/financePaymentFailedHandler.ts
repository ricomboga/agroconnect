import { logger } from '../logger.js';
import { FinancePaymentFailedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { sendSms } from '../services/smsService.js';
import { logDelivery } from '../deliveryLogger.js';
import { recordNotification } from '../notificationRecorder.js';
import { getPushTemplate, getSmsTemplate } from '../templates/index.js';

const TOPIC = 'finance.payment.failed';

export async function financePaymentFailedHandler(raw: unknown): Promise<void> {
  const result = FinancePaymentFailedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'financePaymentFailedHandler' }, 'invalid payload');
    return;
  }
  const { paymentId, farmerId, amountKes, phone, reason } = result.data;
  const data = { paymentId, amountKes: String(amountKes), reason: reason ?? '' };
  const tpl = getPushTemplate('sw', TOPIC, data);
  if (tpl) {
    await recordNotification({ userId: farmerId, type: TOPIC, title: tpl.title, body: tpl.body });
  }

  const token = await getToken(farmerId);
  if (token) {
    if (tpl) {
      const status = await sendPush(token, tpl.title, tpl.body);
      await logDelivery({ eventType: TOPIC, farmerId, channel: 'push', status });
    }
  } else {
    logger.warn({ farmerId, context: 'financePaymentFailedHandler' }, 'no FCM token — skipping push');
  }

  const smsText = getSmsTemplate('sw', TOPIC, data);
  if (smsText) {
    const status = await sendSms(phone, smsText);
    await logDelivery({ eventType: TOPIC, farmerId, channel: 'sms', status });
  }

  logger.info({ farmerId, paymentId }, 'financePaymentFailedHandler done');
}
