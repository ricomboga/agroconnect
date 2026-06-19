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

const LICENSE_PAYLOAD = {
  farmId: '00000000-0000-0000-0000-000000000001',
  licenseType: 'pesticide_use',
  description: 'Applying for pesticide use licence',
};

async function clearAll() {
  await prisma.licenseApplication.deleteMany();
}

beforeAll(async () => { if (DB_UNAVAILABLE) return; await clearAll(); });
afterAll(async () => { if (DB_UNAVAILABLE) return; await clearAll(); await prisma.$disconnect(); });
afterEach(() => {
  shouldRejectAuth = false;
  mockUser.id = 'farmer-001';
  mockUser.role = 'farmer';
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/govt/licenses
// ═══════════════════════════════════════════════════════════════════════════════
d('POST /api/v1/govt/licenses', () => {
  afterEach(async () => { await prisma.licenseApplication.deleteMany(); });

  it('creates a license application and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/govt/licenses')
      .send(LICENSE_PAYLOAD);
    expect(res.status).toBe(201);
    expect(res.body.data.licenseType).toBe('pesticide_use');
    expect(res.body.data.farmerId).toBe('farmer-001');
    expect(res.body.data.status).toBe('submitted');
  });

  it('returns 400 when licenseType is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/govt/licenses')
      .send({ ...LICENSE_PAYLOAD, licenseType: 'rocket_license' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when farmId is not a UUID', async () => {
    const res = await request(app)
      .post('/api/v1/govt/licenses')
      .send({ ...LICENSE_PAYLOAD, farmId: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when farmId is missing', async () => {
    const { farmId: _f, ...rest } = LICENSE_PAYLOAD;
    const res = await request(app).post('/api/v1/govt/licenses').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when licenseType is missing', async () => {
    const { licenseType: _l, ...rest } = LICENSE_PAYLOAD;
    const res = await request(app).post('/api/v1/govt/licenses').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('accepts all valid licenseType values', async () => {
    const types = ['pesticide_use', 'agro_dealer', 'export_permit', 'water_abstraction'] as const;
    for (const licenseType of types) {
      const res = await request(app)
        .post('/api/v1/govt/licenses')
        .send({ ...LICENSE_PAYLOAD, licenseType });
      expect(res.status).toBe(201);
    }
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).post('/api/v1/govt/licenses').send(LICENSE_PAYLOAD);
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/govt/licenses
// ═══════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/govt/licenses', () => {
  beforeEach(async () => {
    await prisma.licenseApplication.createMany({
      data: [
        { farmerId: 'farmer-001', farmId: '00000000-0000-0000-0000-000000000001', licenseType: 'pesticide_use', status: 'submitted' },
        { farmerId: 'farmer-001', farmId: '00000000-0000-0000-0000-000000000001', licenseType: 'agro_dealer', status: 'approved' },
        { farmerId: 'farmer-002', farmId: '00000000-0000-0000-0000-000000000002', licenseType: 'export_permit', status: 'submitted' },
      ],
    });
  });
  afterEach(async () => { await prisma.licenseApplication.deleteMany(); });

  it('returns 200 with farmer\'s own licenses only', async () => {
    const res = await request(app).get('/api/v1/govt/licenses');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data.every((l: { farmerId: string }) => l.farmerId === 'farmer-001')).toBe(true);
  });

  it('respects page_size', async () => {
    const res = await request(app).get('/api/v1/govt/licenses?page_size=1');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get('/api/v1/govt/licenses');
    expect(res.status).toBe(401);
  });
});
