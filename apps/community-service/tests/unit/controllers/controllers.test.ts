import { Request, Response, NextFunction } from 'express';
import * as threadService from '../../../src/services/threadService';
import * as replyService from '../../../src/services/replyService';
import * as threadController from '../../../src/controllers/threadController';
import * as replyController from '../../../src/controllers/replyController';

jest.mock('../../../src/services/threadService', () => ({
  createThread: jest.fn(),
  listThreads: jest.fn(),
  getThread: jest.fn(),
  updateThread: jest.fn(),
  deleteThread: jest.fn(),
  upvoteThread: jest.fn(),
}));

jest.mock('../../../src/services/replyService', () => ({
  createReply: jest.fn(),
  listReplies: jest.fn(),
  upvoteReply: jest.fn(),
  verifyReply: jest.fn(),
  reportReply: jest.fn(),
}));

const mockCreateThread = jest.mocked(threadService.createThread);
const mockListThreads = jest.mocked(threadService.listThreads);
const mockGetThread = jest.mocked(threadService.getThread);
const mockUpdateThread = jest.mocked(threadService.updateThread);
const mockDeleteThread = jest.mocked(threadService.deleteThread);
const mockUpvoteThread = jest.mocked(threadService.upvoteThread);
const mockCreateReply = jest.mocked(replyService.createReply);
const mockListReplies = jest.mocked(replyService.listReplies);
const mockUpvoteReply = jest.mocked(replyService.upvoteReply);
const mockVerifyReply = jest.mocked(replyService.verifyReply);
const mockReportReply = jest.mocked(replyService.reportReply);

const fakeThread = { id: 'thread-1', title: 'How to treat rust?', authorId: 'user-1', category: 'crop_advice', upvotes: 0 };
const fakeReply = { id: 'reply-1', threadId: 'thread-1', authorId: 'user-1', body: 'Use copper fungicide' };

function makeAuthReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user-1', role: 'farmer', phone: '+254700000001' },
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}

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

// ─── threadController ────────────────────────────────────────────────────────

