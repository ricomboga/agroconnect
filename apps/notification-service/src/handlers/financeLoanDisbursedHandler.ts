import { logger } from '../logger.js';
import { FinanceLoanDisbursedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { sendSms } from '../services/smsService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate, getSmsTemplate } from '../templates/index.js';

const TOPIC = 'finance.loan.disbursed';

export async function financeLoanDisbursedHandler(raw: unknown): Promise<void> {
  const result = FinanceLoanDisbursedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'financeLoanDisbursedHandler' }, 'invalid payload');
    return;
  }
  const { loanId, farmerId, amountKes, phone } = result.data;
  const data = { loanId, amountKes: String(amountKes) };

  const token = await getToken(farmerId);
  if (token) {
    const tpl = getPushTemplate('sw', TOPIC, data);
    if (tpl) {
      const status = await sendPush(token, tpl.title, tpl.body);
      await logDelivery({ eventType: TOPIC, farmerId, channel: 'push', status });
    }
  } else {
    logger.warn({ farmerId, context: 'financeLoanDisbursedHandler' }, 'no FCM token — skipping push');
  }

  const smsText = getSmsTemplate('sw', TOPIC, data);
  if (smsText) {
    const status = await sendSms(phone, smsText);
    await logDelivery({ eventType: TOPIC, farmerId, channel: 'sms', status });
  }

  logger.info({ farmerId, loanId }, 'financeLoanDisbursedHandler done');
}
