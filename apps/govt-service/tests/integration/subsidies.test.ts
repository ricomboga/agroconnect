const DB_UNAVAILABLE = process.env['GOVT_TEST_DB_UNAVAILABLE'] === '1';
const d = DB_UNAVAILABLE ? describe.skip : describe;
if (DB_UNAVAILABLE) {
  test.skip('Skipping integration tests: database not available', () => {});
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
        return res.status(401).json({ error_code: 'UNAUTHORIZED', message_key: 'error.unauthorized', request_id: '', timestamp: new Date().toISOString() });
      }
      req.user = { id: mockUser.id, role: mockUser.role };
      next();
    },
    authorize: (...roles: string[]) => (req: any, res: any, next: any) => {
      if (!roles.includes(req.user?.role)) {
        return res.status(403).json({ error_code: 'FORBIDDEN', message_key: 'error.auth.forbidden', request_id: '', timestamp: new Date().toISOString() });
      }
      next();
    },
  };
});

jest.mock('../../src/events/producers/registrationSubmittedProducer', () => ({
  publishRegistrationSubmitted: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '@agroconnect/db/govt';

async function seedPrograms() {
  return prisma.subsidyProgram.createMany({
    data: [
      {
        name: 'MSAI Fertiliser Subsidy',
        description: 'Subsidised fertiliser for smallholder farmers',
        providerAgency: 'Ministry of Agriculture',
        eligibility: 'Smallholder farmers with less than 5 acres',
        benefitType: 'subsidy',
        benefitValue: '50% discount on certified fertilisers',
        countyEligible: [],
        isActive: true,
      },
      {
        name: 'KALRO High-Yielding Seeds',
        description: 'Access to improved seed varieties',
        providerAgency: 'Kenya Agricultural and Livestock Research Organisation',
        eligibility: 'Registered farmers',
        benefitType: 'subsidy',
        benefitValue: 'Certified seeds at 30% below market price',
        countyEligible: [],
        isActive: true,
      },
    ],
  });
}

async function clearAll() {
  await prisma.subsidyApplication.deleteMany();
  await prisma.subsidyProgram.deleteMany();
}

beforeAll(async () => { if (DB_UNAVAILABLE) return; await clearAll(); });
afterAll(async () => { if (DB_UNAVAILABLE) return; await clearAll(); await prisma.$disconnect(); });
afterEach(() => {
  shouldRejectAuth = false;
  mockUser.id = 'farmer-001';
  mockUser.role = 'farmer';
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/govt/subsidies  (public)
// ═══════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/govt/subsidies', () => {
  beforeEach(async () => { await seedPrograms(); });
  afterEach(async () => { await clearAll(); });

  it('returns 200 with list of active programs without auth', async () => {
    const res = await request(app).get('/api/v1/govt/subsidies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(2);
  });

  it('respects page_size', async () => {
    const res = await request(app).get('/api/v1/govt/subsidies?page_size=1');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.page_size).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/govt/subsidies/:programId/apply
// ═══════════════════════════════════════════════════════════════════════════════
d('POST /api/v1/govt/subsidies/:programId/apply', () => {
  let programId: string;

  beforeEach(async () => {
    await seedPrograms();
    const programs = await prisma.subsidyProgram.findMany({ take: 1 });
    programId = programs[0]!.id;
  });
  afterEach(async () => { await clearAll(); });

  it('applies for a subsidy and returns 201', async () => {
    const res = await request(app)
      .post(`/api/v1/govt/subsidies/${programId}/apply`)
      .send({ farmId: '00000000-0000-0000-0000-000000000001' });
    expect(res.status).toBe(201);
    expect(res.body.data.farmerId).toBe('farmer-001');
    expect(res.body.data.programId).toBe(programId);
    expect(res.body.data.status).toBe('submitted');
    expect(res.body.data.program).toBeDefined();
  });

  it('returns 409 on duplicate application for same program', async () => {
    await request(app)
      .post(`/api/v1/govt/subsidies/${programId}/apply`)
      .send({ farmId: '00000000-0000-0000-0000-000000000001' });
    const res = await request(app)
      .post(`/api/v1/govt/subsidies/${programId}/apply`)
      .send({ farmId: '00000000-0000-0000-0000-000000000001' });
    expect(res.status).toBe(409);
    expect(res.body.error_code).toBe('DUPLICATE_APPLICATION');
  });

  it('returns 404 for non-existent program', async () => {
    const res = await request(app)
      .post('/api/v1/govt/subsidies/00000000-0000-0000-0000-000000000000/apply')
      .send({ farmId: '00000000-0000-0000-0000-000000000001' });
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('PROGRAM_NOT_FOUND');
  });

  it('returns 400 when farmId is not a UUID', async () => {
    const res = await request(app)
      .post(`/api/v1/govt/subsidies/${programId}/apply`)
      .send({ farmId: 'not-a-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when farmId is missing', async () => {
    const res = await request(app)
      .post(`/api/v1/govt/subsidies/${programId}/apply`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app)
      .post(`/api/v1/govt/subsidies/${programId}/apply`)
      .send({ farmId: '00000000-0000-0000-0000-000000000001' });
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/govt/subsidies/applications
// ═══════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/govt/subsidies/applications', () => {
  beforeEach(async () => {
    await prisma.subsidyProgram.createMany({
      data: [
        { name: 'Prog A', description: 'A', providerAgency: 'MoA', eligibility: 'All', benefitType: 'subsidy', benefitValue: '10%', countyEligible: [], isActive: true },
        { name: 'Prog B', description: 'B', providerAgency: 'KALRO', eligibility: 'All', benefitType: 'grant', benefitValue: '20k', countyEligible: [], isActive: true },
      ],
    });
    const allPrograms = await prisma.subsidyProgram.findMany();
    await prisma.subsidyApplication.createMany({
      data: [
        { farmerId: 'farmer-001', farmId: '00000000-0000-0000-0000-000000000001', programId: allPrograms[0]!.id, status: 'submitted' },
        { farmerId: 'farmer-002', farmId: '00000000-0000-0000-0000-000000000002', programId: allPrograms[1]!.id, status: 'submitted' },
      ],
    });
  });
  afterEach(async () => { await clearAll(); });

  it('returns 200 with farmer\'s own applications only', async () => {
    const res = await request(app).get('/api/v1/govt/subsidies/applications');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].farmerId).toBe('farmer-001');
    expect(res.body.meta.total).toBe(1);
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get('/api/v1/govt/subsidies/applications');
    expect(res.status).toBe(401);
  });
});
