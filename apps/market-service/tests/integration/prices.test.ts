const DB_UNAVAILABLE = process.env['MARKET_DB_AVAILABLE'] === 'false';
const d = DB_UNAVAILABLE ? describe.skip : describe;
if (DB_UNAVAILABLE) {
  test.skip('Skipping integration tests: database not available', () => {});
}

import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '@agroconnect/db/market';

const CROPS = ['maize', 'beans', 'tomatoes', 'potatoes', 'onions', 'cabbage', 'wheat', 'sorghum', 'coffee', 'tea'];

beforeAll(async () => {
  if (DB_UNAVAILABLE) return;
  await prisma.commodityPrice.deleteMany({});
  await prisma.commodityPrice.createMany({
    data: [
      { crop: 'maize',    priceKes: 40,  unit: 'kg' },
      { crop: 'beans',    priceKes: 120, unit: 'kg' },
      { crop: 'tomatoes', priceKes: 60,  unit: 'kg' },
      { crop: 'potatoes', priceKes: 50,  unit: 'kg' },
      { crop: 'onions',   priceKes: 80,  unit: 'kg' },
      { crop: 'cabbage',  priceKes: 30,  unit: 'kg' },
      { crop: 'wheat',    priceKes: 55,  unit: 'kg' },
      { crop: 'sorghum',  priceKes: 35,  unit: 'kg' },
      { crop: 'coffee',   priceKes: 600, unit: 'kg' },
      { crop: 'tea',      priceKes: 200, unit: 'kg' },
    ],
  });
});

afterAll(async () => {
  if (DB_UNAVAILABLE) return;
  await prisma.$disconnect();
});

d('GET /api/v1/market/prices', () => {
  it('returns 200 with 10 crop prices (no auth required)', async () => {
    const res = await request(app).get('/api/v1/market/prices');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10);
  });

  it('includes all 10 expected crops', async () => {
    const res = await request(app).get('/api/v1/market/prices');
    const returnedCrops = res.body.data.map((p: { crop: string }) => p.crop);
    for (const crop of CROPS) {
      expect(returnedCrops).toContain(crop);
    }
  });

  it('includes priceKes and unit fields', async () => {
    const res = await request(app).get('/api/v1/market/prices');
    const maize = res.body.data.find((p: { crop: string }) => p.crop === 'maize');
    expect(Number(maize.priceKes)).toBe(40);
    expect(maize.unit).toBe('kg');
  });
});
