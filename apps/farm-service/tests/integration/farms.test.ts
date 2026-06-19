/**
 * Integration tests for farm-service.
 * Runs against a real PostgreSQL test database.
 * Kafka producers and auth middleware are mocked.
 */

const DB_UNAVAILABLE = process.env['FARM_TEST_DB_UNAVAILABLE'] === '1';
const d = DB_UNAVAILABLE ? describe.skip : describe;
if (DB_UNAVAILABLE) {
  test.skip('Skipping integration tests: database not available', () => {});
}

// ─── Auth control (read lazily inside authenticate closure, so let/const work) ────
let shouldRejectAuth = false;
const mockUser = { id: 'farmer-001', role: 'farmer' };

// ─── Mocks (hoisted by ts-jest before imports) ────────────────────────────────
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

jest.mock('../../src/events/producers/farmCreatedProducer', () => ({
  publishFarmCreated: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/events/producers/harvestRecordedProducer', () => ({
  publishHarvestRecorded: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/events/producers/activityCompletedProducer', () => ({
  publishActivityCompleted: jest.fn().mockResolvedValue(undefined),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '@agroconnect/db/farm';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FARM_PAYLOAD = {
  name: 'Sunrise Farm',
  locationLat: -1.2921,
  locationLng: 36.8219,
  county: 'Nairobi',
  areaAcres: 5.5,
  soilType: 'loam',
  waterSource: 'rain',
};

async function createTestFarm(ownerId = 'farmer-001') {
  return prisma.farm.create({
    data: {
      ownerId,
      name: 'Test Farm',
      locationLat: -1.3,
      locationLng: 36.8,
      county: 'Kiambu',
      areaAcres: 3,
      status: 'active',
    },
  });
}

async function clearAll() {
  await prisma.harvest.deleteMany();
  await prisma.input.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.farmPlot.deleteMany();
  await prisma.farm.deleteMany();
}

// ─── Global setup ─────────────────────────────────────────────────────────────
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
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/v1/farms
// ═════════════════════════════════════════════════════════════════════════════
d('POST /api/v1/farms', () => {
  afterEach(async () => { await prisma.farm.deleteMany(); });

  it('creates a farm and returns 201', async () => {
    const res = await request(app).post('/api/v1/farms').send(FARM_PAYLOAD);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Sunrise Farm',
      county: 'Nairobi',
      ownerId: 'farmer-001',
    });
    expect(res.body.data.id).toBeDefined();
  });

  it('publishes farm.created Kafka event', async () => {
    const { publishFarmCreated } = jest.requireMock(
      '../../src/events/producers/farmCreatedProducer',
    );
    (publishFarmCreated as jest.Mock).mockClear();
    await request(app).post('/api/v1/farms').send(FARM_PAYLOAD);
    expect(publishFarmCreated).toHaveBeenCalledTimes(1);
    expect(publishFarmCreated).toHaveBeenCalledWith(
      expect.any(String),
      'farmer-001',
      'Nairobi',
    );
  });

  it('returns 400 when name is missing', async () => {
    const { name: _name, ...rest } = FARM_PAYLOAD;
    const res = await request(app).post('/api/v1/farms').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
    expect(res.body.details).toBeDefined();
  });

  it('returns 400 when areaAcres is not positive', async () => {
    const res = await request(app)
      .post('/api/v1/farms')
      .send({ ...FARM_PAYLOAD, areaAcres: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when locationLat is out of range', async () => {
    const res = await request(app)
      .post('/api/v1/farms')
      .send({ ...FARM_PAYLOAD, locationLat: 95 });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when locationLng is out of range', async () => {
    const res = await request(app)
      .post('/api/v1/farms')
      .send({ ...FARM_PAYLOAD, locationLng: 200 });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when soilType is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/farms')
      .send({ ...FARM_PAYLOAD, soilType: 'gravel' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when waterSource is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/farms')
      .send({ ...FARM_PAYLOAD, waterSource: 'ocean' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).post('/api/v1/farms').send(FARM_PAYLOAD);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/v1/farms
// ═════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/farms', () => {
  beforeEach(async () => {
    await createTestFarm('farmer-001');
    // Another farmer's farm (should not appear in farmer-001's list)
    await createTestFarm('farmer-002');
  });
  afterEach(async () => { await prisma.farm.deleteMany(); });

  it('returns 200 with paginated farms for the authenticated farmer', async () => {
    const res = await request(app).get('/api/v1/farms');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // farmer-001 should only see their own farm
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].ownerId).toBe('farmer-001');
    expect(res.body.meta).toMatchObject({ total: 1, page: 1 });
  });

  it('admin sees all farms', async () => {
    mockUser.id = 'admin-001';
    mockUser.role = 'admin';
    const res = await request(app).get('/api/v1/farms');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('respects page and page_size params', async () => {
    const res = await request(app).get('/api/v1/farms?page=1&page_size=1');
    expect(res.status).toBe(200);
    expect(res.body.meta.page_size).toBe(1);
  });

  it('returns 400 when page is not a number', async () => {
    const res = await request(app).get('/api/v1/farms?page=abc');
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when page_size exceeds maximum', async () => {
    const res = await request(app).get('/api/v1/farms?page_size=101');
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get('/api/v1/farms');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/v1/farms/:farmId
// ═════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/farms/:farmId', () => {
  let farmId: string;

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
  });
  afterEach(async () => { await prisma.farm.deleteMany(); });

  it('returns 200 with farm data', async () => {
    const res = await request(app).get(`/api/v1/farms/${farmId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(farmId);
    expect(res.body.data.ownerId).toBe('farmer-001');
  });

  it('returns 404 for non-existent farm', async () => {
    const res = await request(app).get(
      '/api/v1/farms/00000000-0000-0000-0000-000000000000',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 404 when another farmer tries to access the farm', async () => {
    mockUser.id = 'farmer-002';
    const res = await request(app).get(`/api/v1/farms/${farmId}`);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('admin can access any farm', async () => {
    mockUser.id = 'admin-001';
    mockUser.role = 'admin';
    const res = await request(app).get(`/api/v1/farms/${farmId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(farmId);
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get(`/api/v1/farms/${farmId}`);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/farms/:farmId
// ═════════════════════════════════════════════════════════════════════════════
d('PATCH /api/v1/farms/:farmId', () => {
  let farmId: string;

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
  });
  afterEach(async () => { await prisma.farm.deleteMany(); });

  it('updates the farm and returns 200', async () => {
    const res = await request(app)
      .patch(`/api/v1/farms/${farmId}`)
      .send({ name: 'Updated Farm', status: 'fallow' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Farm');
    expect(res.body.data.status).toBe('fallow');
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .patch(`/api/v1/farms/${farmId}`)
      .send({ status: 'burned' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for out-of-range areaAcres', async () => {
    const res = await request(app)
      .patch(`/api/v1/farms/${farmId}`)
      .send({ areaAcres: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for non-existent farm', async () => {
    const res = await request(app)
      .patch('/api/v1/farms/00000000-0000-0000-0000-000000000000')
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 404 when another farmer tries to update', async () => {
    mockUser.id = 'farmer-002';
    const res = await request(app)
      .patch(`/api/v1/farms/${farmId}`)
      .send({ name: 'Hijack' });
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app)
      .patch(`/api/v1/farms/${farmId}`)
      .send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /api/v1/farms/:farmId
// ═════════════════════════════════════════════════════════════════════════════
d('DELETE /api/v1/farms/:farmId', () => {
  let farmId: string;

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
  });
  afterEach(async () => { await prisma.farm.deleteMany(); });

  it('deletes the farm and returns 204', async () => {
    const res = await request(app).delete(`/api/v1/farms/${farmId}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('returns 404 for non-existent farm', async () => {
    const res = await request(app).delete(
      '/api/v1/farms/00000000-0000-0000-0000-000000000000',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 404 when another farmer tries to delete', async () => {
    mockUser.id = 'farmer-002';
    const res = await request(app).delete(`/api/v1/farms/${farmId}`);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).delete(`/api/v1/farms/${farmId}`);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/v1/farms/:farmId/report
// ═════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/farms/:farmId/report', () => {
  let farmId: string;

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
    // Mock the media-service HTTP call so no real server is needed
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://media.test/report.pdf' }),
    } as Response);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.farm.deleteMany();
  });

  it('returns report data (200 or 202)', async () => {
    const res = await request(app).get(`/api/v1/farms/${farmId}/report`);
    expect([200, 202]).toContain(res.status);
    expect(res.body.data).toBeDefined();
  });

  it('returns 404 for non-existent farm', async () => {
    const res = await request(app).get(
      '/api/v1/farms/00000000-0000-0000-0000-000000000000/report',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 404 for another farmer\'s farm', async () => {
    mockUser.id = 'farmer-002';
    const res = await request(app).get(`/api/v1/farms/${farmId}/report`);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get(`/api/v1/farms/${farmId}/report`);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/v1/farms/:farmId/summary
// ═════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/farms/:farmId/summary', () => {
  let farmId: string;

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
  });
  afterEach(async () => { await prisma.farm.deleteMany(); });

  it('returns summary data', async () => {
    const res = await request(app).get(`/api/v1/farms/${farmId}/summary`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('accepts from_date and to_date filters', async () => {
    const res = await request(app).get(
      `/api/v1/farms/${farmId}/summary?from_date=2024-01-01&to_date=2024-12-31`,
    );
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid date format', async () => {
    const res = await request(app).get(
      `/api/v1/farms/${farmId}/summary?from_date=not-a-date`,
    );
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for non-existent farm', async () => {
    const res = await request(app).get(
      '/api/v1/farms/00000000-0000-0000-0000-000000000000/summary',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get(`/api/v1/farms/${farmId}/summary`);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/v1/farms/:farmId/plots
// ═════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/farms/:farmId/plots', () => {
  let farmId: string;

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
    await prisma.farmPlot.create({
      data: { farmId, name: 'Plot A', areaAcres: 1.5 },
    });
  });
  afterEach(async () => {
    await prisma.farmPlot.deleteMany();
    await prisma.farm.deleteMany();
  });

  it('returns 200 with plots list', async () => {
    const res = await request(app).get(`/api/v1/farms/${farmId}/plots`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('returns 404 when farm does not exist', async () => {
    const res = await request(app).get(
      '/api/v1/farms/00000000-0000-0000-0000-000000000000/plots',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 404 when another farmer accesses the plots', async () => {
    mockUser.id = 'farmer-002';
    const res = await request(app).get(`/api/v1/farms/${farmId}/plots`);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get(`/api/v1/farms/${farmId}/plots`);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/v1/farms/:farmId/plots
// ═════════════════════════════════════════════════════════════════════════════
d('POST /api/v1/farms/:farmId/plots', () => {
  let farmId: string;
  const PLOT_PAYLOAD = { name: 'North Field', areaAcres: 2.0 };

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
  });
  afterEach(async () => {
    await prisma.farmPlot.deleteMany();
    await prisma.farm.deleteMany();
  });

  it('creates a plot and returns 201', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/plots`)
      .send(PLOT_PAYLOAD);
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('North Field');
    expect(res.body.data.farmId).toBe(farmId);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/plots`)
      .send({ areaAcres: 2.0 });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when areaAcres is zero', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/plots`)
      .send({ name: 'X', areaAcres: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when farm does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/farms/00000000-0000-0000-0000-000000000000/plots')
      .send(PLOT_PAYLOAD);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 404 when another farmer tries to add a plot', async () => {
    mockUser.id = 'farmer-002';
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/plots`)
      .send(PLOT_PAYLOAD);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/plots`)
      .send(PLOT_PAYLOAD);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/v1/farms/:farmId/activities
// ═════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/farms/:farmId/activities', () => {
  let farmId: string;

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
    await prisma.activity.create({
      data: {
        farmId,
        type: 'planting',
        title: 'Plant maize',
        scheduledDate: new Date('2024-03-01'),
        status: 'pending',
      },
    });
  });
  afterEach(async () => {
    await prisma.activity.deleteMany();
    await prisma.farm.deleteMany();
  });

  it('returns 200 with activities list', async () => {
    const res = await request(app).get(`/api/v1/farms/${farmId}/activities`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].type).toBe('planting');
  });

  it('filters by status', async () => {
    const res = await request(app).get(
      `/api/v1/farms/${farmId}/activities?status=completed`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('filters by date range', async () => {
    const res = await request(app).get(
      `/api/v1/farms/${farmId}/activities?from_date=2024-01-01&to_date=2024-12-31`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('returns 404 when farm does not exist', async () => {
    const res = await request(app).get(
      '/api/v1/farms/00000000-0000-0000-0000-000000000000/activities',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get(`/api/v1/farms/${farmId}/activities`);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/v1/farms/:farmId/activities
// ═════════════════════════════════════════════════════════════════════════════
d('POST /api/v1/farms/:farmId/activities', () => {
  let farmId: string;
  const ACTIVITY_PAYLOAD = {
    type: 'planting',
    title: 'Plant maize',
    scheduledDate: '2024-04-01',
    labourCostKes: 500,
  };

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
  });
  afterEach(async () => {
    await prisma.activity.deleteMany();
    await prisma.farm.deleteMany();
  });

  it('schedules an activity and returns 201', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/activities`)
      .send(ACTIVITY_PAYLOAD);
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('planting');
    expect(res.body.data.title).toBe('Plant maize');
  });

  it('returns 400 when type is invalid', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/activities`)
      .send({ ...ACTIVITY_PAYLOAD, type: 'gardening' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when title is missing', async () => {
    const { title: _t, ...rest } = ACTIVITY_PAYLOAD;
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/activities`)
      .send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when scheduledDate is not a valid date', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/activities`)
      .send({ ...ACTIVITY_PAYLOAD, scheduledDate: 'tomorrow' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when farm does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/farms/00000000-0000-0000-0000-000000000000/activities')
      .send(ACTIVITY_PAYLOAD);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 404 when another farmer posts activities', async () => {
    mockUser.id = 'farmer-002';
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/activities`)
      .send(ACTIVITY_PAYLOAD);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/activities`)
      .send(ACTIVITY_PAYLOAD);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/farms/:farmId/activities/:activityId
// ═════════════════════════════════════════════════════════════════════════════
d('PATCH /api/v1/farms/:farmId/activities/:activityId', () => {
  let farmId: string;
  let activityId: string;

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
    const activity = await prisma.activity.create({
      data: {
        farmId,
        type: 'irrigation',
        title: 'Water the crops',
        scheduledDate: new Date('2024-05-01'),
        status: 'pending',
      },
    });
    activityId = activity.id;
  });
  afterEach(async () => {
    await prisma.activity.deleteMany();
    await prisma.farm.deleteMany();
  });

  it('updates an activity and returns 200', async () => {
    const res = await request(app)
      .patch(`/api/v1/farms/${farmId}/activities/${activityId}`)
      .send({ status: 'completed', completedDate: '2024-05-01' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('publishes activityCompleted event when status becomes completed', async () => {
    const { publishActivityCompleted } = jest.requireMock(
      '../../src/events/producers/activityCompletedProducer',
    );
    (publishActivityCompleted as jest.Mock).mockClear();
    await request(app)
      .patch(`/api/v1/farms/${farmId}/activities/${activityId}`)
      .send({ status: 'completed', completedDate: '2024-05-01' });
    expect(publishActivityCompleted).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .patch(`/api/v1/farms/${farmId}/activities/${activityId}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid completedDate', async () => {
    const res = await request(app)
      .patch(`/api/v1/farms/${farmId}/activities/${activityId}`)
      .send({ completedDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when activity does not exist', async () => {
    const res = await request(app)
      .patch(
        `/api/v1/farms/${farmId}/activities/00000000-0000-0000-0000-000000000000`,
      )
      .send({ status: 'skipped' });
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('ACTIVITY_NOT_FOUND');
  });

  it('returns 404 when farm does not exist', async () => {
    const res = await request(app)
      .patch(
        `/api/v1/farms/00000000-0000-0000-0000-000000000000/activities/${activityId}`,
      )
      .send({ status: 'skipped' });
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app)
      .patch(`/api/v1/farms/${farmId}/activities/${activityId}`)
      .send({ status: 'skipped' });
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/v1/farms/:farmId/inputs
// ═════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/farms/:farmId/inputs', () => {
  let farmId: string;

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
    await prisma.input.create({
      data: {
        farmId,
        type: 'seed',
        productName: 'Maize Hybrid',
        quantity: 10,
        unit: 'kg',
        unitCostKes: 150,
        totalCostKes: 1500,
        appliedDate: new Date('2024-03-01'),
      },
    });
  });
  afterEach(async () => {
    await prisma.input.deleteMany();
    await prisma.farm.deleteMany();
  });

  it('returns 200 with inputs list', async () => {
    const res = await request(app).get(`/api/v1/farms/${farmId}/inputs`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].productName).toBe('Maize Hybrid');
  });

  it('returns 404 when farm does not exist', async () => {
    const res = await request(app).get(
      '/api/v1/farms/00000000-0000-0000-0000-000000000000/inputs',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 404 when another farmer accesses inputs', async () => {
    mockUser.id = 'farmer-002';
    const res = await request(app).get(`/api/v1/farms/${farmId}/inputs`);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get(`/api/v1/farms/${farmId}/inputs`);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/v1/farms/:farmId/inputs
// ═════════════════════════════════════════════════════════════════════════════
d('POST /api/v1/farms/:farmId/inputs', () => {
  let farmId: string;
  const INPUT_PAYLOAD = {
    type: 'fertiliser',
    productName: 'DAP Fertiliser',
    quantity: 50,
    unit: 'kg',
    unitCostKes: 80,
    totalCostKes: 4000,
    appliedDate: '2024-04-15',
  };

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
  });
  afterEach(async () => {
    await prisma.input.deleteMany();
    await prisma.farm.deleteMany();
  });

  it('records an input and returns 201', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/inputs`)
      .send(INPUT_PAYLOAD);
    expect(res.status).toBe(201);
    expect(res.body.data.productName).toBe('DAP Fertiliser');
    expect(res.body.data.farmId).toBe(farmId);
  });

  it('returns 400 when type is invalid', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/inputs`)
      .send({ ...INPUT_PAYLOAD, type: 'magic_dust' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when productName is missing', async () => {
    const { productName: _p, ...rest } = INPUT_PAYLOAD;
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/inputs`)
      .send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when quantity is not positive', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/inputs`)
      .send({ ...INPUT_PAYLOAD, quantity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when appliedDate is invalid', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/inputs`)
      .send({ ...INPUT_PAYLOAD, appliedDate: 'yesterday' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when farm does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/farms/00000000-0000-0000-0000-000000000000/inputs')
      .send(INPUT_PAYLOAD);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 404 when another farmer tries to add an input', async () => {
    mockUser.id = 'farmer-002';
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/inputs`)
      .send(INPUT_PAYLOAD);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/inputs`)
      .send(INPUT_PAYLOAD);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/v1/farms/:farmId/harvests
// ═════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/farms/:farmId/harvests', () => {
  let farmId: string;

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
    await prisma.harvest.create({
      data: {
        farmId,
        crop: 'Maize',
        quantityKg: 200,
        harvestDate: new Date('2024-07-01'),
        soldQuantityKg: 0,
      },
    });
  });
  afterEach(async () => {
    await prisma.harvest.deleteMany();
    await prisma.farm.deleteMany();
  });

  it('returns 200 with harvests list', async () => {
    const res = await request(app).get(`/api/v1/farms/${farmId}/harvests`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].crop).toBe('Maize');
  });

  it('returns 404 when farm does not exist', async () => {
    const res = await request(app).get(
      '/api/v1/farms/00000000-0000-0000-0000-000000000000/harvests',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 404 when another farmer accesses harvests', async () => {
    mockUser.id = 'farmer-002';
    const res = await request(app).get(`/api/v1/farms/${farmId}/harvests`);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get(`/api/v1/farms/${farmId}/harvests`);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/v1/farms/:farmId/harvests
// ═════════════════════════════════════════════════════════════════════════════
d('POST /api/v1/farms/:farmId/harvests', () => {
  let farmId: string;
  const HARVEST_PAYLOAD = {
    crop: 'Beans',
    quantityKg: 120,
    harvestDate: '2024-06-15',
    qualityGrade: 'A',
  };

  beforeEach(async () => {
    const farm = await createTestFarm('farmer-001');
    farmId = farm.id;
  });
  afterEach(async () => {
    await prisma.harvest.deleteMany();
    await prisma.farm.deleteMany();
  });

  it('records a harvest and returns 201', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/harvests`)
      .send(HARVEST_PAYLOAD);
    expect(res.status).toBe(201);
    expect(res.body.data.crop).toBe('Beans');
    expect(res.body.data.farmId).toBe(farmId);
  });

  it('publishes harvestRecorded Kafka event', async () => {
    const { publishHarvestRecorded } = jest.requireMock(
      '../../src/events/producers/harvestRecordedProducer',
    );
    (publishHarvestRecorded as jest.Mock).mockClear();
    await request(app)
      .post(`/api/v1/farms/${farmId}/harvests`)
      .send(HARVEST_PAYLOAD);
    expect(publishHarvestRecorded).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when crop is missing', async () => {
    const { crop: _c, ...rest } = HARVEST_PAYLOAD;
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/harvests`)
      .send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when quantityKg is not positive', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/harvests`)
      .send({ ...HARVEST_PAYLOAD, quantityKg: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when harvestDate is invalid', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/harvests`)
      .send({ ...HARVEST_PAYLOAD, harvestDate: 'last-week' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when qualityGrade is invalid', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/harvests`)
      .send({ ...HARVEST_PAYLOAD, qualityGrade: 'S' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when farm does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/farms/00000000-0000-0000-0000-000000000000/harvests')
      .send(HARVEST_PAYLOAD);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 404 when another farmer tries to record a harvest', async () => {
    mockUser.id = 'farmer-002';
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/harvests`)
      .send(HARVEST_PAYLOAD);
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('FARM_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/harvests`)
      .send(HARVEST_PAYLOAD);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /health
// ═════════════════════════════════════════════════════════════════════════════
d('GET /health', () => {
  it('returns 200 with service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('farm-service');
  });
});