describe('threadController.createThread', () => {
  it('creates thread and responds 201', async () => {
    mockCreateThread.mockResolvedValue(fakeThread as never);

    const req = makeAuthReq({ body: { title: 'How to treat rust?', body: 'Maize has rust', category: 'crop_advice' } });
    const res = makeRes();

    await threadController.createThread(req as never, res, next);

    expect(mockCreateThread).toHaveBeenCalledWith('user-1', req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeThread });
  });

  it('forwards errors to next', async () => {
    mockCreateThread.mockRejectedValue(new Error('Validation error'));
    await threadController.createThread(makeAuthReq() as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('threadController.listThreads', () => {
  it('returns threads with pagination meta', async () => {
    mockListThreads.mockResolvedValue({ threads: [fakeThread], total: 1 } as never);

    const req = { query: { page: '1', page_size: '20' } } as unknown as Request;
    const res = makeRes();

    await threadController.listThreads(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: [fakeThread],
      meta: expect.objectContaining({ total: 1, page_size: 20 }),
    });
  });

  it('forwards errors to next', async () => {
    mockListThreads.mockRejectedValue(new Error('DB error'));
    await threadController.listThreads({ query: {} } as Request, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('threadController.getThread', () => {
  it('returns the thread', async () => {
    mockGetThread.mockResolvedValue(fakeThread as never);

    const req = { params: { id: 'thread-1' } } as unknown as Request;
    const res = makeRes();

    await threadController.getThread(req, res, next);

    expect(mockGetThread).toHaveBeenCalledWith('thread-1');
    expect(res.json).toHaveBeenCalledWith({ data: fakeThread });
  });

  it('forwards errors to next', async () => {
    mockGetThread.mockRejectedValue(new Error('Not found'));
    await threadController.getThread({ params: { id: 'ghost' } } as unknown as Request, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('threadController.updateThread', () => {
  it('updates thread and returns updated record', async () => {
    mockUpdateThread.mockResolvedValue({ ...fakeThread, title: 'Updated title' } as never);

    const req = makeAuthReq({ params: { id: 'thread-1' }, body: { title: 'Updated title' } });
    const res = makeRes();

    await threadController.updateThread(req as never, res, next);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', 'user-1', 'farmer', { title: 'Updated title' });
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ title: 'Updated title' }) });
  });

  it('forwards errors to next', async () => {
    mockUpdateThread.mockRejectedValue(new Error('Forbidden'));
    await threadController.updateThread(makeAuthReq({ params: { id: 'x' } }) as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('threadController.deleteThread', () => {
  it('deletes thread and responds 204', async () => {
    mockDeleteThread.mockResolvedValue(undefined);

    const req = makeAuthReq({ params: { id: 'thread-1' } });
    const res = makeRes();

    await threadController.deleteThread(req as never, res, next);

    expect(mockDeleteThread).toHaveBeenCalledWith('thread-1', 'user-1', 'farmer');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('forwards errors to next', async () => {
    mockDeleteThread.mockRejectedValue(new Error('Forbidden'));
    await threadController.deleteThread(makeAuthReq({ params: { id: 'x' } }) as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('threadController.upvoteThread', () => {
  it('upvotes thread and returns updated record', async () => {
    mockUpvoteThread.mockResolvedValue({ ...fakeThread, upvotes: 1 } as never);

    const req = makeAuthReq({ params: { id: 'thread-1' } });
    const res = makeRes();

    await threadController.upvoteThread(req as never, res, next);

    expect(mockUpvoteThread).toHaveBeenCalledWith('thread-1');
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ upvotes: 1 }) });
  });

  it('forwards errors to next', async () => {
    mockUpvoteThread.mockRejectedValue(new Error('Not found'));
    await threadController.upvoteThread(makeAuthReq({ params: { id: 'x' } }) as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── replyController ─────────────────────────────────────────────────────────

describe('replyController.createReply', () => {
  it('creates reply and responds 201', async () => {
    mockCreateReply.mockResolvedValue(fakeReply as never);

    const req = makeAuthReq({ params: { id: 'thread-1' }, body: { body: 'Use copper fungicide' } });
    const res = makeRes();

    await replyController.createReply(req as never, res, next);

    expect(mockCreateReply).toHaveBeenCalledWith('thread-1', 'user-1', req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeReply });
  });

  it('forwards errors to next', async () => {
    mockCreateReply.mockRejectedValue(new Error('Thread not found'));
    await replyController.createReply(makeAuthReq({ params: { id: 'x' } }) as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('replyController.listReplies', () => {
  it('returns replies with pagination meta', async () => {
    mockListReplies.mockResolvedValue({ replies: [fakeReply], total: 1 } as never);

    const req = { params: { id: 'thread-1' }, query: {} } as unknown as Request;
    const res = makeRes();

    await replyController.listReplies(req, res, next);

    expect(mockListReplies).toHaveBeenCalledWith('thread-1', { take: 20, skip: 0 });
    expect(res.json).toHaveBeenCalledWith({
      data: [fakeReply],
      meta: expect.objectContaining({ total: 1 }),
    });
  });

  it('forwards errors to next', async () => {
    mockListReplies.mockRejectedValue(new Error('Thread not found'));
    await replyController.listReplies({ params: { id: 'x' }, query: {} } as unknown as Request, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('replyController.upvoteReply', () => {
  it('upvotes reply and returns updated record', async () => {
    mockUpvoteReply.mockResolvedValue({ ...fakeReply, upvotes: 1 } as never);

    const req = makeAuthReq({ params: { replyId: 'reply-1' } });
    const res = makeRes();

    await replyController.upvoteReply(req as never, res, next);

    expect(mockUpvoteReply).toHaveBeenCalledWith('reply-1');
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ upvotes: 1 }) });
  });

  it('forwards errors to next', async () => {
    mockUpvoteReply.mockRejectedValue(new Error('Not found'));
    await replyController.upvoteReply(makeAuthReq({ params: { replyId: 'x' } }) as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('replyController.verifyReply', () => {
  it('verifies reply and returns updated record', async () => {
    mockVerifyReply.mockResolvedValue({ ...fakeReply, verified: true } as never);

    const req = makeAuthReq({ params: { replyId: 'reply-1' }, user: { id: 'vet-1', role: 'vet_officer', phone: '' } });
    const res = makeRes();

    await replyController.verifyReply(req as never, res, next);

    expect(mockVerifyReply).toHaveBeenCalledWith('reply-1', 'vet_officer');
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ verified: true }) });
  });

  it('forwards errors to next', async () => {
    mockVerifyReply.mockRejectedValue(new Error('Forbidden'));
    await replyController.verifyReply(makeAuthReq({ params: { replyId: 'x' } }) as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('replyController.reportReply', () => {
  it('reports reply and returns updated record', async () => {
    mockReportReply.mockResolvedValue({ ...fakeReply, status: 'flagged' } as never);

    const req = makeAuthReq({ params: { replyId: 'reply-1' } });
    const res = makeRes();

    await replyController.reportReply(req as never, res, next);

    expect(mockReportReply).toHaveBeenCalledWith('reply-1');
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'flagged' }) });
  });

  it('forwards errors to next', async () => {
    mockReportReply.mockRejectedValue(new Error('Not found'));
    await replyController.reportReply(makeAuthReq({ params: { replyId: 'x' } }) as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
