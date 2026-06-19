/**
 * Integration tests for community-service reply endpoints.
 * Kafka producers and auth middleware are mocked.
 * Socket.IO is mocked so no real WS server is needed.
 */

const DB_UNAVAILABLE = process.env['COMMUNITY_TEST_DB_UNAVAILABLE'] === '1';
const d = DB_UNAVAILABLE ? describe.skip : describe;
if (DB_UNAVAILABLE) {
  test.skip('Skipping integration tests: database not available', () => {});
}

let shouldRejectAuth = false;
const mockUser = { id: 'user-001', role: 'farmer' };

jest.mock('@agroconnect/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('@agroconnect/shared');
  return {
    ...actual,
    authenticate: (req: any, res: any, next: any) => {
      if (shouldRejectAuth) {
        return res.status(401).json({
          error_code: 'UNAUTHORIZED',
          message_key: 'error.unauthorized',
          request_id: req.headers['x-request-id'] ?? '',
          timestamp: new Date().toISOString(),
        });
      }
      req.user = { id: mockUser.id, role: mockUser.role };
      next();
    },
  };
});

jest.mock('../../src/events/producers/postCreatedProducer', () => ({
  publishPostCreated: jest.fn().mockResolvedValue(undefined),
}));

// Mock socket.io so new_reply emission doesn't require a live WS server
const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
jest.mock('../../src/socket', () => ({
  initIo: jest.fn(),
  getIo: jest.fn().mockReturnValue({ to: mockTo }),
}));

import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '@agroconnect/db/community';

async function clearAll() {
  await prisma.reply.deleteMany();
  await prisma.thread.deleteMany();
}

async function createTestThread(authorId = 'user-001') {
  return prisma.thread.create({
    data: {
      authorId,
      category: 'crop_advice',
      title: 'Test thread for replies',
      body: 'Test thread body text here.',
      status: 'active',
    },
  });
}

async function createTestReply(threadId: string, authorId = 'user-001') {
  return prisma.reply.create({
    data: {
      threadId,
      authorId,
      body: 'This is a test reply body.',
      status: 'active',
    },
  });
}

