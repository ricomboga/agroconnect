# AgroConnect — Forbidden Patterns

Load this file when you need to check or enforce code quality rules: `@docs/forbidden-patterns.md`

## ❌ Cross-service database access
```typescript
// BANNED
import { financeDb } from '../../../finance-service/prisma';

// CORRECT
const loan = await financeServiceClient.get(`/finance/loans?farmId=${farmId}`);
```

## ❌ The `any` type
```typescript
// BANNED
function processFarm(data: any) { ... }

// CORRECT
function processFarm(data: CreateFarmDto) { ... }
```

## ❌ Hardcoded user-facing strings
```typescript
// BANNED
return res.json({ message: 'Farm created successfully' });

// CORRECT
return res.json({ message_key: 'farm.created.success' });
```

## ❌ Raw SQL in service code
```typescript
// BANNED
await prisma.$queryRaw`SELECT * FROM farms WHERE owner_id = ${userId}`;

// CORRECT
await prisma.farm.findMany({ where: { ownerId: userId } });
```

## ❌ Unbounded Prisma queries
```typescript
// BANNED
await prisma.farm.findMany();

// CORRECT
await prisma.farm.findMany({ where: { ownerId: userId }, take: pageSize, skip: offset });
```

## ❌ Silent catch blocks
```typescript
// BANNED
try { await doSomething(); } catch (e) {}

// CORRECT
try { await doSomething(); } catch (err) {
  logger.error({ err, context: 'doSomething' });
  throw err;
}
```

## ❌ Unhandled promise rejections
```typescript
// BANNED
kafkaProducer.send(message); // fire and forget

// CORRECT
await kafkaProducer.send(message);
```

## ❌ console.log in service code
```typescript
// BANNED — use pino logger
console.log('Farm created:', farm);

// CORRECT
logger.info({ farmId: farm.id }, 'Farm created');
```

## ❌ Direct S3 uploads outside media-service
```typescript
// BANNED in any service other than media-service
import AWS from 'aws-sdk';
const s3 = new AWS.S3();
await s3.upload(...).promise();

// CORRECT
const { url } = await mediaServiceClient.uploadImage(imageBuffer, 'farm-photo');
```

## ❌ Secrets hardcoded
```typescript
// BANNED (git-secrets pre-commit hook will catch this)
const MPESA_SECRET = 'abc123xyz';

// CORRECT
const MPESA_SECRET = process.env.MPESA_CONSUMER_SECRET!;
```

## ❌ Synchronous file I/O
```typescript
// BANNED
const data = fs.readFileSync('config.json', 'utf8');

// CORRECT
const data = await fs.promises.readFile('config.json', 'utf8');
```

## ❌ Migrations without review
```bash
# BANNED on production without following db-migration SKILL.md
npx prisma migrate deploy

# CORRECT: read skills/db-migration/SKILL.md first, every time
```
