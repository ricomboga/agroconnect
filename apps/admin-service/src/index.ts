import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { userRouter } from './routes/userRoutes.js';
import { moderationRouter } from './routes/moderationRoutes.js';
import { analyticsRouter } from './routes/analyticsRoutes.js';
import { reportsRouter } from './routes/reportsRoutes.js';
import { kycRouter } from './routes/kycRoutes.js';
import { farmsRouter } from './routes/farmsRoutes.js';
import { auditRouter } from './routes/auditRoutes.js';
import { programsRouter } from './routes/programsRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startConsumers } from './events/consumers/index.js';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3011', 10);

app.use(pinoHttp({ logger }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'admin-service' });
});

app.use('/api/v1/admin', userRouter);
app.use('/api/v1/admin', moderationRouter);
app.use('/api/v1/admin', analyticsRouter);
app.use('/api/v1/admin', reportsRouter);
app.use('/api/v1/admin', kycRouter);
app.use('/api/v1/admin', farmsRouter);
app.use('/api/v1/admin', auditRouter);
app.use('/api/v1/admin', programsRouter);

app.use(errorHandler);

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'admin-service started');
    startConsumers().catch((err) => {
      logger.error({ err, context: 'startup' }, 'Failed to start Kafka consumers');
    });
  });
}

export { app, logger };
