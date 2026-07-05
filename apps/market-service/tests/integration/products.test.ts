const DB_UNAVAILABLE = process.env['MARKET_DB_AVAILABLE'] === 'false';
const d = DB_UNAVAILABLE ? describe.skip : describe;
if (DB_UNAVAILABLE) {
  test.skip('Skipping integration tests: database not available', () => {});
}

import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '@agroconnect/db/market';

jest.mock('../../src/middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const role = req.headers['x-test-role'];
    if (!role) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    const id = role === 'supplier' ? 'supplier-001' : 'buyer-001';
    req.user = { id, role, isVerified: true, phone: '+254712000001' };
    next();
  },
  authorize: (...roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN' } });
      return;
    }
    next();
  },
}));

const SUPPLIER_HEADERS = { 'x-test-role': 'supplier' };

const VALID_PRODUCT = {
  name: 'Urea 50kg',
  category: 'fertiliser',
  description: 'Nitrogen fertiliser for top-dressing maize',
  unit: 'bag',
  pricePerUnitKes: 3800,
  stockQuantity: 200,
  countyAvailability: ['Nakuru', 'Kiambu'],
};

beforeEach(async () => {
  if (DB_UNAVAILABLE) return;
  await prisma.supplierProduct.deleteMany({});
});

afterAll(async () => {
  if (DB_UNAVAILABLE) return;
  await prisma.$disconnect();
});

d('GET /api/v1/market/products', () => {
  it('returns 200 with empty list', async () => {
    const res = await request(app).get('/api/v1/market/products');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns active products', async () => {
    await request(app).post('/api/v1/market/products').set(SUPPLIER_HEADERS).send(VALID_PRODUCT);
    const res = await request(app).get('/api/v1/market/products');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('filters by category', async () => {
    await request(app).post('/api/v1/market/products').set(SUPPLIER_HEADERS).send(VALID_PRODUCT);
    await request(app).post('/api/v1/market/products').set(SUPPLIER_HEADERS).send({ ...VALID_PRODUCT, name: 'Maize seeds', category: 'seed' });
    const res = await request(app).get('/api/v1/market/products?category=seed');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].category).toBe('seed');
  });

  it('returns 400 for invalid category filter', async () => {
    const res = await request(app).get('/api/v1/market/products?category=magic');
    expect(res.status).toBe(400);
  });
});

d('POST /api/v1/market/products', () => {
  it('returns 201 with created product', async () => {
    const res = await request(app).post('/api/v1/market/products').set(SUPPLIER_HEADERS).send(VALID_PRODUCT);
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe('Urea 50kg');
  });

  it('returns 400 when name is missing', async () => {
    const { name: _, ...rest } = VALID_PRODUCT;
    const res = await request(app).post('/api/v1/market/products').set(SUPPLIER_HEADERS).send(rest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when countyAvailability is empty', async () => {
    const res = await request(app)
      .post('/api/v1/market/products')
      .set(SUPPLIER_HEADERS)
      .send({ ...VALID_PRODUCT, countyAvailability: [] });
    expect(res.status).toBe(400);
  });

  it('returns 401 when JWT is missing', async () => {
    const res = await request(app).post('/api/v1/market/products').send(VALID_PRODUCT);
    expect(res.status).toBe(401);
  });
});

d('PATCH /api/v1/market/products/:productId', () => {
  it('returns 200 when owner updates product', async () => {
    const createRes = await request(app).post('/api/v1/market/products').set(SUPPLIER_HEADERS).send(VALID_PRODUCT);
    const id = createRes.body.data.id;
    const res = await request(app)
      .patch(`/api/v1/market/products/${id}`)
      .set(SUPPLIER_HEADERS)
      .send({ pricePerUnitKes: 4200 });
    expect(res.status).toBe(200);
    expect(Number(res.body.data.pricePerUnitKes)).toBe(4200);
  });

  it('returns 403 when a different supplier tries to update', async () => {
    const createRes = await request(app).post('/api/v1/market/products').set(SUPPLIER_HEADERS).send(VALID_PRODUCT);
    const id = createRes.body.data.id;
    const res = await request(app)
      .patch(`/api/v1/market/products/${id}`)
      .set({ 'x-test-role': 'supplier-999' })
      .send({ pricePerUnitKes: 9999 });
    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown productId', async () => {
    const res = await request(app)
      .patch('/api/v1/market/products/00000000-0000-0000-0000-000000000099')
      .set(SUPPLIER_HEADERS)
      .send({ pricePerUnitKes: 4200 });
    expect(res.status).toBe(404);
  });

  it('returns 401 when JWT is missing', async () => {
    const res = await request(app).patch('/api/v1/market/products/any-id').send({ pricePerUnitKes: 100 });
    expect(res.status).toBe(401);
  });
});
