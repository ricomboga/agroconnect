import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../../../src/middleware/validate';

const testSchema = z.object({
  name: z.string().min(1),
  count: z.coerce.number().int().positive(),
});

function makeRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validateBody', () => {
  const middleware = validateBody(testSchema);

  it('calls next() and sets req.body to parsed data on success', () => {
    const req = { body: { name: 'Nakuru Farm', count: 3 } } as Request;
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // no error argument
    expect(req.body).toEqual({ name: 'Nakuru Farm', count: 3 });
  });

  it('returns 400 VALIDATION_ERROR when body is missing a required field', () => {
    const req = { body: { count: 3 }, headers: {} } as Request;
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error_code: 'VALIDATION_ERROR', message_key: 'error.validation' }),
    );
  });

  it('returns 400 with Zod flatten details in the response', () => {
    const req = { body: { name: '', count: -1 }, headers: {} } as Request;
    const res = makeRes();

    validateBody(testSchema)(req, res, jest.fn());

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.details).toBeDefined();
    expect(payload.details.fieldErrors).toBeDefined();
  });

  it('does not call next() on validation failure', () => {
    const req = { body: {}, headers: {} } as Request;
    const next = jest.fn() as NextFunction;

    validateBody(testSchema)(req, makeRes(), next);

    expect(next).not.toHaveBeenCalled();
  });

  it('includes timestamp and request_id in error response', () => {
    const req = {
      body: {},
      headers: { 'x-request-id': 'req-abc' },
    } as unknown as Request;
    const res = makeRes();

    validateBody(testSchema)(req, res, jest.fn());

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.timestamp).toBeDefined();
    expect(payload.request_id).toBe('req-abc');
  });
});

describe('validateQuery', () => {
  const middleware = validateQuery(testSchema);

  it('calls next() and sets req.query to parsed data on success', () => {
    const req = { query: { name: 'field-a', count: '5' }, headers: {} } as unknown as Request;
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req.query as unknown as { count: number }).count).toBe(5); // coerced to number
  });

  it('returns 400 VALIDATION_ERROR when a required query param is absent', () => {
    const req = { query: {}, headers: {} } as Request;
    const res = makeRes();

    middleware(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error_code: 'VALIDATION_ERROR' }),
    );
  });
});
