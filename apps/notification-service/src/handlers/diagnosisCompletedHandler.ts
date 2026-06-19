import { logger } from '../logger.js';
import { DiagnosisCompletedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'diagnosis.completed';

export async function diagnosisCompletedHandler(raw: unknown): Promise<void> {
  const result = DiagnosisCompletedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'diagnosisCompletedHandler' }, 'invalid payload');
    return;
  }
  const { diagnosisId, farmerId, diseaseName, severity } = result.data;
  const token = await getToken(farmerId);
  if (!token) {
    logger.warn({ farmerId, context: 'diagnosisCompletedHandler' }, 'no FCM token — skipping push');
    return;
  }
  const tpl = getPushTemplate('sw', TOPIC, { diagnosisId, diseaseName, severity: severity ?? '' });
  if (!tpl) return;
  const status = await sendPush(token, tpl.title, tpl.body);
  await logDelivery({ eventType: TOPIC, farmerId, channel: 'push', status });
  logger.info({ farmerId, diagnosisId, status }, 'diagnosisCompletedHandler done');
}
