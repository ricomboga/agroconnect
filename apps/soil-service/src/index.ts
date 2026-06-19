import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { soilTestRouter } from './routes/soilTestRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3009', 10);

app.use(pinoHttp({ logger }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'soil-service' }));

app.use('/api/v1/farms/:farmId/soil-tests', soilTestRouter);

app.use(errorHandler);

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'soil-service started');
  });
}

export { app, logger };
