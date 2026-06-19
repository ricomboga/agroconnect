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

jest.mock('../../src/clients/mediaClient', () => ({
  uploadDocument: jest.fn().mockResolvedValue({
    url: 'https://media.agroconnect.africa/govt-documents/farmer-001/test-doc.pdf',
    key: 'govt-documents/farmer-001/test-doc.pdf',
  }),
}));

import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '@agroconnect/db/govt';

async function clearAll() {
  await prisma.govtDocument.deleteMany();
  await prisma.farmRegistration.deleteMany();
}

beforeAll(async () => { if (DB_UNAVAILABLE) return; await clearAll(); });
afterAll(async () => { if (DB_UNAVAILABLE) return; await clearAll(); await prisma.$disconnect(); });
afterEach(() => {
  shouldRejectAuth = false;
  mockUser.id = 'farmer-001';
  mockUser.role = 'farmer';
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/govt/documents
// ═══════════════════════════════════════════════════════════════════════════════
d('POST /api/v1/govt/documents', () => {
  afterEach(async () => { await prisma.govtDocument.deleteMany(); });

  it('uploads a document and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/govt/documents')
      .field('documentType', 'national_id')
      .attach('file', Buffer.from('mock pdf content'), {
        filename: 'national_id.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.documentType).toBe('national_id');
    expect(res.body.data.userId).toBe('farmer-001');
    expect(res.body.data.mediaUrl).toContain('media.agroconnect.africa');
  });

  it('calls mediaClient.uploadDocument with correct args', async () => {
    const { uploadDocument } = jest.requireMock('../../src/clients/mediaClient');
    (uploadDocument as jest.Mock).mockClear();
    await request(app)
      .post('/api/v1/govt/documents')
      .field('documentType', 'title_deed')
      .attach('file', Buffer.from('mock image'), {
        filename: 'title.jpg',
        contentType: 'image/jpeg',
      });
    expect(uploadDocument).toHaveBeenCalledTimes(1);
    expect(uploadDocument).toHaveBeenCalledWith(
      expect.any(Buffer),
      'title.jpg',
      'image/jpeg',
      'farmer-001',
    );
  });

  it('accepts all valid documentType values', async () => {
    const types = ['national_id', 'title_deed', 'kra_pin', 'business_permit', 'other'] as const;
    for (const documentType of types) {
      const res = await request(app)
        .post('/api/v1/govt/documents')
        .field('documentType', documentType)
        .attach('file', Buffer.from('content'), { filename: 'doc.pdf', contentType: 'application/pdf' });
      expect(res.status).toBe(201);
    }
  });

  it('returns 400 when documentType is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/govt/documents')
      .field('documentType', 'passport')
      .attach('file', Buffer.from('content'), { filename: 'doc.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when documentType is missing', async () => {
    const res = await request(app)
      .post('/api/v1/govt/documents')
      .attach('file', Buffer.from('content'), { filename: 'doc.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when file is missing', async () => {
    const res = await request(app)
      .post('/api/v1/govt/documents')
      .field('documentType', 'national_id');
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('FILE_REQUIRED');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app)
      .post('/api/v1/govt/documents')
      .field('documentType', 'national_id')
      .attach('file', Buffer.from('content'), { filename: 'doc.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/govt/documents
// ═══════════════════════════════════════════════════════════════════════════════
d('GET /api/v1/govt/documents', () => {
  beforeEach(async () => {
    await prisma.govtDocument.createMany({
      data: [
        { userId: 'farmer-001', documentType: 'national_id', fileName: 'id.pdf', mediaUrl: 'https://cdn.test/id.pdf' },
        { userId: 'farmer-001', documentType: 'title_deed', fileName: 'title.pdf', mediaUrl: 'https://cdn.test/title.pdf' },
        { userId: 'farmer-002', documentType: 'national_id', fileName: 'id2.pdf', mediaUrl: 'https://cdn.test/id2.pdf' },
      ],
    });
  });
  afterEach(async () => { await prisma.govtDocument.deleteMany(); });

  it('returns 200 with farmer\'s own documents only', async () => {
    const res = await request(app).get('/api/v1/govt/documents');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data.every((d: { userId: string }) => d.userId === 'farmer-001')).toBe(true);
  });

  it('respects page_size', async () => {
    const res = await request(app).get('/api/v1/govt/documents?page_size=1');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get('/api/v1/govt/documents');
    expect(res.status).toBe(401);
  });
});
