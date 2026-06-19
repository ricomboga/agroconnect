import { logger } from '../logger.js';
import { GovtRegistrationSubmittedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'govt.registration.submitted';

export async function govtRegistrationSubmittedHandler(raw: unknown): Promise<void> {
  const result = GovtRegistrationSubmittedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'govtRegistrationSubmittedHandler' }, 'invalid payload');
    return;
  }
  const { registrationId, farmerId, farmName } = result.data;
  const token = await getToken(farmerId);
  if (!token) {
    logger.warn({ farmerId, context: 'govtRegistrationSubmittedHandler' }, 'no FCM token — skipping push');
    return;
  }
  const tpl = getPushTemplate('sw', TOPIC, { registrationId, farmName });
  if (!tpl) return;
  const status = await sendPush(token, tpl.title, tpl.body);
  await logDelivery({ eventType: TOPIC, farmerId, channel: 'push', status });
  logger.info({ farmerId, registrationId, status }, 'govtRegistrationSubmittedHandler done');
}
