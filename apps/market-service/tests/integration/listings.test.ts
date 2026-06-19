const DB_UNAVAILABLE = process.env['MARKET_DB_AVAILABLE'] === 'false';
const d = DB_UNAVAILABLE ? describe.skip : describe;
if (DB_UNAVAILABLE) {
  test.skip('Skipping integration tests: database not available', () => {});
}

import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '@agroconnect/db/market';

jest.mock('../../src/middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = req.headers['x-test-role'] === 'farmer'
      ? { id: 'farmer-001', role: 'farmer', isVerified: true, phone: '+254712000001' }
      : req.headers['x-test-role'] === 'buyer'
      ? { id: 'buyer-001', role: 'buyer', isVerified: true, phone: '+254712000002' }
      : { id: 'user-001', role: 'extension_officer', isVerified: true, phone: '+254712000003' };
    next();
  },
}));

jest.mock('../../src/events/producers/listingCreatedProducer', () => ({
  publishListingCreated: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/events/producers/listingInquiryProducer', () => ({
  publishListingInquiry: jest.fn().mockResolvedValue(undefined),
}));

const FARMER_HEADERS = { 'x-test-role': 'farmer' };
const BUYER_HEADERS = { 'x-test-role': 'buyer' };

const VALID_LISTING = {
  farmId: '00000000-0000-0000-0000-000000000001',
  crop: 'maize',
  quantityKg: 500,
  askingPriceKes: 42,
  qualityGrade: 'A',
  availableFrom: '2026-07-01',
  availableUntil: '2026-07-31',
  locationCounty: 'Nakuru',
};

beforeEach(async () => {
  if (DB_UNAVAILABLE) return;
  await prisma.produceListing.deleteMany({});
});

afterAll(async () => {
  if (DB_UNAVAILABLE) return;
  await prisma.$disconnect();
});

d('GET /api/v1/market/listings', () => {
  it('returns 200 with empty data when no listings exist', async () => {
    const res = await request(app).get('/api/v1/market/listings');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toHaveProperty('total', 0);
  });

  it('returns 200 with paginated listings', async () => {
    await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send(VALID_LISTING);
    const res = await request(app).get('/api/v1/market/listings');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('filters by crop (case-insensitive)', async () => {
    await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send(VALID_LISTING);
    await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send({ ...VALID_LISTING, crop: 'beans' });
    const res = await request(app).get('/api/v1/market/listings?crop=MAIZE');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].crop).toBe('maize');
  });

  it('filters by quality_grade', async () => {
    await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send(VALID_LISTING);
    await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send({ ...VALID_LISTING, qualityGrade: 'B' });
    const res = await request(app).get('/api/v1/market/listings?quality_grade=A');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 400 for invalid quality_grade filter', async () => {
    const res = await request(app).get('/api/v1/market/listings?quality_grade=Z');
    expect(res.status).toBe(400);
  });
});

d('POST /api/v1/market/listings', () => {
  it('returns 201 with created listing', async () => {
    const res = await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send(VALID_LISTING);
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.crop).toBe('maize');
    expect(res.body.data.status).toBe('active');
  });

  it('returns 400 when quantityKg is missing', async () => {
    const { quantityKg: _, ...rest } = VALID_LISTING;
    const res = await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send(rest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when qualityGrade is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/market/listings')
      .set(FARMER_HEADERS)
      .send({ ...VALID_LISTING, qualityGrade: 'X' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).post('/api/v1/market/listings').send(VALID_LISTING);
    expect(res.status).toBe(401);
  });
});

d('GET /api/v1/market/listings/:listingId', () => {
  it('returns 200 with listing detail', async () => {
    const createRes = await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send(VALID_LISTING);
    const id = createRes.body.data.id;
    const res = await request(app).get(`/api/v1/market/listings/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it('returns 404 for unknown listingId', async () => {
    const res = await request(app).get('/api/v1/market/listings/00000000-0000-0000-0000-000000000099');
    expect(res.status).toBe(404);
  });
});

d('PATCH /api/v1/market/listings/:listingId', () => {
  it('returns 200 when owner updates listing', async () => {
    const createRes = await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send(VALID_LISTING);
    const id = createRes.body.data.id;
    const res = await request(app)
      .patch(`/api/v1/market/listings/${id}`)
      .set(FARMER_HEADERS)
      .send({ askingPriceKes: 50 });
    expect(res.status).toBe(200);
    expect(Number(res.body.data.askingPriceKes)).toBe(50);
  });

  it('returns 400 when body is empty', async () => {
    const createRes = await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send(VALID_LISTING);
    const id = createRes.body.data.id;
    const res = await request(app).patch(`/api/v1/market/listings/${id}`).set(FARMER_HEADERS).send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 when JWT is missing', async () => {
    const res = await request(app).patch('/api/v1/market/listings/any-id').send({ crop: 'beans' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when a different farmer tries to update', async () => {
    const createRes = await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send(VALID_LISTING);
    const id = createRes.body.data.id;
    const res = await request(app)
      .patch(`/api/v1/market/listings/${id}`)
      .set({ 'x-test-role': 'farmer', 'x-test-user': 'farmer-999' })
      .send({ crop: 'beans' });
    expect(res.status).toBe(403);
  });
});

d('DELETE /api/v1/market/listings/:listingId', () => {
  it('returns 204 and sets status to withdrawn', async () => {
    const createRes = await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send(VALID_LISTING);
    const id = createRes.body.data.id;
    const res = await request(app).delete(`/api/v1/market/listings/${id}`).set(FARMER_HEADERS);
    expect(res.status).toBe(204);
    const detail = await request(app).get(`/api/v1/market/listings/${id}`);
    expect(detail.body.data.status).toBe('withdrawn');
  });

  it('returns 401 when JWT is missing', async () => {
    const res = await request(app).delete('/api/v1/market/listings/any-id');
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown listingId', async () => {
    const res = await request(app)
      .delete('/api/v1/market/listings/00000000-0000-0000-0000-000000000099')
      .set(FARMER_HEADERS);
    expect(res.status).toBe(404);
  });
});

d('POST /api/v1/market/listings/:listingId/inquire', () => {
  it('returns 201 when buyer sends inquiry', async () => {
    const createRes = await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send(VALID_LISTING);
    const id = createRes.body.data.id;
    const res = await request(app)
      .post(`/api/v1/market/listings/${id}/inquire`)
      .set(BUYER_HEADERS)
      .send({ message: 'Is this still available?' });
    expect(res.status).toBe(201);
  });

  it('returns 400 when message is empty', async () => {
    const createRes = await request(app).post('/api/v1/market/listings').set(FARMER_HEADERS).send(VALID_LISTING);
    const id = createRes.body.data.id;
    const res = await request(app)
      .post(`/api/v1/market/listings/${id}/inquire`)
      .set(BUYER_HEADERS)
      .send({ message: '' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when JWT is missing', async () => {
    const res = await request(app)
      .post('/api/v1/market/listings/any-id/inquire')
      .send({ message: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown listing', async () => {
    const res = await request(app)
      .post('/api/v1/market/listings/00000000-0000-0000-0000-000000000099/inquire')
      .set(BUYER_HEADERS)
      .send({ message: 'Hello' });
    expect(res.status).toBe(404);
  });
});
