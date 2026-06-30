import express from 'express';
import pinoHttp from 'pino-http';
import { config } from './config.js';
import { logger } from './logger.js';
import { connectDb, closeDb } from './db.js';
import { DiagnosisRepository } from './repositories/diagnosisRepository.js';
import { createDiagnosisRouter } from './routes/diagnosisRoutes.js';
import { createInternalRouter } from './routes/internalRoutes.js';
import { startDiagnosisConsumer, stopDiagnosisConsumer } from './events/consumer.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(pinoHttp({ logger }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'diagnosis-service', provider: config.inferenceProvider }));

async function bootstrap() {
  const db = await connectDb();
  const repo = new DiagnosisRepository(db);
  await repo.ensureIndexes();

  // Public routes (called by farm-service, which enforces its own auth)
  app.use('/api/v1', createDiagnosisRouter(repo));

  // Note: /diseases routes must come before /:id to avoid Express matching 'diseases' as an id.
  // The router in diagnosisRoutes.ts registers /diseases before /:id — order is preserved.

  // Internal routes (service-to-service only, no auth token needed)
  app.use('/internal', createInternalRouter(repo));

  app.use(errorHandler);

  if (config.nodeEnv !== 'test') {
    await startDiagnosisConsumer(repo);
  }

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, provider: config.inferenceProvider }, 'diagnosis-service started');
  });

  const shutdown = async () => {
    logger.info('shutting down');
    server.close();
    await stopDiagnosisConsumer();
    await closeDb();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start diagnosis-service');
  process.exit(1);
});

export { app };
