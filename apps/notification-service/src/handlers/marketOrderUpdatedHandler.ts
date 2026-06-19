import { logger } from '../logger.js';
import { MarketOrderUpdatedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'market.order.updated';

export async function marketOrderUpdatedHandler(raw: unknown): Promise<void> {
  const result = MarketOrderUpdatedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'marketOrderUpdatedHandler' }, 'invalid payload');
    return;
  }
  const { orderId, buyerId, status } = result.data;
  const token = await getToken(buyerId);
  if (!token) {
    logger.warn({ buyerId, context: 'marketOrderUpdatedHandler' }, 'no FCM token — skipping push');
    return;
  }
  const tpl = getPushTemplate('sw', TOPIC, { orderId, status });
  if (!tpl) return;
  const pushStatus = await sendPush(token, tpl.title, tpl.body);
  await logDelivery({ eventType: TOPIC, farmerId: buyerId, channel: 'push', status: pushStatus });
  logger.info({ buyerId, orderId, status }, 'marketOrderUpdatedHandler done');
}
