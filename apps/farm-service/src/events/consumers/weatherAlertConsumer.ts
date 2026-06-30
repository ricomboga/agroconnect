import { createConsumer } from '@agroconnect/kafka';
import { prisma } from '@agroconnect/db/farm';
import { logger } from '../../logger.js';

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
const GROUP_ID = 'farm-service-consumer';

interface WeatherAlertPayload {
  county: string;
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  occurredAt: string;
}

export async function startWeatherAlertConsumer(): Promise<void> {
  const consumer = await createConsumer(BROKERS, GROUP_ID);
  await consumer.subscribe({ topic: 'weather.alert.issued', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value?.toString() ?? '{}') as WeatherAlertPayload;

        if (!payload.county || !payload.alertType) {
          logger.warn({ payload, context: 'weatherAlertConsumer' }, 'Missing required fields — skipping');
          return;
        }

        logger.info(
          { county: payload.county, alertType: payload.alertType, severity: payload.severity },
          'Processing weather.alert.issued',
        );

        // Only act on warning/critical — info alerts don't need to modify farm activities.
        if (payload.severity === 'info') return;

        const lookaheadDays = 3;
        const windowEnd = new Date();
        windowEnd.setDate(windowEnd.getDate() + lookaheadDays);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all farms in the affected county.
        const farms = await prisma.farm.findMany({
          where: { county: { equals: payload.county, mode: 'insensitive' }, deletedAt: null },
          select: { id: true },
        });

        if (farms.length === 0) return;

        const farmIds = farms.map((f) => f.id);

        // Append a weather advisory note to upcoming irrigation activities in those farms.
        const alertNote = `[Weather advisory — ${payload.alertType}]: ${payload.message}`;

        await prisma.activity.updateMany({
          where: {
            farmId: { in: farmIds },
            type: 'irrigation',
            status: 'pending',
            scheduledDate: { gte: today, lte: windowEnd },
          },
          data: {
            notes: alertNote,
          },
        });

        logger.info(
          { county: payload.county, farmCount: farms.length, alertType: payload.alertType },
          'Weather advisory appended to upcoming irrigation activities',
        );
      } catch (err) {
        logger.error({ err, context: 'weatherAlertConsumer' }, 'Failed to process weather.alert.issued');
        throw err;
      }
    },
  });
}
