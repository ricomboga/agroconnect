import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { mediaRouter } from './routes/mediaRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3009', 10);

app.use(pinoHttp({ logger }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'media-service' }));

app.use('/api/v1/media', mediaRouter);

app.use(errorHandler);

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'media-service started');
  });
}

export { app };
