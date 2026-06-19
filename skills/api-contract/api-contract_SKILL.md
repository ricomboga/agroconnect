# Skill: API Contract

Read this file before creating or modifying any REST endpoint.
Reference: `@.claude/skills/api-contract/SKILL.md`

## Four-item checklist

Every endpoint must satisfy all four before the task is considered done:

- [ ] Zod schema (request body + query params)
- [ ] OpenAPI JSDoc annotation
- [ ] Jest tests (happy path + all sad paths)
- [ ] Postman collection entry updated

Do not mark a task complete if any item is unchecked.

## File structure per endpoint

```
src/
  schemas/
    createFarm.schema.ts      ← Zod schema
  controllers/
    farmController.ts         ← OpenAPI JSDoc here
  routes/
    farmRoutes.ts             ← Wire schema middleware + controller
tests/
  integration/
    farms.test.ts             ← Happy + sad path tests
```

## Zod schema pattern

```typescript
// src/schemas/createFarm.schema.ts
import { z } from 'zod';

export const createFarmSchema = z.object({
  name: z.string().min(2).max(100),
  locationLat: z.number().min(-90).max(90),
  locationLng: z.number().min(-180).max(180),
  county: z.string().min(1),
  areaAcres: z.number().positive(),
  soilType: z.enum(['clay','loam','sandy','silty','peaty','chalky']).optional(),
});

export type CreateFarmDto = z.infer<typeof createFarmSchema>;
```

Validation middleware (apply before every controller that reads req.body):
```typescript
// src/middleware/validate.ts
import { AnyZodObject } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: result.error.flatten().fieldErrors,
          request_id: req.id,
          timestamp: new Date().toISOString(),
        }
      });
    }
    req.body = result.data;
    next();
  };
```

## OpenAPI JSDoc annotation pattern

```typescript
/**
 * @openapi
 * /api/v1/farms:
 *   post:
 *     summary: Create a new farm
 *     tags: [Farms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateFarmDto'
 *     responses:
 *       201:
 *         description: Farm created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Farm'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Insufficient permissions
 */
export const createFarm = async (req: Request, res: Response) => {
```

## Test pattern (required test cases per endpoint)

```typescript
// tests/integration/farms.test.ts
describe('POST /api/v1/farms', () => {
  it('returns 201 with created farm when input is valid', async () => { ... });
  it('returns 400 with field errors when name is missing', async () => { ... });
  it('returns 400 with field errors when areaAcres is negative', async () => { ... });
  it('returns 401 when Authorization header is missing', async () => { ... });
  it('returns 403 when JWT role is not farmer', async () => { ... });
});

describe('GET /api/v1/farms/:farmId', () => {
  it('returns 200 with farm when farmId exists and belongs to user', async () => { ... });
  it('returns 404 when farmId does not exist', async () => { ... });
  it('returns 403 when farmId belongs to a different user', async () => { ... });
  it('returns 401 when JWT is missing', async () => { ... });
});
```

Minimum required tests per endpoint:
- 1 happy path (valid input, correct auth)
- 1 per validation rule that can fail
- 401 (no JWT)
- 403 (wrong role or wrong ownership)
- 404 (where applicable)

## HTTP status codes

| Situation | Status |
|---|---|
| POST that creates a resource | 201 |
| GET, PATCH success | 200 |
| DELETE success | 204 (no body) |
| Zod validation failed | 400 |
| Missing or invalid JWT | 401 |
| Valid JWT, wrong role or not the owner | 403 |
| Resource not found | 404 |
| Duplicate / conflict | 409 |
| Business logic violation (e.g. loan > credit limit) | 422 |
| Rate limited | 429 |
| Unexpected server error | 500 |

Never return 200 for an error. Never return 500 for a validation error.

## Standard error response shape

All error responses must use this exact shape:
```json
{
  "error": {
    "code": "FARM_NOT_FOUND",
    "message": "Farm not found",
    "details": null,
    "request_id": "req_abc123",
    "timestamp": "2025-06-01T10:30:00Z"
  }
}
```

`code` is SCREAMING_SNAKE, machine-readable, safe to switch on in the client.
`message` is human-readable, safe to display to the user.
`details` is used for validation errors — contains field-level error map.

## Route naming rules (from @docs/naming-conventions.md)

```
/api/v1/{domain}/{resource}[/{id}[/{sub-resource}]]
```

- Always plural: `/farms` not `/farm`
- Route params: camelCase with entity prefix — `:farmId` not `:id` not `:farm_id`
- Query params: snake_case — `page_size`, `from_date`, `sort_by`
- Max two nesting levels — flatten deeper paths

## Pagination (required on all list endpoints)

```typescript
// Query params
const page = parseInt(req.query.page as string) || 1;
const pageSize = Math.min(parseInt(req.query.page_size as string) || 20, 100);

// Prisma query
const [items, total] = await Promise.all([
  prisma.farm.findMany({ where, take: pageSize, skip: (page - 1) * pageSize }),
  prisma.farm.count({ where }),
]);

// Response
res.json({
  data: items,
  meta: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) }
});
```
