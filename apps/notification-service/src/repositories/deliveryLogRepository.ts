import { prisma } from '@agroconnect/db/notification';

export interface InsertDeliveryLogInput {
  eventType: string;
  farmerId: string;
  channel: 'push' | 'sms';
  status: 'sent' | 'failed';
  error?: string;
}

export async function insertDeliveryLog(data: InsertDeliveryLogInput): Promise<void> {
  await prisma.deliveryLog.create({
    data: {
      eventType: data.eventType,
      farmerId: data.farmerId,
      channel: data.channel,
      status: data.status,
      error: data.error,
    },
  });
}
