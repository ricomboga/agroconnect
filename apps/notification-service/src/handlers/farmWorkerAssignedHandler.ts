import { logger } from '../logger.js';
import { FarmWorkerAssignedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'farm.worker.assigned';

export async function farmWorkerAssignedHandler(raw: unknown): Promise<void> {
  const result = FarmWorkerAssignedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'farmWorkerAssignedHandler' }, 'invalid payload');
    return;
  }
  const { farmId, farmName, workerId, workerRole } = result.data;
  const token = await getToken(workerId);
  if (!token) {
    logger.warn({ workerId, context: 'farmWorkerAssignedHandler' }, 'no FCM token — skipping push');
    return;
  }
  const tpl = getPushTemplate('sw', TOPIC, { farmName, workerRole });
  if (!tpl) return;
  const status = await sendPush(token, tpl.title, tpl.body);
  await logDelivery({ eventType: TOPIC, farmerId: workerId, channel: 'push', status });
  logger.info({ workerId, farmId, status }, 'farmWorkerAssignedHandler done');
}
