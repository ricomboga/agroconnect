import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { startConsumers } from './consumers/index.js';
import { notificationRouter } from './routes/notificationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { Consumer } from '@agroconnect/kafka';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3007', 10);

app.use(pinoHttp({ logger }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification-service' }));

app.use('/api/v1/notifications', notificationRouter);

app.use(errorHandler);

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

  if (process.env['NODE_ENV'] !== 'test') {
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'notification-service HTTP API started');
    });
  }

  logger.info({ service: 'notification-service' }, 'notification-service started');
}

void main();

export { app, logger };
