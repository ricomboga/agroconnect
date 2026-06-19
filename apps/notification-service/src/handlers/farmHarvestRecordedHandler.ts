import { logger } from '../logger.js';
import { FarmHarvestRecordedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'farm.harvest.recorded';

export async function farmHarvestRecordedHandler(raw: unknown): Promise<void> {
  const result = FarmHarvestRecordedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'farmHarvestRecordedHandler' }, 'invalid payload');
    return;
  }
  const { harvestId, farmId, ownerId, crop, quantityKg } = result.data;
  const token = await getToken(ownerId);
  if (!token) {
    logger.warn({ ownerId, context: 'farmHarvestRecordedHandler' }, 'no FCM token — skipping push');
    return;
  }
  const tpl = getPushTemplate('sw', TOPIC, { harvestId, farmId, crop, quantityKg: String(quantityKg) });
  if (!tpl) return;
  const status = await sendPush(token, tpl.title, tpl.body);
  await logDelivery({ eventType: TOPIC, farmerId: ownerId, channel: 'push', status });
  logger.info({ ownerId, harvestId, status }, 'farmHarvestRecordedHandler done');
}
