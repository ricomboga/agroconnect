import { Request, Response, NextFunction } from 'express';
import * as adminModerationRepo from '../../../src/repositories/adminModerationRepository';
import * as moderationController from '../../../src/controllers/internalModerationController';

jest.mock('../../../src/repositories/adminModerationRepository', () => ({
  findFlaggedThreads: jest.fn(),
  countFlaggedThreads: jest.fn(),
  setThreadStatus: jest.fn(),
}));

const mockFindFlaggedThreads = jest.mocked(adminModerationRepo.findFlaggedThreads);
const mockCountFlaggedThreads = jest.mocked(adminModerationRepo.countFlaggedThreads);
const mockSetThreadStatus = jest.mocked(adminModerationRepo.setThreadStatus);

function makeRes(): Response {
  const res = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

const next = jest.fn() as NextFunction;
beforeEach(() => jest.clearAllMocks());

describe('internalModerationController.listFlaggedHandler', () => {
  it('returns flagged threads with pagination meta', async () => {
    const fakeThreads = [{ id: 'thread-1', status: 'flagged' }];
    mockFindFlaggedThreads.mockResolvedValue(fakeThreads as never);
    mockCountFlaggedThreads.mockResolvedValue(1);

    const req = { query: { page: '1', page_size: '20' } } as unknown as Request;
    const res = makeRes();

    await moderationController.listFlaggedHandler(req, res, next);

    expect(mockFindFlaggedThreads).toHaveBeenCalledWith({ take: 20, skip: 0 });
    expect(res.json).toHaveBeenCalledWith({
      data: fakeThreads,
      meta: { total: 1, page: 1, page_size: 20 },
    });
  });

  it('defaults to page 1 when page is not provided', async () => {
    mockFindFlaggedThreads.mockResolvedValue([]);
    mockCountFlaggedThreads.mockResolvedValue(0);

    const req = { query: {} } as unknown as Request;
    const res = makeRes();

    await moderationController.listFlaggedHandler(req, res, next);

    expect(mockFindFlaggedThreads).toHaveBeenCalledWith({ take: 20, skip: 0 });
  });

  it('forwards errors to next', async () => {
    mockFindFlaggedThreads.mockRejectedValue(new Error('DB error'));
    await moderationController.listFlaggedHandler({ query: {} } as unknown as Request, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('internalModerationController.moderatePostHandler', () => {
  it('sets thread status and responds with success', async () => {
    mockSetThreadStatus.mockResolvedValue(undefined);

    const req = {
      params: { postId: 'thread-1' },
      body: { status: 'active' },
    } as unknown as Request;
    const res = makeRes();

    await moderationController.moderatePostHandler(req, res, next);

    expect(mockSetThreadStatus).toHaveBeenCalledWith('thread-1', 'active');
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('throws 404 POST_NOT_FOUND when setThreadStatus throws', async () => {
    mockSetThreadStatus.mockRejectedValue(new Error('Record not found'));

    const req = {
      params: { postId: 'ghost' },
      body: { status: 'deleted' },
    } as unknown as Request;

    await moderationController.moderatePostHandler(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, errorCode: 'POST_NOT_FOUND' }),
    );
  });
});
