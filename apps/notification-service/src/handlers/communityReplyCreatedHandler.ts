import { logger } from '../logger.js';
import { CommunityReplyCreatedPayload } from '../types/index.js';
import { getToken } from '../services/tokenService.js';
import { sendPush } from '../services/fcmService.js';
import { logDelivery } from '../deliveryLogger.js';
import { recordNotification } from '../notificationRecorder.js';
import { getPushTemplate } from '../templates/index.js';

const TOPIC = 'community.reply.created';

export async function communityReplyCreatedHandler(raw: unknown): Promise<void> {
  const result = CommunityReplyCreatedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'communityReplyCreatedHandler' }, 'invalid payload');
    return;
  }

  const { threadId, threadTitle, threadAuthorId, replierName } = result.data;

  const tpl = getPushTemplate('sw', TOPIC, { threadTitle, replierName, threadId });
  if (!tpl) return;
  await recordNotification({ userId: threadAuthorId, type: TOPIC, title: tpl.title, body: tpl.body });

  const token = await getToken(threadAuthorId);
  if (!token) {
    logger.warn({ threadAuthorId, context: 'communityReplyCreatedHandler' }, 'no FCM token — skipping push');
    return;
  }

  const status = await sendPush(token, tpl.title, tpl.body);
  await logDelivery({ eventType: TOPIC, farmerId: threadAuthorId, channel: 'push', status });
  logger.info({ threadAuthorId, threadId, status }, 'communityReplyCreatedHandler done');
}
