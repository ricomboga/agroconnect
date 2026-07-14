import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { creditRouter } from './routes/creditRoutes.js';
import { loanRouter } from './routes/loanRoutes.js';
import { mpesaRouter } from './routes/mpesaRoutes.js';
import { partnerRouter } from './routes/partnerRoutes.js';
import { productsRouter } from './routes/productsRoutes.js';
import { transactionRouter } from './routes/transactionRoutes.js';
import { reportRouter } from './routes/reportRoutes.js';
import { internalStatsRouter } from './routes/internalStatsRoutes.js';
import { lenderRouter } from './routes/lenderRoutes.js';
import { farmerLenderRouter } from './routes/farmerLenderRoutes.js';
import { adminLenderRouter } from './routes/adminLenderRoutes.js';
import { adminFarmerRouter } from './routes/adminFarmerRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startCollectionPaidConsumer } from './events/consumers/collectionPaidConsumer.js';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3003', 10);

app.use(pinoHttp({ logger }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'finance-service' }));

app.use('/api/v1/finance/credit-score', creditRouter);
app.use('/api/v1/finance/loans', loanRouter);
app.use('/api/v1/finance/mpesa', mpesaRouter);
app.use('/api/v1/finance/partners', partnerRouter);
app.use('/api/v1/finance/products', productsRouter);
app.use('/api/v1/finance/transactions', transactionRouter);
app.use('/api/v1/finance/reports', reportRouter);
app.use('/api/v1/finance/lender', lenderRouter);
app.use('/api/v1/finance/farmers', farmerLenderRouter);
app.use('/api/v1/finance/admin', adminLenderRouter);
app.use('/api/v1/finance/admin', adminFarmerRouter);
app.use('/internal/admin', internalStatsRouter);

app.use(errorHandler);

async function startConsumers(): Promise<void> {
  if (process.env['NODE_ENV'] === 'test') return;
  await Promise.all([startCollectionPaidConsumer()]);
}

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'finance-service started');
    startConsumers().catch((err) => {
      logger.error({ err }, 'Failed to start Kafka consumers');
    });
  });
}

export { app, logger };
