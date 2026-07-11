# AgroConnect — Architecture

Reference: `@docs/architecture.md`

## Service catalogue

| Service | Language | Port | Protocol | Responsibility |
|---|---|---|---|---|
| api-gateway | Kong/Node.js | 3000 | HTTP/REST | Routing, auth validation, rate limiting, SSL termination |
| auth-service | Node.js | 3008 | REST + gRPC | User registration, JWT issuance, RBAC, session management |
| farm-service | Node.js | 3001 | REST + Kafka | Farm profiles, activity scheduling, harvest records, input tracking |
| diagnosis-service | Python | 8000 | gRPC + REST | AI disease detection, prescription generation, image processing |
| soil-service | Node.js | 3002 | REST + Kafka | Soil test records, fertility analysis, recommendation engine |
| finance-service | Node.js | 3003 | REST + Kafka | Loan applications, credit scoring, M-Pesa integration |
| market-service | Node.js | 3004 | REST + Kafka | Produce listings, supplier products, pricing, orders |
| community-service | Node.js | 3005 | REST + WebSocket | Forums, posts, replies, knowledge articles |
| govt-service | Node.js | 3006 | REST + Kafka | Farm registration, subsidy applications, eCitizen integration |
| weather-service | Python | 8001 | REST (internal) | Weather aggregation, hyperlocal forecasting |
| predict-service | Python | 8002 | REST (internal) | Price forecasting, yield estimation |
| notification-service | Node.js | 3007 | Kafka consumer + JWT | FCM push, SMS (Africa's Talking), USSD callbacks, in-app notification inbox (GET/PATCH /notifications) |
| media-service | Node.js | 3009 | REST | Image upload, S3 storage, CDN URL signing |
| ussd-service | Node.js | 3010 | HTTP webhook | Africa's Talking USSD menu, session state machine |
| admin-service | Node.js | 3011 | REST | Platform admin, moderation, analytics |

## Architecture decisions (binding — do not re-open)

**AD-001** Services own their databases exclusively. No cross-service DB reads. All cross-domain access via REST API or Kafka events.

**AD-002** gRPC only between farm-service (caller) and diagnosis-service (server). All other inter-service calls use REST.

**AD-003** Kafka for all events that fan out to multiple consumers. Never call multiple services directly.

**AD-004** Prisma ORM for all Node.js DB access. Raw SQL only inside migration files.

**AD-005** Zod validates every incoming request before controller logic runs.

**AD-006** WatermelonDB for all structured data on mobile. AsyncStorage only for simple key-value (e.g. language setting).

**AD-007** All images stored via media-service only. No other service holds S3 credentials.

**AD-008** Swahili (`sw`) is the default language. All user-facing strings use i18n keys — no hardcoded strings anywhere.

**AD-009** M-Pesa STK Push only. No QR or Express Checkout in Phase 1–2.

**AD-010** TypeScript strict mode. `any` type banned via ESLint `no-explicit-any: error`.

**AD-011** JWT RS256 (RSA 4096-bit). HS256 is forbidden.

**AD-012** Turborepo for monorepo task orchestration.

## Kafka topic registry

| Topic | Producer | Consumers | Retention |
|---|---|---|---|
| farm.created | farm-service | notification-service, govt-service | 7 days |
| farm.activity.completed | farm-service | notification-service | 7 days |
| farm.harvest.recorded | farm-service | notification-service, predict-service | 30 days |
| diagnosis.submitted | farm-service | diagnosis-service | 7 days |
| diagnosis.completed | diagnosis-service | notification-service, farm-service | 30 days |
| finance.loan.applied | finance-service | notification-service, admin-service | 365 days |
| finance.loan.disbursed | finance-service | notification-service, farm-service | 365 days |
| finance.payment.confirmed | finance-service | notification-service, market-service | 365 days |
| finance.payment.failed | finance-service | notification-service | 30 days |
| market.listing.created | market-service | notification-service, predict-service | 14 days |
| market.order.placed | market-service | notification-service, finance-service | 365 days |
| market.order.updated | market-service | notification-service | 365 days |
| govt.registration.submitted | govt-service | notification-service, admin-service | 30 days |
| weather.alert.issued | weather-service | notification-service, farm-service | 7 days |
| community.post.created | community-service | notification-service, admin-service | 7 days |
| user.registered | auth-service | notification-service, farm-service | 30 days |
| notification.send | any service | notification-service | 3 days |
| dead_letter | any service | admin-service | 90 days |

## API gateway route map

| Path prefix | Upstream | Auth required |
|---|---|---|
| /api/v1/auth/* | auth-service:3008 | No (except /me) |
| /api/v1/farms/* | farm-service:3001 | JWT |
| /api/v1/diagnose/* | farm-service:3001 (proxies to diagnosis-service via gRPC) | JWT |
| /api/v1/finance/* | finance-service:3003 | JWT |
| /api/v1/market/* | market-service:3004 | JWT (write), public (read) |
| /api/v1/community/* | community-service:3005 | JWT (write), public (read) |
| /api/v1/govt/* | govt-service:3006 | JWT |
| /api/v1/weather/* | weather-service:8001 | JWT |
| /api/v1/predict/* | predict-service:8002 | JWT |
| /api/v1/media/* | media-service:3009 | JWT |
| /api/v1/admin/* | admin-service:3011 | JWT (admin role only) |
| /ussd | ussd-service:3010 | None (AT signature validation) |

## Database ownership

| Service | Engine | Database name |
|---|---|---|
| auth-service | PostgreSQL | auth_db |
| farm-service | PostgreSQL | farm_db |
| diagnosis-service | MongoDB | diagnosis_db |
| soil-service | PostgreSQL | soil_db |
| finance-service | PostgreSQL | finance_db |
| market-service | PostgreSQL + Elasticsearch | market_db |
| community-service | PostgreSQL | community_db |
| govt-service | PostgreSQL | govt_db |
| weather-service | Redis (cache) + PostgreSQL (history) | weather_db |
| predict-service | PostgreSQL | predict_db |
| notification-service | PostgreSQL | notification_db |

## Per-service folder structure (Node.js)

```
apps/{service}/
  src/
    index.ts          — Express app bootstrap
    routes/           — Route definitions (thin)
    controllers/      — Request parsing, response shaping
    services/         — Business logic (no HTTP concerns)
    repositories/     — Prisma queries (no business logic)
    events/
      producers/      — Kafka publish functions
      consumers/      — Kafka subscription handlers
    middleware/       — Auth, validation, error handling
    schemas/          — Zod request/response schemas
    types/            — Service-specific TypeScript types
    utils/            — Pure helpers (no side effects)
  prisma/
    schema.prisma
    migrations/       — Never hand-edit
  tests/
    unit/
    integration/
  Dockerfile
  package.json
  tsconfig.json
```
