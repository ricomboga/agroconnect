# AgroConnect — Environment Variables

Load this file when setting up a service or checking secret names: `@docs/environment.md`
All secrets come from HashiCorp Vault. Never commit values to git.

## All Node.js services
```
NODE_ENV            development|staging|production
SERVICE_NAME        e.g. farm-service
LOG_LEVEL           debug|info|warn|error
DATABASE_URL        postgresql://user:pass@host:5432/dbname
KAFKA_BROKERS       localhost:9092
REDIS_URL           redis://:password@localhost:6379
SENTRY_DSN          https://...
```

## auth-service
```
JWT_PRIVATE_KEY     RSA 4096-bit PEM private key (RS256)
JWT_PUBLIC_KEY      RSA PEM public key (shared with api-gateway)
JWT_ACCESS_TTL      900        (15 minutes)
JWT_REFRESH_TTL     2592000    (30 days)
```

## finance-service
```
MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET
MPESA_SHORTCODE
MPESA_PASSKEY
MPESA_CALLBACK_URL  https://api.agroconnect.africa/api/v1/finance/mpesa/callback
MPESA_ENV           sandbox|production
FARM_SERVICE_URL    http://localhost:3001  (used for credit scoring + farmer reports)
INTERNAL_SERVICE_SECRET  shared secret sent as x-service-token on internal, service-to-service calls (e.g. GET farm-service /internal/production/:farmerId)
```

## farm-service
```
INTERNAL_SERVICE_SECRET  shared secret checked on /internal/* routes (admin stats, production summary) — must match finance-service's value
MEDIA_SERVICE_URL   http://localhost:3010  (used for async farm PDF report generation)
```

## notification-service + ussd-service
```
AT_API_KEY          Africa's Talking API key
AT_USERNAME         Africa's Talking username
```

## media-service
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION          af-south-1
S3_BUCKET_NAME      agroconnect-media-prod
CDN_BASE_URL        https://media.agroconnect.africa
```

## weather-service + predict-service
```
OPENWEATHER_API_KEY
NASA_POWER_API_KEY
KMD_API_KEY
```

## diagnosis-service
```
MONGODB_URI
MODEL_SERVING_URL   http://tf-serving:8501
MODEL_VERSION       latest
MIN_CONFIDENCE      0.65
```

## All services: FCM
```
FCM_SERVER_KEY
```

## web (Next.js portal)
```
NEXT_PUBLIC_API_URL   Base URL of the API gateway — e.g. http://localhost:3000 (dev) or https://api.agroconnect.africa (prod)
```
