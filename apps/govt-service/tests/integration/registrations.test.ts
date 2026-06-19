const DB_UNAVAILABLE = process.env['GOVT_TEST_DB_UNAVAILABLE'] === '1';
const d = DB_UNAVAILABLE ? describe.skip : describe;
if (DB_UNAVAILABLE) {
  test.skip('Skipping integration tests: database not available', () => {});
}

let shouldRejectAuth = false;
let shouldRejectOfficer = false;
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
      if (shouldRejectOfficer || !roles.includes(req.user?.role)) {
        return res.status(403).json({ error_code: 'FORBIDDEN', message_key: 'error.auth.forbidden', request_id: '', timestamp: new Date().toISOString() });
      }
      next();
    },
  };
});

jest.mock('../../src/events/producers/registrationSubmittedProducer', () => ({
  publishRegistrationSubmitted: jest.fn().mockResolvedValue(undefined),
}));

// ecitizenClient returns mock data — test that flow works end-to-end
jest.mock('../../src/clients/ecitizenClient', () => ({
  submitFarmRegistration: jest.fn().mockResolvedValue({ registrationRef: 'REG-MOCK-TEST', status: 'submitted' }),
  verifyNationalId: jest.fn().mockResolvedValue({ verified: true, fullName: 'Test Farmer', idNumber: '12345678' }),
  getRegistrationStatus: jest.fn().mockResolvedValue({ registrationRef: 'REG-MOCK-TEST', status: 'under_review', lastUpdated: new Date().toISOString() }),
}));

import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '@agroconnect/db/govt';

const REGISTRATION_PAYLOAD = {
  farmId: '00000000-0000-0000-0000-000000000001',
  farmName: 'Sunrise Farm',
  county: 'Nakuru',
  subCounty: 'Nakuru Town',
  areaAcres: 4.5,
  landTitle: 'LR-NAK-001',
};

async function clearAll() {
  await prisma.govtDocument.deleteMany();
  await prisma.farmRegistration.deleteMany();
}

