import { Request, Response, NextFunction } from 'express';
import { errorHandler, createError, AppError } from '../../../src/middleware/errorHandler';

function makeResMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

function makeReqMock(headers: Record<string, string> = {}): Request {
  return { headers, path: '/test', method: 'GET' } as unknown as Request;
}

describe('createError', () => {
  it('creates an Error with the correct properties', () => {
    const err = createError('Not found', 404, 'NOT_FOUND', 'error.not_found');
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBe('NOT_FOUND');
    expect(err.messageKey).toBe('error.not_found');
  });
});

describe('errorHandler', () => {
  it('responds with statusCode and error fields from AppError', () => {
    const err: AppError = createError('Oops', 422, 'BUSINESS_ERROR', 'error.business');
    const req = makeReqMock({ 'x-request-id': 'req-abc' });
    const res = makeResMock();
    const next = jest.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error_code).toBe('BUSINESS_ERROR');
    expect(payload.message_key).toBe('error.business');
    expect(payload.request_id).toBe('req-abc');
    expect(payload.timestamp).toBeDefined();
  });

  it('defaults to 500 / INTERNAL_ERROR for plain Error', () => {
    const err = new Error('boom') as AppError;
    const req = makeReqMock();
    const res = makeResMock();
    const next = jest.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error_code).toBe('INTERNAL_ERROR');
  });

  it('returns empty string for request_id when header is absent', () => {
    const err = new Error('test') as AppError;
    const req = makeReqMock({});
    const res = makeResMock();
    const next = jest.fn() as NextFunction;

    errorHandler(err, req, res, next);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.request_id).toBe('');
  });
});