beforeAll(async () => { if (DB_UNAVAILABLE) return; await clearAll(); });
afterAll(async () => { if (DB_UNAVAILABLE) return; await clearAll(); await prisma.$disconnect(); });
afterEach(() => {
  shouldRejectAuth = false;
  mockUser.id = 'user-001';
  mockUser.role = 'farmer';
  mockEmit.mockClear();
  mockTo.mockClear();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/community/threads/:id/replies
// ─────────────────────────────────────────────────────────────────────────────
d('POST /api/v1/community/threads/:id/replies', () => {
  let threadId: string;
  beforeEach(async () => { const t = await createTestThread(); threadId = t.id; });
  afterEach(async () => { await clearAll(); });

  it('creates a reply and returns 201', async () => {
    const res = await request(app)
      .post(`/api/v1/community/threads/${threadId}/replies`)
      .send({ body: 'Plant maize in March before the long rains.' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      threadId,
      authorId: 'user-001',
      status: 'active',
    });
  });

  it('emits new_reply to the thread room via Socket.IO', async () => {
    await request(app)
      .post(`/api/v1/community/threads/${threadId}/replies`)
      .send({ body: 'Plant maize in March before the long rains.' });
    expect(mockTo).toHaveBeenCalledWith(`thread:${threadId}`);
    expect(mockEmit).toHaveBeenCalledWith('new_reply', expect.objectContaining({ threadId }));
  });

  it('sets reply status to flagged when body contains blocked word', async () => {
    const res = await request(app)
      .post(`/api/v1/community/threads/${threadId}/replies`)
      .send({ body: 'This is a spam message to ignore completely.' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('flagged');
  });

  it('returns 400 when body is too short', async () => {
    const res = await request(app)
      .post(`/api/v1/community/threads/${threadId}/replies`)
      .send({ body: 'Hi' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when thread does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/community/threads/00000000-0000-0000-0000-000000000000/replies')
      .send({ body: 'This is a reply to a missing thread.' });
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('THREAD_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app)
      .post(`/api/v1/community/threads/${threadId}/replies`)
      .send({ body: 'Plant maize in March before the long rains.' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/community/threads/:id/replies (public)
// ─────────────────────────────────────────────────────────────────────────────
d('GET /api/v1/community/threads/:id/replies', () => {
  let threadId: string;
  beforeEach(async () => {
    const t = await createTestThread();
    threadId = t.id;
    await createTestReply(threadId);
  });
  afterEach(async () => { await clearAll(); });

  it('returns replies (public, no auth)', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get(`/api/v1/community/threads/${threadId}/replies`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('returns 404 when thread does not exist', async () => {
    const res = await request(app).get(
      '/api/v1/community/threads/00000000-0000-0000-0000-000000000000/replies',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('THREAD_NOT_FOUND');
  });

  it('respects pagination', async () => {
    const res = await request(app).get(
      `/api/v1/community/threads/${threadId}/replies?page=1&page_size=1`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.page_size).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/community/replies/:replyId/upvote
// ─────────────────────────────────────────────────────────────────────────────
d('POST /api/v1/community/replies/:replyId/upvote', () => {
  let threadId: string;
  let replyId: string;
  beforeEach(async () => {
    const t = await createTestThread();
    threadId = t.id;
    const r = await createTestReply(threadId);
    replyId = r.id;
  });
  afterEach(async () => { await clearAll(); });

  it('increments upvotes and returns 200', async () => {
    const res = await request(app).post(`/api/v1/community/replies/${replyId}/upvote`);
    expect(res.status).toBe(200);
    expect(res.body.data.upvotes).toBe(1);
  });

  it('returns 404 for non-existent reply', async () => {
    const res = await request(app).post(
      '/api/v1/community/replies/00000000-0000-0000-0000-000000000000/upvote',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('REPLY_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).post(`/api/v1/community/replies/${replyId}/upvote`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/community/replies/:replyId/verify
// ─────────────────────────────────────────────────────────────────────────────
d('POST /api/v1/community/replies/:replyId/verify', () => {
  let threadId: string;
  let replyId: string;
  beforeEach(async () => {
    const t = await createTestThread();
    threadId = t.id;
    const r = await createTestReply(threadId);
    replyId = r.id;
  });
  afterEach(async () => { await clearAll(); });

  it('marks reply expert-verified when caller is extension_officer', async () => {
    mockUser.role = 'extension_officer';
    const res = await request(app).post(`/api/v1/community/replies/${replyId}/verify`);
    expect(res.status).toBe(200);
    expect(res.body.data.isExpertVerified).toBe(true);
  });

  it('marks reply expert-verified when caller is vet_officer', async () => {
    mockUser.role = 'vet_officer';
    const res = await request(app).post(`/api/v1/community/replies/${replyId}/verify`);
    expect(res.status).toBe(200);
    expect(res.body.data.isExpertVerified).toBe(true);
  });

  it('returns 403 when caller is a farmer', async () => {
    mockUser.role = 'farmer';
    const res = await request(app).post(`/api/v1/community/replies/${replyId}/verify`);
    expect(res.status).toBe(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });

  it('returns 403 when caller is a buyer', async () => {
    mockUser.role = 'buyer';
    const res = await request(app).post(`/api/v1/community/replies/${replyId}/verify`);
    expect(res.status).toBe(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });

  it('returns 404 for non-existent reply', async () => {
    mockUser.role = 'extension_officer';
    const res = await request(app).post(
      '/api/v1/community/replies/00000000-0000-0000-0000-000000000000/verify',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('REPLY_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).post(`/api/v1/community/replies/${replyId}/verify`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/community/replies/:replyId/report
// ─────────────────────────────────────────────────────────────────────────────
d('POST /api/v1/community/replies/:replyId/report', () => {
  let threadId: string;
  let replyId: string;
  beforeEach(async () => {
    const t = await createTestThread();
    threadId = t.id;
    const r = await createTestReply(threadId);
    replyId = r.id;
  });
  afterEach(async () => { await clearAll(); });

  it('flags the reply and returns 200', async () => {
    const res = await request(app).post(`/api/v1/community/replies/${replyId}/report`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('flagged');
  });

  it('returns 404 for non-existent reply', async () => {
    const res = await request(app).post(
      '/api/v1/community/replies/00000000-0000-0000-0000-000000000000/report',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('REPLY_NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).post(`/api/v1/community/replies/${replyId}/report`);
    expect(res.status).toBe(401);
  });
});
