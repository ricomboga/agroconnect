import { logger } from '../logger.js';
import { CommunityPostCreatedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'community.post.created';

export async function communityPostCreatedHandler(raw: unknown): Promise<void> {
  const result = CommunityPostCreatedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'communityPostCreatedHandler' }, 'invalid payload');
    return;
  }
  const { postId, authorId, category, title } = result.data;
  const token = await getToken(authorId);
  if (!token) {
    logger.warn({ authorId, context: 'communityPostCreatedHandler' }, 'no FCM token — skipping push');
    return;
  }
  const tpl = getPushTemplate('sw', TOPIC, { postId, category, title });
  if (!tpl) return;
  const status = await sendPush(token, tpl.title, tpl.body);
  await logDelivery({ eventType: TOPIC, farmerId: authorId, channel: 'push', status });
  logger.info({ authorId, postId, status }, 'communityPostCreatedHandler done');
}
