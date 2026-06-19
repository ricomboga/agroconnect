import express from 'express';
import { pinoHttp } from 'pino-http';
import { ussdRouter } from './routes/ussdRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { redis } from './lib/redis.js';
import { logger } from './logger.js';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3010', 10);

app.use(pinoHttp({ logger }));
// Africa's Talking sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ussd-service' });
});

app.post('/ussd', ussdRouter);

app.use(errorHandler);

async function start(): Promise<void> {
  await redis.connect();
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'ussd-service started');
  });
}

start().catch((err: Error) => {
  logger.error({ err }, 'Failed to start ussd-service');
  process.exit(1);
});

export { app };
