import express from 'express';
import proxy from 'express-http-proxy';
import pino from 'pino';

const log = pino({ transport: { target: 'pino-pretty' } });

const PORT = Number(process.env['PORT'] ?? 3000);

// Service upstream map — ports match each service's .env PORT
// When running in Docker, service names are used; outside Docker, localhost
const AUTH         = process.env['AUTH_UPSTREAM']         ?? 'http://localhost:3008';
const FARM         = process.env['FARM_UPSTREAM']         ?? 'http://localhost:3001';
const SOIL         = process.env['SOIL_UPSTREAM']         ?? 'http://localhost:3002';
const FINANCE      = process.env['FINANCE_UPSTREAM']      ?? 'http://localhost:3003';
const MARKET       = process.env['MARKET_UPSTREAM']       ?? 'http://localhost:3004';
const COMMUNITY    = process.env['COMMUNITY_UPSTREAM']    ?? 'http://localhost:3005';
const GOVT         = process.env['GOVT_UPSTREAM']         ?? 'http://localhost:3006';
const NOTIFICATION = process.env['NOTIFICATION_UPSTREAM'] ?? 'http://localhost:3007';
const MEDIA        = process.env['MEDIA_UPSTREAM']        ?? 'http://localhost:3009';
const USSD         = process.env['USSD_UPSTREAM']         ?? 'http://localhost:3010';
const ADMIN        = process.env['ADMIN_UPSTREAM']        ?? 'http://localhost:3011';
const WEATHER      = process.env['WEATHER_UPSTREAM']      ?? 'http://localhost:8001';
const PREDICT      = process.env['PREDICT_UPSTREAM']      ?? 'http://localhost:8002';
const DIAGNOSE     = process.env['DIAGNOSE_UPSTREAM']     ?? 'http://localhost:3001';

const UPSTREAMS: Record<string, string> = {
  // auth-service (3008)
  auth:       AUTH,
  providers:  AUTH,
  // farm-service (3001) — also proxies /diagnose to diagnosis-service via gRPC internally
  farms:      FARM,
  plots:      FARM,
  activities: FARM,
  inputs:     FARM,
  harvests:   FARM,
  diagnose:   DIAGNOSE,
  // soil-service (3002)
  soil:       SOIL,
  // finance-service (3003)
  finance:    FINANCE,
  // market-service (3004)
  market:     MARKET,
  // community-service (3005)
  community:  COMMUNITY,
  // govt-service (3006)
  govt:       GOVT,
  // notification-service (3007) — internal only, but expose for admin
  notifications: NOTIFICATION,
  // media-service (3009)
  media:      MEDIA,
  // ussd-service (3010)
  ussd:       USSD,
  // admin-service (3011)
  admin:      ADMIN,
  // weather-service (8001)
  weather:    WEATHER,
  // predict-service (8002)
  predict:    PREDICT,
};

const app = express();

// CORS for mobile dev
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (_req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// Route /api/v1/:resource/* → correct upstream
app.use('/api/v1/:resource', (req, res, next) => {
  const resource = req.params['resource'];
  const upstream = UPSTREAMS[resource];

  if (!upstream) {
    res.status(502).json({ error: { message: `No upstream for resource: ${resource}` } });
    return;
  }

  log.info({ resource, upstream, path: req.path }, 'proxy');

  return proxy(upstream, {
    proxyReqPathResolver: (req) => req.originalUrl,
  })(req, res, next);
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

app.listen(PORT, () => log.info({ port: PORT }, 'api-gateway started'));
