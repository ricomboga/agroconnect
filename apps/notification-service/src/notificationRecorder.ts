import { logger } from './logger.js';
import { createNotification } from './repositories/notificationRepository.js';

export interface RecordNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
}

export async function recordNotification(opts: RecordNotificationInput): Promise<void> {
  try {
    await createNotification(opts);
  } catch (err) {
    logger.error({ err, ...opts, context: 'notificationRecorder' }, 'Failed to persist in-app notification');
  }
}
