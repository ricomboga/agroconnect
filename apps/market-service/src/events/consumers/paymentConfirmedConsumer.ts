import { createConsumer } from '@agroconnect/kafka';
import { logger } from '../../logger.js';
import * as orderRepo from '../../repositories/orderRepository.js';
import { publishOrderUpdated } from '../producers/orderUpdatedProducer.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
const GROUP_ID = 'market-service-consumer';

export async function startPaymentConfirmedConsumer(): Promise<void> {
  const consumer = await createConsumer(BROKERS, GROUP_ID);
  await consumer.subscribe({ topic: 'finance.payment.confirmed', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value?.toString() ?? '{}') as Record<string, unknown>;
        const orderId = payload['orderId'] as string | undefined;
        if (!orderId) return;

        const order = await orderRepo.findOrderById(orderId);
        if (!order || order.status !== 'pending') return;

        await orderRepo.updateOrderStatus(orderId, 'confirmed');
        await publishOrderUpdated(orderId, 'confirmed', order.supplierId);

        logger.info({ orderId, context: 'paymentConfirmedConsumer' }, 'Order auto-confirmed on payment');
      } catch (err) {
        logger.error({ err, context: 'paymentConfirmedConsumer' }, 'Failed to process finance.payment.confirmed');
        throw err;
      }
    },
  });
}
