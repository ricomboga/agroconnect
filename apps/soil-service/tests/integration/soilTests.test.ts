/**
 * Integration tests for soil-service.
 * Runs against a real PostgreSQL test database.
 * Auth middleware and market-service fetch are mocked.
 */

const DB_UNAVAILABLE = process.env['SOIL_TEST_DB_UNAVAILABLE'] === '1';
const d = DB_UNAVAILABLE ? describe.skip : describe;
if (DB_UNAVAILABLE) {
  test.skip('Skipping integration tests: SOIL_DATABASE_URL is not reachable', () => {});
}

let shouldRejectAuth = false;
const mockUser = { id: 'farmer-001', role: 'farmer' };

jest.mock('@agroconnect/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('@agroconnect/shared');
  return {
    ...actual,
    authenticate: (req: any, res: any, next: any) => {
      if (shouldRejectAuth) {
        return res.status(401).json({
          error_code: 'UNAUTHORIZED',
          message_key: 'error.unauthorized',
          request_id: req.headers['x-request-id'] ?? '',
          timestamp: new Date().toISOString(),
        });
      }
      req.user = { id: mockUser.id, role: mockUser.role };
      next();
    },
  };
});

import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '@agroconnect/db/soil';

const FARM_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_FARM_ID = '00000000-0000-0000-0000-000000000002';

const SOIL_TEST_PAYLOAD = {
  testedAt: '2025-03-15',
  ph: 6.5,
  nitrogenPpm: 25,
  phosphorusPpm: 18,
  potassiumPpm: 150,
  organicMatterPct: 3.2,
  labName: 'Nairobi Soil Lab',
};

async function createTestRecord(overrides: Record<string, unknown> = {}) {
  return prisma.soilTest.create({
    data: {
      farmId: FARM_ID,
      farmerId: 'farmer-001',
      testedAt: new Date('2025-03-15'),
      ph: 6.5,
      ...overrides,
    },
  });
}

async function clearAll() {
  await prisma.soilTest.deleteMany();
}

beforeAll(async () => {
  if (DB_UNAVAILABLE) return;
  await clearAll();
});

afterAll(async () => {
  if (DB_UNAVAILABLE) return;
  await clearAll();
  await prisma.$disconnect();
});

