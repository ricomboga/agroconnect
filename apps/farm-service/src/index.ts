import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { farmRouter } from './routes/farmRoutes.js';
import { plotRouter } from './routes/plotRoutes.js';
import { activityRouter } from './routes/activityRoutes.js';
import { inputRouter } from './routes/inputRoutes.js';
import { harvestRouter } from './routes/harvestRoutes.js';
import { internalStatsRouter } from './routes/internalStatsRoutes.js';
import { diagnoseRouter } from './routes/diagnoseRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startDiagnosisCompletedConsumer } from './events/consumers/diagnosisCompletedConsumer.js';
import { startLoanDisbursedConsumer } from './events/consumers/loanDisbursedConsumer.js';
import { startWeatherAlertConsumer } from './events/consumers/weatherAlertConsumer.js';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

app.use(pinoHttp({ logger }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'farm-service' }));

app.use('/api/v1/diagnose', diagnoseRouter);
app.use('/api/v1/farms', farmRouter);
app.use('/api/v1/farms/:farmId/plots', plotRouter);
app.use('/api/v1/farms/:farmId/activities', activityRouter);
app.use('/api/v1/farms/:farmId/inputs', inputRouter);
app.use('/api/v1/farms/:farmId/harvests', harvestRouter);
app.use('/internal/admin', internalStatsRouter);

app.use(errorHandler);

async function startConsumers(): Promise<void> {
  if (process.env['NODE_ENV'] === 'test') return;
  await Promise.all([
    startDiagnosisCompletedConsumer(),
    startLoanDisbursedConsumer(),
    startWeatherAlertConsumer(),
  ]);
}

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'farm-service started');
    startConsumers().catch((err) => {
      logger.error({ err }, 'Failed to start Kafka consumers');
    });
  });
}

export { app, logger };
