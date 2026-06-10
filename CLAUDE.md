# AgroConnect

Integrated smart farming platform for smallholder and commercial farmers in Kenya.
Mobile-first, offline-tolerant, Swahili default.

## Stack

- **Mobile:** React Native (Expo 51), WatermelonDB, Zustand, React Query, Tamagui, i18next
- **Backend:** Node.js 20 + TypeScript strict, Express 4, Prisma 5, Pino, Zod
- **ML services:** Python 3.11, FastAPI, TensorFlow, Pydantic v2, Pytest
- **Data:** PostgreSQL 16, MongoDB 7, Redis 7.2, Kafka 3.6
- **Infra:** Docker Compose (Phase 1–2 on Contabo VPS), AWS EKS af-south-1 (Phase 3+)
- **Payments:** M-Pesa Daraja API 2.0 (STK Push only)
- **USSD:** Africa's Talking (182-char limit per menu page — always check before deploy)

## Monorepo layout

```
apps/             # 15 services — see docs/architecture.md for full service catalogue
  mobile/         # React Native app
  web/            # Next.js admin + web portal
  {service}/      # Each service has its own CLAUDE.md with service-specific rules
packages/
  db/             # Shared Prisma schemas
  shared/         # Shared TS types, enums, DTOs
  kafka/          # Kafka producer/consumer factory
skills/           # SKILL.md files — read before the relevant task (see below)
docs/             # Architecture decisions, schemas, API contracts — reference with @docs/
```

## Commands

```bash
# Dev (all services)
docker compose -f infra/docker-compose.dev.yml up

# Test a single service
cd apps/farm-service && pnpm test

# Run full CI locally
pnpm turbo run lint test build

# Seed database
pnpm --filter db seed

# Generate Prisma client after schema change
pnpm --filter db generate
```

## Non-negotiable rules

1. **No cross-service DB access.** All cross-domain data goes through REST APIs or Kafka events.
   Services own their databases exclusively. See `docs/architecture.md` AD-001.

2. **No `any` type.** TypeScript strict mode. ESLint `no-explicit-any: error` is enforced in CI.

3. **Zod validates every request.** No controller logic runs before the Zod schema passes.

4. **Kafka for multi-consumer events.** Never call multiple services directly when one event
   should fan out. Publish to the topic; let consumers subscribe.

5. **Migrations need review.** Run `prisma migrate dev` on staging only. Never `migrate deploy`
   on production without reading `skills/db-migration/SKILL.md` first.

6. **Pino for all logging.** No `console.log`. Every log is structured JSON with `context` field.

7. **All user-facing strings are i18n keys.** No hardcoded strings in components or API responses.
   Base locale: `sw` (Swahili). Fallback: `en`.

8. **Images go through media-service.** No other service holds S3 credentials or uploads directly.

9. **USSD responses ≤ 182 characters.** Run the length check before any USSD menu change.

10. **Secrets only from env vars.** `process.env.VARIABLE_NAME`. Nothing hardcoded. Ever.

## Read before starting each task type

| Task | Skill file to read first |
|---|---|
| Deploy to Contabo VPS | `skills/deployment/SKILL.md` |
| Any Prisma migration | `skills/db-migration/SKILL.md` |
| New or modified endpoint | `skills/api-contract/SKILL.md` |
| New React Native screen | `skills/mobile-screen/SKILL.md` |
| Retrain disease model | `skills/ml-retrain/SKILL.md` |

## Reference docs (load on demand with @docs/filename)

- `@docs/architecture.md` — all 15 services, ports, Kafka topics, architecture decisions
- `@docs/schemas.md` — full Prisma schemas for all 8 domains
- `@docs/api-contracts.md` — all REST endpoints, request/response shapes
- `@docs/naming-conventions.md` — files, functions, routes, DB columns, Kafka topics
- `@docs/forbidden-patterns.md` — banned patterns with before/after code examples
- `@docs/environment.md` — all required env vars per service
- `@docs/disease-taxonomy.md` — 30 crop disease codes used by diagnosis-service