beforeAll(async () => { if (DB_UNAVAILABLE) return; await clearAll(); });
afterAll(async () => { if (DB_UNAVAILABLE) return; await clearAll(); await prisma.$disconnect(); });
afterEach(() => {
  shouldRejectAuth = false;
  shouldRejectOfficer = false;
  mockUser.id = 'farmer-001';
  mockUser.role = 'farmer';
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/govt/registrations
// ═══════════════════════════════════════════════════════════════════════════════
d('POST /api/v1/govt/registrations', () => {
  afterEach(async () => { await prisma.farmRegistration.deleteMany(); });

  it('submits a registration and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/govt/registrations')
      .send(REGISTRATION_PAYLOAD);
    expect(res.status).toBe(201);
    expect(res.body.data.farmName).toBe('Sunrise Farm');
    expect(res.body.data.farmerId).toBe('farmer-001');
    expect(res.body.data.status).toBe('submitted');
    expect(res.body.data.registrationRef).toBe('REG-MOCK-TEST');
  });

  it('publishes govt.registration.submitted Kafka event', async () => {
    const { publishRegistrationSubmitted } = jest.requireMock(
      '../../src/events/producers/registrationSubmittedProducer',
    );
    (publishRegistrationSubmitted as jest.Mock).mockClear();
    await request(app).post('/api/v1/govt/registrations').send(REGISTRATION_PAYLOAD);
    expect(publishRegistrationSubmitted).toHaveBeenCalledTimes(1);
    expect(publishRegistrationSubmitted).toHaveBeenCalledWith(
      expect.any(String),
      'farmer-001',
      'Nakuru',
    );
  });

  it('returns 400 when farmName is missing', async () => {
    const { farmName: _fn, ...rest } = REGISTRATION_PAYLOAD;
    const res = await request(app).post('/api/v1/govt/registrations').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when farmId is not a UUID', async () => {
    const res = await request(app)
      .post('/api/v1/govt/registrations')
      .send({ ...REGISTRATION_PAYLOAD, farmId: 'not-a-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when areaAcres is not positive', async () => {
    const res = await request(app)
      .post('/api/v1/govt/registrations')
      .send({ ...REGISTRATION_PAYLOAD, areaAcres: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when county is missing', async () => {
    const { county: _c, ...rest } = REGISTRATION_PAYLOAD;
    const res = await request(app).post('/api/v1/govt/registrations').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).post('/api/v1/govt/registrations').send(REGISTRATION_PAYLOAD);
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/govt/registrations
// ═══════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/govt/registrations', () => {
  beforeEach(async () => {
    await prisma.farmRegistration.create({
      data: {
        farmerId: 'farmer-001',
        farmId: '00000000-0000-0000-0000-000000000001',
        farmName: 'My Farm',
        county: 'Nakuru',
        areaAcres: 3,
        registrationRef: 'REG-001',
        status: 'submitted',
      },
    });
    await prisma.farmRegistration.create({
      data: {
        farmerId: 'farmer-002',
        farmId: '00000000-0000-0000-0000-000000000002',
        farmName: 'Other Farm',
        county: 'Nairobi',
        areaAcres: 2,
        registrationRef: 'REG-002',
        status: 'submitted',
      },
    });
  });
  afterEach(async () => { await prisma.farmRegistration.deleteMany(); });

  it('returns 200 with farmer\'s own registrations only', async () => {
    const res = await request(app).get('/api/v1/govt/registrations');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].farmerId).toBe('farmer-001');
    expect(res.body.meta.total).toBe(1);
  });

  it('respects page and page_size query params', async () => {
    const res = await request(app).get('/api/v1/govt/registrations?page=1&page_size=1');
    expect(res.status).toBe(200);
    expect(res.body.meta.page_size).toBe(1);
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get('/api/v1/govt/registrations');
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/govt/registrations/:registrationId
// ═══════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/govt/registrations/:registrationId', () => {
  let registrationId: string;

  beforeEach(async () => {
    const reg = await prisma.farmRegistration.create({
      data: {
        farmerId: 'farmer-001',
        farmId: '00000000-0000-0000-0000-000000000001',
        farmName: 'Detail Farm',
        county: 'Nakuru',
        areaAcres: 5,
        registrationRef: 'REG-DETAIL',
        status: 'under_review',
      },
    });
    registrationId = reg.id;
  });
  afterEach(async () => { await prisma.farmRegistration.deleteMany(); });

  it('returns 200 with registration detail', async () => {
    const res = await request(app).get(`/api/v1/govt/registrations/${registrationId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(registrationId);
    expect(res.body.data.documents).toBeDefined();
  });

  it('returns 404 for non-existent registration', async () => {
    const res = await request(app).get(
      '/api/v1/govt/registrations/00000000-0000-0000-0000-000000000000',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('REGISTRATION_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get(`/api/v1/govt/registrations/${registrationId}`);
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/govt/registrations/:registrationId/status
// ═══════════════════════════════════════════════════════════════════════════════
d('PATCH /api/v1/govt/registrations/:registrationId/status', () => {
  let registrationId: string;

  beforeEach(async () => {
    const reg = await prisma.farmRegistration.create({
      data: {
        farmerId: 'farmer-001',
        farmId: '00000000-0000-0000-0000-000000000001',
        farmName: 'Status Farm',
        county: 'Meru',
        areaAcres: 6,
        registrationRef: 'REG-STATUS',
        status: 'submitted',
      },
    });
    registrationId = reg.id;
  });
  afterEach(async () => { await prisma.farmRegistration.deleteMany(); });

  it('govt_officer can update status to approved', async () => {
    mockUser.id = 'officer-001';
    mockUser.role = 'govt_officer';
    const res = await request(app)
      .patch(`/api/v1/govt/registrations/${registrationId}/status`)
      .send({ status: 'approved', notes: 'All documents verified' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.officerId).toBe('officer-001');
  });

  it('govt_officer can update status to rejected', async () => {
    mockUser.id = 'officer-002';
    mockUser.role = 'govt_officer';
    const res = await request(app)
      .patch(`/api/v1/govt/registrations/${registrationId}/status`)
      .send({ status: 'rejected', notes: 'Missing title deed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
  });

  it('returns 400 for invalid status value', async () => {
    mockUser.role = 'govt_officer';
    const res = await request(app)
      .patch(`/api/v1/govt/registrations/${registrationId}/status`)
      .send({ status: 'deleted' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 when farmer tries to update status', async () => {
    mockUser.role = 'farmer';
    const res = await request(app)
      .patch(`/api/v1/govt/registrations/${registrationId}/status`)
      .send({ status: 'approved' });
    expect(res.status).toBe(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });

  it('returns 404 for non-existent registration', async () => {
    mockUser.role = 'govt_officer';
    const res = await request(app)
      .patch('/api/v1/govt/registrations/00000000-0000-0000-0000-000000000000/status')
      .send({ status: 'approved' });
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('REGISTRATION_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app)
      .patch(`/api/v1/govt/registrations/${registrationId}/status`)
      .send({ status: 'approved' });
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /health
// ═══════════════════════════════════════════════════════════════════════════════
d('GET /health', () => {
  it('returns 200 with service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('govt-service');
  });
});
