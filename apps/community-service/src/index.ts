import http from 'node:http';
import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { threadRouter } from './routes/threadRoutes.js';
import { standaloneReplyRouter } from './routes/replyRoutes.js';
import { internalModerationRouter } from './routes/internalModerationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initIo } from './socket.js';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3005', 10);

app.use(pinoHttp({ logger }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'community-service' }));

app.use('/api/v1/community/threads', threadRouter);
app.use('/api/v1/community/replies', standaloneReplyRouter);
app.use('/internal/admin', internalModerationRouter);

app.use(errorHandler);

const httpServer = http.createServer(app);

if (process.env['NODE_ENV'] !== 'test') {
  initIo(httpServer);
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, 'community-service started');
  });
}

export { app, httpServer, logger };