afterEach(() => {
  shouldRejectAuth = false;
  mockUser.id = 'farmer-001';
  mockUser.role = 'farmer';
  jest.restoreAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /health
// ═════════════════════════════════════════════════════════════════════════════
d('GET /health', () => {
  it('returns 200 with service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('soil-service');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/v1/farms/:farmId/soil-tests
// ═════════════════════════════════════════════════════════════════════════════
d('POST /api/v1/farms/:farmId/soil-tests', () => {
  afterEach(async () => { await prisma.soilTest.deleteMany(); });

  it('creates a soil test and returns 201', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${FARM_ID}/soil-tests`)
      .send(SOIL_TEST_PAYLOAD);
    expect(res.status).toBe(201);
    expect(res.body.data.farmId).toBe(FARM_ID);
    expect(res.body.data.farmerId).toBe('farmer-001');
    expect(res.body.data.id).toBeDefined();
    expect(Number(res.body.data.ph)).toBeCloseTo(6.5);
  });

  it('returns 400 when ph is missing', async () => {
    const { ph: _ph, ...rest } = SOIL_TEST_PAYLOAD;
    const res = await request(app)
      .post(`/api/v1/farms/${FARM_ID}/soil-tests`)
      .send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when testedAt is missing', async () => {
    const { testedAt: _t, ...rest } = SOIL_TEST_PAYLOAD;
    const res = await request(app)
      .post(`/api/v1/farms/${FARM_ID}/soil-tests`)
      .send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when ph is out of range', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${FARM_ID}/soil-tests`)
      .send({ ...SOIL_TEST_PAYLOAD, ph: 15 });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when testedAt is not a valid date', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${FARM_ID}/soil-tests`)
      .send({ ...SOIL_TEST_PAYLOAD, testedAt: 'yesterday' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when nitrogenPpm is negative', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${FARM_ID}/soil-tests`)
      .send({ ...SOIL_TEST_PAYLOAD, nitrogenPpm: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app)
      .post(`/api/v1/farms/${FARM_ID}/soil-tests`)
      .send(SOIL_TEST_PAYLOAD);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/v1/farms/:farmId/soil-tests
// ═════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/farms/:farmId/soil-tests', () => {
  beforeEach(async () => {
    await createTestRecord();
    // Another farmer's test on same farm (should not appear for farmer-001)
    await createTestRecord({ farmerId: 'farmer-002' });
    // Test for a different farm entirely
    await createTestRecord({ farmId: OTHER_FARM_ID });
  });
  afterEach(async () => { await prisma.soilTest.deleteMany(); });

  it('returns 200 with tests scoped to the authenticated farmer', async () => {
    const res = await request(app).get(`/api/v1/farms/${FARM_ID}/soil-tests`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].farmerId).toBe('farmer-001');
    expect(res.body.meta.total).toBe(1);
  });

  it('admin sees all tests for the farm across farmers', async () => {
    mockUser.id = 'admin-001';
    mockUser.role = 'admin';
    const res = await request(app).get(`/api/v1/farms/${FARM_ID}/soil-tests`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('returns empty list for a farm with no matching tests', async () => {
    const res = await request(app).get(
      '/api/v1/farms/00000000-0000-0000-0000-000000000099/soil-tests',
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta.total).toBe(0);
  });

  it('includes trend in meta (null when only 1 test)', async () => {
    const res = await request(app).get(`/api/v1/farms/${FARM_ID}/soil-tests`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toHaveProperty('trend');
    expect(res.body.meta.trend).toHaveProperty('ph');
  });

  it('respects page and page_size params', async () => {
    const res = await request(app).get(
      `/api/v1/farms/${FARM_ID}/soil-tests?page=1&page_size=1`,
    );
    expect(res.status).toBe(200);
    expect(res.body.meta.page_size).toBe(1);
  });

  it('returns 400 for invalid page_size', async () => {
    const res = await request(app).get(
      `/api/v1/farms/${FARM_ID}/soil-tests?page_size=200`,
    );
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get(`/api/v1/farms/${FARM_ID}/soil-tests`);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/v1/farms/:farmId/soil-tests/recommendation
// ═════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/farms/:farmId/soil-tests/recommendation', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
    } as Response);
  });

  afterEach(async () => { await prisma.soilTest.deleteMany(); });

  it('returns 404 SOIL_TEST_NOT_FOUND when no tests exist', async () => {
    const res = await request(app).get(
      `/api/v1/farms/${FARM_ID}/soil-tests/recommendation`,
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('SOIL_TEST_NOT_FOUND');
  });

  it('returns 200 with recommendations based on latest test', async () => {
    await createTestRecord({ ph: 4.5, nitrogenPpm: 10 });
    const res = await request(app).get(
      `/api/v1/farms/${FARM_ID}/soil-tests/recommendation`,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.based_on_test_id).toBeDefined();
    expect(res.body.meta.tested_at).toBeDefined();
  });

  it('includes pH recommendation when pH is low', async () => {
    await createTestRecord({ ph: 4.5 });
    const res = await request(app).get(
      `/api/v1/farms/${FARM_ID}/soil-tests/recommendation`,
    );
    expect(res.status).toBe(200);
    const phRec = res.body.data.find((r: { nutrient: string }) => r.nutrient === 'pH');
    expect(phRec).toBeDefined();
    expect(phRec.status).toBe('low');
    expect(phRec.product_name).toBe('Agricultural Lime');
  });

  it('supplier_product_id is null when market lookup fails', async () => {
    await createTestRecord({ ph: 4.5 });
    const res = await request(app).get(
      `/api/v1/farms/${FARM_ID}/soil-tests/recommendation`,
    );
    const phRec = res.body.data.find((r: { nutrient: string }) => r.nutrient === 'pH');
    expect(phRec?.supplier_product_id).toBeNull();
  });

  it('supplier_product_id is populated when market lookup succeeds', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'market-product-uuid' }] }),
    } as Response);

    await createTestRecord({ ph: 4.5 });
    const res = await request(app).get(
      `/api/v1/farms/${FARM_ID}/soil-tests/recommendation`,
    );
    const phRec = res.body.data.find((r: { nutrient: string }) => r.nutrient === 'pH');
    expect(phRec?.supplier_product_id).toBe('market-product-uuid');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get(
      `/api/v1/farms/${FARM_ID}/soil-tests/recommendation`,
    );
    expect(res.status).toBe(401);
  });

  it('shows pH as optimal when pH is in range', async () => {
    await createTestRecord({ ph: 6.8 });
    const res = await request(app).get(
      `/api/v1/farms/${FARM_ID}/soil-tests/recommendation`,
    );
    expect(res.status).toBe(200);
    const phRec = res.body.data.find((r: { nutrient: string }) => r.nutrient === 'pH');
    expect(phRec?.status).toBe('optimal');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Trend: improving across two tests
// ═════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/farms/:farmId/soil-tests — trend calculation', () => {
  afterEach(async () => { await prisma.soilTest.deleteMany(); });

  it('returns improving when pH moves closer to optimal centre', async () => {
    await createTestRecord({ testedAt: new Date('2025-01-01'), ph: 4.5 });
    await createTestRecord({ testedAt: new Date('2025-03-01'), ph: 5.8 });

    const res = await request(app).get(`/api/v1/farms/${FARM_ID}/soil-tests`);
    expect(res.status).toBe(200);
    expect(res.body.meta.trend.ph).toBe('improving');
  });

  it('returns declining when pH moves away from optimal centre', async () => {
    await createTestRecord({ testedAt: new Date('2025-01-01'), ph: 6.8 });
    await createTestRecord({ testedAt: new Date('2025-03-01'), ph: 8.5 });

    const res = await request(app).get(`/api/v1/farms/${FARM_ID}/soil-tests`);
    expect(res.status).toBe(200);
    expect(res.body.meta.trend.ph).toBe('declining');
  });
});
