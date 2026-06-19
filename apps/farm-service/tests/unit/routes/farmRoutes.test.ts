import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';

jest.mock('../../../src/middleware/auth', () => ({
  requireAuth: (req: Request & { user?: unknown }, _res: Response, next: NextFunction) => {
    (req as unknown as Record<string, unknown>)['user'] = { id: 'user-1', role: 'farmer' };
    next();
  },
}));

jest.mock('../../../src/middleware/validate', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../../src/controllers/farmController', () => ({
  createFarm: jest.fn((_req: Request, res: Response) => res.status(201).json({ data: { id: 'farm-new' } })),
  listFarms: jest.fn((_req: Request, res: Response) => res.json({ data: [] })),
  getFarm: jest.fn((_req: Request, res: Response) => res.json({ data: { id: 'farm-1' } })),
  updateFarm: jest.fn((_req: Request, res: Response) => res.json({ data: { id: 'farm-1' } })),
  deleteFarm: jest.fn((_req: Request, res: Response) => res.status(204).send()),
}));

jest.mock('../../../src/controllers/summaryController', () => ({
  getFarmSummary: jest.fn((_req: Request, res: Response) => res.json({ data: {} })),
}));

jest.mock('../../../src/controllers/reportController', () => ({
  generateReport: jest.fn((_req: Request, res: Response) => res.json({ data: { url: 'https://example.com/report.pdf' } })),
}));

import { farmRouter } from '../../../src/routes/farmRoutes';

const app = express();
app.use(express.json());
app.use('/farms', farmRouter);

describe('farmRoutes — handler callbacks are wired to controllers', () => {
  it('POST /farms → createFarm', async () => {
    const res = await request(app).post('/farms').send({ name: 'Wanjiru Farm' });
    expect(res.status).toBe(201);
  });

  it('GET /farms → listFarms', async () => {
    const res = await request(app).get('/farms');
    expect(res.status).toBe(200);
  });

  it('GET /farms/:farmId → getFarm', async () => {
    const res = await request(app).get('/farms/farm-1');
    expect(res.status).toBe(200);
  });

  it('PATCH /farms/:farmId → updateFarm', async () => {
    const res = await request(app).patch('/farms/farm-1').send({ name: 'Updated Farm' });
    expect(res.status).toBe(200);
  });

  it('DELETE /farms/:farmId → deleteFarm', async () => {
    const res = await request(app).delete('/farms/farm-1');
    expect(res.status).toBe(204);
  });

  it('GET /farms/:farmId/report → generateReport', async () => {
    const res = await request(app).get('/farms/farm-1/report');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ data: { url: expect.any(String) } });
  });

  it('GET /farms/:farmId/summary → getFarmSummary', async () => {
    const res = await request(app).get('/farms/farm-1/summary');
    expect(res.status).toBe(200);
  });
});
