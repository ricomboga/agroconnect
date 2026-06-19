import express, { type Express } from 'express';
import { authRouter } from './routes/authRoutes.js';
import { internalAdminRouter } from './routes/internalAdminRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './logger.js';

const app: Express = express();
const PORT = parseInt(process.env['PORT'] ?? '3008', 10);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

app.use('/api/v1/auth', authRouter);
app.use('/internal/admin', internalAdminRouter);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'auth-service started');
});

export { app, logger };
