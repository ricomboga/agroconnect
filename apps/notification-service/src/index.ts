import { logger } from './logger.js';
import { startConsumers } from './consumers/index.js';
import { Consumer } from '@agroconnect/kafka';

async function main(): Promise<void> {
  let consumer: Consumer | undefined;

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down notification-service');
    await consumer?.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());

  consumer = await startConsumers();
  logger.info({ service: 'notification-service' }, 'notification-service started');
}

void main();
