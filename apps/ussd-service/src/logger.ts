import pino from 'pino';

export const logger = pino({
  name: process.env['SERVICE_NAME'] ?? 'ussd-service',
  level: process.env['LOG_LEVEL'] ?? 'info',
});
