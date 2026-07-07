import { logger } from '../logger.js';
import { CommunityArticleCreatedPayload } from '../types/index.js';
import { getAllTokens } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'community.article.created';

export async function communityArticleCreatedHandler(raw: unknown): Promise<void> {
  const result = CommunityArticleCreatedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'communityArticleCreatedHandler' }, 'invalid payload');
    return;
  }
  const { articleId, title, type } = result.data;

  const tpl = getPushTemplate('sw', TOPIC, { title, type });
  if (!tpl) return;

  const recipients = await getAllTokens();
  for (const { userId, token } of recipients) {
    const status = await sendPush(token, tpl.title, tpl.body);
    await logDelivery({ eventType: TOPIC, farmerId: userId, channel: 'push', status });
  }

  logger.info({ articleId, type, recipientCount: recipients.length }, 'communityArticleCreatedHandler done');
}
