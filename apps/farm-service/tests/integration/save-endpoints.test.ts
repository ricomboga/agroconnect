/**
 * Integration tests: verify save buttons actually persist data to the database.
 *
 * Covers:
 *   POST /api/v1/farms/:farmId/activities
 *   POST /api/v1/farms/:farmId/crops
 *   POST /api/v1/farms/:farmId/animals
 *   POST /api/v1/farms/:farmId/workers
 *
 * Runs against a real PostgreSQL test database.
 * Kafka producers and auth middleware are mocked.
 */

const DB_UNAVAILABLE = process.env['FARM_TEST_DB_UNAVAILABLE'] === '1';
const d = DB_UNAVAILABLE ? describe.skip : describe;
if (DB_UNAVAILABLE) {
  test.skip('Skipping integration tests: database not available', () => {});
}

// ─── Auth control ─────────────────────────────────────────────────────────────
let shouldRejectAuth = false;
const mockUser = { id: 'owner-001', role: 'farm_owner' };

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('@agroconnect/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('@agroconnect/shared');
  return {
    ...actual,
    authenticate: (req: any, _res: any, next: any) => {
      if (shouldRejectAuth) {
        return _res.status(401).json({ error_code: 'UNAUTHORIZED' });
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
jest.mock('../../src/events/producers/workerAssignedProducer', () => ({
  publishWorkerAssigned: jest.fn().mockResolvedValue(undefined),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '@agroconnect/db/farm';

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function createTestFarm(ownerId = 'owner-001') {
  return prisma.farm.create({
    data: {
      ownerId,
      name: 'Integration Test Farm',
      locationLat: -1.3,
      locationLng: 36.8,
      county: 'Kiambu',
      areaAcres: 4.0,
      status: 'active',
    },
  });
}

async function clearAll() {
  await prisma.animalGroup.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.farmPlot.deleteMany();
  await prisma.farmWorker.deleteMany();
  await prisma.farm.deleteMany();
}

// ─── Setup ────────────────────────────────────────────────────────────────────
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
  mockUser.id = 'owner-001';
  mockUser.role = 'farm_owner';
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/farms/:farmId/activities
// ═══════════════════════════════════════════════════════════════════════════════

d('POST /api/v1/farms/:farmId/activities — Save activity to database', () => {
  let farmId: string;

  beforeEach(async () => {
    const farm = await createTestFarm();
    farmId = farm.id;
  });

  afterEach(async () => {
    await prisma.activity.deleteMany({ where: { farmId } });
    await prisma.farm.delete({ where: { id: farmId } });
  });

  it('saves activity with scheduledDate and returns 201', async () => {
    const dto = {
      type: 'irrigation',
      title: 'Watering – Maize',
      scheduledDate: '2026-07-15',
    };

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/activities`)
      .send(dto);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      type: 'irrigation',
      title: 'Watering – Maize',
      farmId,
    });

    const inDb = await prisma.activity.findFirst({ where: { farmId, type: 'irrigation' } });
    expect(inDb).not.toBeNull();
    expect(inDb?.title).toBe('Watering – Maize');
  });

  it('saves scheduledTime when provided', async () => {
    const dto = {
      type: 'planting',
      title: 'Planting – Beans',
      scheduledDate: '2026-07-20',
      scheduledTime: '07:30',
    };

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/activities`)
      .send(dto);

    expect(res.status).toBe(201);

    const inDb = await prisma.activity.findFirst({ where: { farmId, type: 'planting' } });
    expect(inDb?.scheduledTime).toBe('07:30');
  });

  it('saves assignedToWorkerId when provided', async () => {
    const workerUserId = 'worker-uuid-001';
    await prisma.farmWorker.create({
      data: { farmId, userId: workerUserId, role: 'field_worker' },
    });

    const dto = {
      type: 'weeding',
      title: 'Weeding – North Plot',
      scheduledDate: '2026-07-18',
      assignedToWorkerId: workerUserId,
    };

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/activities`)
      .send(dto);

    expect(res.status).toBe(201);

    const inDb = await prisma.activity.findFirst({ where: { farmId, type: 'weeding' } });
    expect(inDb?.assignedToWorkerId).toBe(workerUserId);

    await prisma.farmWorker.deleteMany({ where: { farmId, userId: workerUserId } });
  });

  it('rejects request without required title field', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/activities`)
      .send({ type: 'irrigation', scheduledDate: '2026-07-15' });

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid activity type', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/activities`)
      .send({ type: 'spraying', title: 'Test', scheduledDate: '2026-07-15' });

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when user does not own the farm', async () => {
    mockUser.id = 'other-user-999';
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/activities`)
      .send({ type: 'irrigation', title: 'Test', scheduledDate: '2026-07-15' });

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/farms/:farmId/crops
// ═══════════════════════════════════════════════════════════════════════════════

d('POST /api/v1/farms/:farmId/crops — Save crop to database', () => {
  let farmId: string;

  beforeEach(async () => {
    const farm = await createTestFarm();
    farmId = farm.id;
  });

  afterEach(async () => {
    await prisma.farmPlot.deleteMany({ where: { farmId } });
    await prisma.farm.delete({ where: { id: farmId } });
  });

  it('creates a FarmPlot with crop details and returns 201', async () => {
    const dto = {
      cropType: 'Maize',
      variety: 'H614D',
      plantingDate: '2026-07-01',
      areaAcres: 1.5,
      plotNumber: 'Plot A',
    };

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/crops`)
      .send(dto);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      cropType: 'Maize',
      farmId,
    });

    const inDb = await prisma.farmPlot.findFirst({ where: { farmId, cropType: 'Maize' } });
    expect(inDb).not.toBeNull();
    expect(inDb?.variety).toBe('H614D');
    expect(inDb?.name).toBe('Plot A');
  });

  it('creates a crop with only required fields', async () => {
    const dto = { cropType: 'Beans', plantingDate: '2026-07-10' };

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/crops`)
      .send(dto);

    expect(res.status).toBe(201);
    const inDb = await prisma.farmPlot.findFirst({ where: { farmId, cropType: 'Beans' } });
    expect(inDb?.cropType).toBe('Beans');
  });

  it('rejects missing cropType', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/crops`)
      .send({ plantingDate: '2026-07-01' });

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing plantingDate', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/crops`)
      .send({ cropType: 'Maize' });

    expect(res.status).toBe(400);
  });

  it('returns 403 when user does not own the farm', async () => {
    mockUser.id = 'other-user-999';
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/crops`)
      .send({ cropType: 'Maize', plantingDate: '2026-07-01' });

    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/farms/:farmId/animals
// ═══════════════════════════════════════════════════════════════════════════════

d('POST /api/v1/farms/:farmId/animals — Save animal group to database', () => {
  let farmId: string;

  beforeEach(async () => {
    const farm = await createTestFarm();
    farmId = farm.id;
  });

  afterEach(async () => {
    await prisma.animalGroup.deleteMany({ where: { farmId } });
    await prisma.farm.delete({ where: { id: farmId } });
  });

  it('creates an AnimalGroup and returns 201', async () => {
    const dto = {
      animalType: 'Dairy Cattle',
      count: 12,
      breed: 'Friesian',
      notes: 'Vaccinated June 2026',
    };

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/animals`)
      .send(dto);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      animalType: 'Dairy Cattle',
      count: 12,
      farmId,
    });

    const inDb = await prisma.animalGroup.findFirst({ where: { farmId, animalType: 'Dairy Cattle' } });
    expect(inDb).not.toBeNull();
    expect(inDb?.count).toBe(12);
    expect(inDb?.breed).toBe('Friesian');
    expect(inDb?.notes).toBe('Vaccinated June 2026');
  });

  it('creates animal group with only required fields', async () => {
    const dto = { animalType: 'Goats', count: 20 };

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/animals`)
      .send(dto);

    expect(res.status).toBe(201);
    const inDb = await prisma.animalGroup.findFirst({ where: { farmId, animalType: 'Goats' } });
    expect(inDb?.count).toBe(20);
    expect(inDb?.breed).toBeNull();
  });

  it('rejects non-positive count', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/animals`)
      .send({ animalType: 'Goats', count: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing animalType', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/animals`)
      .send({ count: 10 });

    expect(res.status).toBe(400);
  });

  it('returns 403 when user does not own the farm', async () => {
    mockUser.id = 'other-user-999';
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/animals`)
      .send({ animalType: 'Goats', count: 5 });

    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/farms/:farmId/workers
// ═══════════════════════════════════════════════════════════════════════════════

d('POST /api/v1/farms/:farmId/workers — Save worker assignment to database', () => {
  let farmId: string;
  const workerUserId = 'worker-user-save-test';

  beforeEach(async () => {
    const farm = await createTestFarm();
    farmId = farm.id;
  });

  afterEach(async () => {
    await prisma.farmWorker.deleteMany({ where: { farmId } });
    await prisma.farm.delete({ where: { id: farmId } });
  });

  it('creates a FarmWorker and returns 201', async () => {
    const dto = { userId: workerUserId, role: 'field_worker' };

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/workers`)
      .send(dto);

    expect(res.status).toBe(201);

    const inDb = await prisma.farmWorker.findFirst({
      where: { farmId, userId: workerUserId },
    });
    expect(inDb).not.toBeNull();
    expect(inDb?.role).toBe('field_worker');
    expect(inDb?.isActive).toBe(true);
  });

  it('returns 409 or 200 when the same worker is added again (idempotent)', async () => {
    await prisma.farmWorker.create({
      data: { farmId, userId: workerUserId, role: 'field_worker' },
    });

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/workers`)
      .send({ userId: workerUserId, role: 'harvester' });

    expect([200, 201, 409]).toContain(res.status);
  });

  it('rejects missing userId', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/workers`)
      .send({ role: 'field_worker' });

    expect(res.status).toBe(400);
  });

  it('rejects invalid role', async () => {
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/workers`)
      .send({ userId: workerUserId, role: 'admin' });

    expect(res.status).toBe(400);
  });

  it('returns 403 when non-owner tries to add worker', async () => {
    mockUser.id = 'other-user-999';
    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/workers`)
      .send({ userId: workerUserId, role: 'field_worker' });

    expect(res.status).toBe(403);
  });
});
