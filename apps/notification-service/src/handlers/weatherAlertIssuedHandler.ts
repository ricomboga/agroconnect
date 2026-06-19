import { logger } from '../logger.js';
import { WeatherAlertIssuedPayload } from '../types/index.js';
import { getPushTemplate } from '../templates/index.js';

// Weather alerts are broadcast — no per-user FCM token lookup.
// In production, a separate fan-out mechanism would query farmers by county.
// For now, we log the alert and rely on topic consumers with county-based filtering.
const TOPIC = 'weather.alert.issued';

export async function weatherAlertIssuedHandler(raw: unknown): Promise<void> {
  const result = WeatherAlertIssuedPayload.safeParse(raw);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), context: 'weatherAlertIssuedHandler' }, 'invalid payload');
    return;
  }
  const { alertId, county, severity, description } = result.data;
  const tpl = getPushTemplate('sw', TOPIC, { alertId, county, severity, description });
  if (!tpl) return;
  logger.info({ alertId, county, severity, title: tpl.title }, 'weatherAlertIssuedHandler: alert broadcast ready');
}
