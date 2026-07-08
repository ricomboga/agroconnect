import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { listingRouter } from './routes/listingRoutes.js';
import { productRouter } from './routes/productRoutes.js';
import { orderRouter } from './routes/orderRoutes.js';
import { priceRouter } from './routes/priceRoutes.js';
import { supplierRouter } from './routes/supplierRoutes.js';
import { supplierProfileRouter, internalSupplierProfileRouter } from './routes/supplierProfileRoutes.js';
import { internalStatsRouter } from './routes/internalStatsRoutes.js';
import { internalProductSearchRouter } from './routes/internalProductSearchRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startPaymentConfirmedConsumer } from './events/consumers/paymentConfirmedConsumer.js';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3004', 10);

app.use(pinoHttp({ logger }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'market-service' }));

app.use('/api/v1/market/listings', listingRouter);
app.use('/api/v1/market/products', productRouter);
app.use('/api/v1/market/orders', orderRouter);
app.use('/api/v1/market/prices', priceRouter);
app.use('/api/v1/market/suppliers', supplierRouter);
app.use('/api/v1/market/supplier-profiles', supplierProfileRouter);
app.use('/internal/admin', internalStatsRouter);
app.use('/internal/products', internalProductSearchRouter);
app.use('/internal/supplier-profiles', internalSupplierProfileRouter);

app.use(errorHandler);

async function startConsumers(): Promise<void> {
  if (process.env['NODE_ENV'] === 'test') return;
  await startPaymentConfirmedConsumer();
}

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'market-service started');
    startConsumers().catch((err) => {
      logger.error({ err, context: 'startup' }, 'Failed to start Kafka consumers');
    });
  });
}

export { app };
