import { validateBody, validateQuery } from '../../../src/middleware/validate';
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const testSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
});

function makeReqResMock(body: unknown = {}, query: unknown = {}, headers: Record<string, string> = {}) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const req = {
    body,
    query,
    headers,
  } as unknown as Request;
  const res = { status, json } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next, json, status };
}

describe('validateBody', () => {
  const middleware = validateBody(testSchema);

  it('calls next() and sets req.body when valid', () => {
    const { req, res, next } = makeReqResMock({ name: 'Alice', age: 30 });
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'Alice', age: 30 });
  });

  it('returns 400 with VALIDATION_ERROR when invalid', () => {
    const { req, res, next, status, json } = makeReqResMock({ name: '', age: -1 });
    middleware(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR', message_key: 'error.validation' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('includes fieldErrors in details', () => {
    const { req, res, next, json } = makeReqResMock({ name: 'x', age: 'not-a-number' });
    middleware(req, res, next);
    const body = (json.mock.calls[0] as [{ error: { details: unknown } }])[0];
    expect(body.error.details).toBeTruthy();
  });

  it('includes request_id from header', () => {
    const { req, res, next, json } = makeReqResMock({}, {}, { 'x-request-id': 'abc-123' });
    middleware(req, res, next);
    const body = (json.mock.calls[0] as [{ error: { request_id: string } }])[0];
    expect(body.error.request_id).toBe('abc-123');
  });
});

describe('validateQuery', () => {
  const querySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
  });
  const middleware = validateQuery(querySchema);

  it('calls next() when query is valid', () => {
    const { req, res, next } = makeReqResMock({}, { page: '2' });
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 when query fails validation', () => {
    const strictSchema = z.object({ status: z.enum(['active', 'sold']) });
    const m = validateQuery(strictSchema);
    const { req, res, next, status } = makeReqResMock({}, { status: 'invalid' });
    m(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
