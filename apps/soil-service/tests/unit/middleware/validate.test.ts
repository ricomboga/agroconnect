import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../../../src/middleware/validate';

function makeResMock() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function makeReqMock(body = {}, query = {}, headers = {}): Request {
  return { body, query, headers } as unknown as Request;
}

const schema = z.object({ name: z.string().min(1) });

describe('validateBody', () => {
  it('calls next() when body passes schema', () => {
    const req = makeReqMock({ name: 'test' });
    const res = makeResMock();
    const next = jest.fn() as NextFunction;

    validateBody(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('sets req.body to parsed data (coerced values)', () => {
    const schemaWithDefault = z.object({ count: z.coerce.number().default(5) });
    const req = makeReqMock({});
    const res = makeResMock();
    const next = jest.fn() as NextFunction;

    validateBody(schemaWithDefault)(req, res, next);

    expect(req.body.count).toBe(5);
  });

  it('returns 400 with VALIDATION_ERROR when body is invalid', () => {
    const req = makeReqMock({ name: '' });
    const res = makeResMock();
    const next = jest.fn() as NextFunction;

    validateBody(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error_code: 'VALIDATION_ERROR' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('includes details with field errors in the 400 response', () => {
    const req = makeReqMock({});
    const res = makeResMock();
    const next = jest.fn() as NextFunction;

    validateBody(schema)(req, res, next);

    const call = (res.json as jest.Mock).mock.calls[0][0];
    expect(call.details).toBeDefined();
  });
});

describe('validateQuery', () => {
  it('calls next() when query passes schema', () => {
    const req = makeReqMock({}, { name: 'ok' });
    const res = makeResMock();
    const next = jest.fn() as NextFunction;

    validateQuery(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when query is invalid', () => {
    const req = makeReqMock({}, { name: '' });
    const res = makeResMock();
    const next = jest.fn() as NextFunction;

    validateQuery(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.query to parsed data', () => {
    const req = makeReqMock({}, { name: 'hi' });
    const res = makeResMock();
    const next = jest.fn() as NextFunction;

    validateQuery(schema)(req, res, next);

    expect(req.query).toEqual({ name: 'hi' });
  });
});
