# AgroConnect — Naming Conventions

Load this file when creating files, functions, routes, or DB columns: `@docs/naming-conventions.md`

## Files
| Context | Convention | Example |
|---|---|---|
| Service directories | kebab-case | `farm-service`, `auth-service` |
| TS source files | camelCase.ts | `farmService.ts`, `loanRepository.ts` |
| TS test files | camelCase.test.ts | `farmService.test.ts` |
| Python files | snake_case.py | `inference_service.py` |
| RN screens | PascalCase.tsx | `FarmProfileScreen.tsx` |
| RN components | PascalCase.tsx | `DiagnosisResultCard.tsx` |
| Zod schemas | camelCase.schema.ts | `createFarm.schema.ts` |

## TypeScript
```typescript
interface FarmProfile { ... }                      // PascalCase, no I-prefix
type CreditBand = 'A' | 'B' | 'C' | 'ineligible'; // PascalCase
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;      // SCREAMING_SNAKE constants
async function createFarm(dto: CreateFarmDto) {}    // camelCase, verb-first
const createFarmSchema = z.object({ ... });         // schema suffix on Zod objects
```

## API Routes
```
/api/v1/{domain}/{resource}[/{id}[/{sub-resource}]]

GET    /api/v1/farms
POST   /api/v1/farms
GET    /api/v1/farms/:farmId          ← param = camelCase with entity prefix
GET    /api/v1/farms/:farmId/activities
PATCH  /api/v1/farms/:farmId/activities/:activityId
```
- Always plural resource names
- Query params: `snake_case` (`page_size`, `sort_by`, `from_date`)
- Max two nesting levels — flatten deeper paths

## Kafka
```
Topics:          {domain}.{entity}.{past-tense-verb}
                 farm.activity.completed
                 finance.loan.disbursed

Event classes:   {Entity}{Verb}Event
                 ActivityCompletedEvent, LoanDisbursedEvent

Consumer groups: {service-name}-consumer
                 farm-service-consumer
```

## Database
```sql
Tables:   snake_case plural        farm_plots, loan_applications
Columns:  snake_case               created_at, owner_id, quantity_kg
FKs:      {table_singular}_id      farm_id, user_id
Indexes:  idx_{table}_{columns}    idx_activities_farm_id_scheduled_date
```

## React Native
```typescript
FarmProfileScreen    // screens end in Screen
useFarmRecords       // hooks start with use
AuthContext          // contexts end in Context or Provider
FarmStackParamList   // nav param lists end in ParamList
```
