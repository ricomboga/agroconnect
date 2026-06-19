import { logger } from './logger.js';
import { insertDeliveryLog } from './repositories/deliveryLogRepository.js';

export interface DeliveryLogInput {
  eventType: string;
  farmerId: string;
  channel: 'push' | 'sms';
  status: 'sent' | 'failed';
  error?: string;
}

export async function logDelivery(opts: DeliveryLogInput): Promise<void> {
  try {
    await insertDeliveryLog(opts);
  } catch (err) {
    logger.error({ err, ...opts, context: 'deliveryLogger' }, 'Failed to persist delivery log');
  }
}
