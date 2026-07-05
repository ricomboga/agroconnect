import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { registrationRouter } from './routes/registrationRoutes.js';
import { subsidyRouter } from './routes/subsidyRoutes.js';
import { licenseRouter } from './routes/licenseRoutes.js';
import { documentRouter } from './routes/documentRoutes.js';
import { reportRouter } from './routes/reportRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startFarmCreatedConsumer } from './events/consumers/farmCreatedConsumer.js';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3006', 10);

app.use(pinoHttp({ logger }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'govt-service' }));

app.use('/api/v1/govt/registrations', registrationRouter);
app.use('/api/v1/govt/subsidies', subsidyRouter);
app.use('/api/v1/govt/licenses', licenseRouter);
app.use('/api/v1/govt/documents', documentRouter);
app.use('/api/v1/govt/reports', reportRouter);

app.use(errorHandler);

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'govt-service started');
    startFarmCreatedConsumer().catch((err) => {
      logger.error({ err, context: 'startup' }, 'Failed to start Kafka consumers');
    });
  });
}

export { app, logger };
