import { logger } from '../logger.js';
import { MarketOrderPlacedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'market.order.placed';

export async function marketOrderPlacedHandler(raw: unknown): Promise<void> {
  const result = MarketOrderPlacedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'marketOrderPlacedHandler' }, 'invalid payload');
    return;
  }
  const { orderId, buyerId, sellerId, cropType, totalKes } = result.data;
  const data = { orderId, cropType, totalKes: String(totalKes) };

  // Notify seller of new order
  const sellerToken = await getToken(sellerId);
  if (sellerToken) {
    const tpl = getPushTemplate('sw', TOPIC, data);
    if (tpl) {
      const status = await sendPush(sellerToken, tpl.title, tpl.body);
      await logDelivery({ eventType: TOPIC, farmerId: sellerId, channel: 'push', status });
    }
  } else {
    logger.warn({ sellerId, context: 'marketOrderPlacedHandler' }, 'no FCM token for seller — skipping push');
  }

  // Notify buyer their order was placed
  const buyerToken = await getToken(buyerId);
  if (buyerToken) {
    const tpl = getPushTemplate('sw', TOPIC, data);
    if (tpl) {
      const status = await sendPush(buyerToken, tpl.title, tpl.body);
      await logDelivery({ eventType: TOPIC, farmerId: buyerId, channel: 'push', status });
    }
  }

  logger.info({ orderId, sellerId, buyerId }, 'marketOrderPlacedHandler done');
}
