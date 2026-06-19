const DB_UNAVAILABLE = process.env['MARKET_DB_AVAILABLE'] === 'false';
const d = DB_UNAVAILABLE ? describe.skip : describe;
if (DB_UNAVAILABLE) {
  test.skip('Skipping integration tests: database not available', () => {});
}

import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '@agroconnect/db/market';

const SUPPLIER_ID = 'supplier-001';
const BUYER_ID = 'buyer-001';

jest.mock('../../src/middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const role = req.headers['x-test-role'];
    if (role === 'supplier') req.user = { id: SUPPLIER_ID, role: 'supplier', isVerified: true, phone: '+254712000001' };
    else if (role === 'buyer') req.user = { id: BUYER_ID, role: 'buyer', isVerified: true, phone: '+254712000002' };
    else { res.status(401).json({ error: { code: 'UNAUTHORIZED' } }); return; }
    next();
  },
}));

jest.mock('../../src/events/producers/orderPlacedProducer', () => ({
  publishOrderPlaced: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/events/producers/orderUpdatedProducer', () => ({
  publishOrderUpdated: jest.fn().mockResolvedValue(undefined),
}));

const SUPPLIER_HEADERS = { 'x-test-role': 'supplier' };
const BUYER_HEADERS = { 'x-test-role': 'buyer' };

async function createTestProduct(stockQuantity = 100) {
  return prisma.supplierProduct.create({
    data: {
      supplierId: SUPPLIER_ID,
      name: 'Test Product',
      category: 'fertiliser',
      description: 'Test',
      unit: 'bag',
      pricePerUnitKes: 3800,
      stockQuantity,
      countyAvailability: ['Nakuru'],
      isActive: true,
    },
  });
}

beforeEach(async () => {
  if (DB_UNAVAILABLE) return;
  await prisma.order.deleteMany({});
  await prisma.supplierProduct.deleteMany({});
});

afterAll(async () => {
  if (DB_UNAVAILABLE) return;
  await prisma.$disconnect();
});

d('POST /api/v1/market/orders', () => {
  it('returns 201 with created order', async () => {
    const product = await createTestProduct();
    const res = await request(app)
      .post('/api/v1/market/orders')
      .set(BUYER_HEADERS)
      .send({ productId: product.id, quantityUnits: 10, deliveryAddress: 'Nakuru Town' });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.status).toBe('pending');
    expect(Number(res.body.data.totalPriceKes)).toBe(38000);
  });

  it('returns 422 when stock is insufficient', async () => {
    const product = await createTestProduct(5);
    const res = await request(app)
      .post('/api/v1/market/orders')
      .set(BUYER_HEADERS)
      .send({ productId: product.id, quantityUnits: 10, deliveryAddress: 'Nakuru' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('returns 404 when product does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/market/orders')
      .set(BUYER_HEADERS)
      .send({ productId: '00000000-0000-0000-0000-000000000099', quantityUnits: 1, deliveryAddress: 'Nakuru' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when productId is not a UUID', async () => {
    const res = await request(app)
      .post('/api/v1/market/orders')
      .set(BUYER_HEADERS)
      .send({ productId: 'not-a-uuid', quantityUnits: 1, deliveryAddress: 'Nakuru' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when JWT is missing', async () => {
    const res = await request(app)
      .post('/api/v1/market/orders')
      .send({ productId: '00000000-0000-0000-0000-000000000001', quantityUnits: 1, deliveryAddress: 'Nakuru' });
    expect(res.status).toBe(401);
  });
});

d('GET /api/v1/market/orders', () => {
  it('returns buyer orders only for buyer role', async () => {
    const product = await createTestProduct();
    await request(app).post('/api/v1/market/orders').set(BUYER_HEADERS)
      .send({ productId: product.id, quantityUnits: 1, deliveryAddress: 'Nakuru' });
    const res = await request(app).get('/api/v1/market/orders').set(BUYER_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].buyerId).toBe(BUYER_ID);
  });

  it('returns supplier orders only for supplier role', async () => {
    const product = await createTestProduct();
    await request(app).post('/api/v1/market/orders').set(BUYER_HEADERS)
      .send({ productId: product.id, quantityUnits: 1, deliveryAddress: 'Nakuru' });
    const res = await request(app).get('/api/v1/market/orders').set(SUPPLIER_HEADERS);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].supplierId).toBe(SUPPLIER_ID);
  });

  it('returns 401 when JWT is missing', async () => {
    const res = await request(app).get('/api/v1/market/orders');
    expect(res.status).toBe(401);
  });
});

d('PATCH /api/v1/market/orders/:orderId/status', () => {
  async function placeOrder() {
    const product = await createTestProduct();
    const res = await request(app).post('/api/v1/market/orders').set(BUYER_HEADERS)
      .send({ productId: product.id, quantityUnits: 1, deliveryAddress: 'Nakuru' });
    return res.body.data.id as string;
  }

  it('advances pending → confirmed', async () => {
    const orderId = await placeOrder();
    const res = await request(app)
      .patch(`/api/v1/market/orders/${orderId}/status`)
      .set(SUPPLIER_HEADERS)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('confirmed');
  });

  it('advances confirmed → dispatched → delivered', async () => {
    const orderId = await placeOrder();
    await request(app).patch(`/api/v1/market/orders/${orderId}/status`).set(SUPPLIER_HEADERS).send({ status: 'confirmed' });
    await request(app).patch(`/api/v1/market/orders/${orderId}/status`).set(SUPPLIER_HEADERS).send({ status: 'dispatched' });
    const res = await request(app).patch(`/api/v1/market/orders/${orderId}/status`).set(SUPPLIER_HEADERS).send({ status: 'delivered' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('delivered');
  });

  it('returns 422 when skipping a step (pending → dispatched)', async () => {
    const orderId = await placeOrder();
    const res = await request(app)
      .patch(`/api/v1/market/orders/${orderId}/status`)
      .set(SUPPLIER_HEADERS)
      .send({ status: 'dispatched' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('returns 422 after all steps are done (no further transition)', async () => {
    const orderId = await placeOrder();
    await request(app).patch(`/api/v1/market/orders/${orderId}/status`).set(SUPPLIER_HEADERS).send({ status: 'confirmed' });
    await request(app).patch(`/api/v1/market/orders/${orderId}/status`).set(SUPPLIER_HEADERS).send({ status: 'dispatched' });
    await request(app).patch(`/api/v1/market/orders/${orderId}/status`).set(SUPPLIER_HEADERS).send({ status: 'delivered' });
    const res = await request(app)
      .patch(`/api/v1/market/orders/${orderId}/status`)
      .set(SUPPLIER_HEADERS)
      .send({ status: 'delivered' });
    expect(res.status).toBe(422);
  });

  it('returns 404 for unknown orderId', async () => {
    const res = await request(app)
      .patch('/api/v1/market/orders/00000000-0000-0000-0000-000000000099/status')
      .set(SUPPLIER_HEADERS)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(404);
  });

  it('returns 401 when JWT is missing', async () => {
    const res = await request(app).patch('/api/v1/market/orders/any-id/status').send({ status: 'confirmed' });
    expect(res.status).toBe(401);
  });
});
