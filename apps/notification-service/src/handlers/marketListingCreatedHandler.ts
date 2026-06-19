import { logger } from '../logger.js';
import { MarketListingCreatedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'market.listing.created';

export async function marketListingCreatedHandler(raw: unknown): Promise<void> {
  const result = MarketListingCreatedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'marketListingCreatedHandler' }, 'invalid payload');
    return;
  }
  const { listingId, sellerId, cropType, pricePerKg } = result.data;
  const token = await getToken(sellerId);
  if (!token) {
    logger.warn({ sellerId, context: 'marketListingCreatedHandler' }, 'no FCM token — skipping push');
    return;
  }
  const tpl = getPushTemplate('sw', TOPIC, { listingId, cropType, pricePerKg: String(pricePerKg) });
  if (!tpl) return;
  const status = await sendPush(token, tpl.title, tpl.body);
  await logDelivery({ eventType: TOPIC, farmerId: sellerId, channel: 'push', status });
  logger.info({ sellerId, listingId, status }, 'marketListingCreatedHandler done');
}
