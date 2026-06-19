import { createError, errorHandler, AppError } from '../../../src/middleware/errorHandler';
import { Request, Response, NextFunction } from 'express';

jest.mock('../../../src/logger', () => ({
  logger: { error: jest.fn() },
}));

function makeReqResMock(overrides: Partial<Request> = {}): { req: Request; res: Response; next: NextFunction; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const req = {
    headers: { 'x-request-id': 'req-001' },
    path: '/test',
    method: 'GET',
    ...overrides,
  } as unknown as Request;
  const res = { status, json } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next, json, status };
}

describe('createError', () => {
  it('creates an error with correct properties', () => {
    const err = createError('Not found', 404, 'NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBe('NOT_FOUND');
    expect(err.messageKey).toBe('error.not_found');
  });

  it('accepts explicit messageKey', () => {
    const err = createError('Bad', 400, 'BAD_REQUEST', 'errors.custom.key');
    expect(err.messageKey).toBe('errors.custom.key');
  });

  it('is an instance of Error', () => {
    expect(createError('x', 500, 'ERR')).toBeInstanceOf(Error);
  });
});

describe('errorHandler', () => {
  it('returns nested error structure with status 404', () => {
    const { req, res, next, status, json } = makeReqResMock();
    const err = createError('Listing not found', 404, 'LISTING_NOT_FOUND');
    errorHandler(err, req, res, next);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'LISTING_NOT_FOUND',
          message_key: 'error.listing_not_found',
          request_id: 'req-001',
        }),
      }),
    );
  });

  it('defaults to 500 INTERNAL_ERROR for plain Error', () => {
    const { req, res, next, status } = makeReqResMock();
    errorHandler(new Error('oops') as AppError, req, res, next);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('includes null details', () => {
    const { req, res, next, json } = makeReqResMock();
    errorHandler(createError('x', 400, 'X'), req, res, next);
    const body = (json.mock.calls[0] as [{ error: { details: unknown } }])[0];
    expect(body.error.details).toBeNull();
  });

  it('handles missing x-request-id header', () => {
    const { res, next, json } = makeReqResMock();
    const req = { headers: {}, path: '/', method: 'GET' } as Request;
    errorHandler(createError('x', 400, 'X'), req, res, next);
    const body = (json.mock.calls[0] as [{ error: { request_id: string } }])[0];
    expect(body.error.request_id).toBe('');
  });
});
