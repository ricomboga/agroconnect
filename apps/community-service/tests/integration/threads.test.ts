/**
 * Integration tests for community-service thread endpoints.
 * Runs against a real PostgreSQL test database.
 * Kafka producers and auth middleware are mocked.
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

import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '@agroconnect/db/community';

async function clearAll() {
  await prisma.reply.deleteMany();
  await prisma.thread.deleteMany();
}

async function createTestThread(
  authorId = 'user-001',
  overrides: Record<string, unknown> = {},
) {
  return prisma.thread.create({
    data: {
      authorId,
      category: 'crop_advice',
      title: 'Test thread title',
      body: 'Test thread body content',
      status: 'active',
      ...overrides,
    },
  });
}

beforeAll(async () => { if (DB_UNAVAILABLE) return; await clearAll(); });
afterAll(async () => { if (DB_UNAVAILABLE) return; await clearAll(); await prisma.$disconnect(); });
afterEach(() => {
  shouldRejectAuth = false;
  mockUser.id = 'user-001';
  mockUser.role = 'farmer';
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /health
// ─────────────────────────────────────────────────────────────────────────────
d('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('community-service');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/community/threads
// ─────────────────────────────────────────────────────────────────────────────
d('POST /api/v1/community/threads', () => {
  afterEach(async () => { await clearAll(); });

  const PAYLOAD = {
    category: 'crop_advice',
    title: 'Best time to plant maize?',
    body: 'I am wondering when is the best season to plant maize in Nakuru.',
  };

  it('creates a thread and returns 201', async () => {
    const res = await request(app).post('/api/v1/community/threads').send(PAYLOAD);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      category: 'crop_advice',
      title: 'Best time to plant maize?',
      authorId: 'user-001',
      status: 'active',
    });
  });

  it('publishes community.post.created Kafka event', async () => {
    const { publishPostCreated } = jest.requireMock(
      '../../src/events/producers/postCreatedProducer',
    );
    (publishPostCreated as jest.Mock).mockClear();
    await request(app).post('/api/v1/community/threads').send(PAYLOAD);
    expect(publishPostCreated).toHaveBeenCalledTimes(1);
    expect(publishPostCreated).toHaveBeenCalledWith(
      expect.any(String),
      'user-001',
      'crop_advice',
    );
  });

  it('sets status to flagged when body contains blocked word', async () => {
    const res = await request(app).post('/api/v1/community/threads').send({
      ...PAYLOAD,
      body: 'This is a spam message about farming.',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('flagged');
  });

  it('returns 400 when category is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/community/threads')
      .send({ ...PAYLOAD, category: 'gossip' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when title is too short', async () => {
    const res = await request(app)
      .post('/api/v1/community/threads')
      .send({ ...PAYLOAD, title: 'Hi' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when body is too short', async () => {
    const res = await request(app)
      .post('/api/v1/community/threads')
      .send({ ...PAYLOAD, body: 'Short' });
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).post('/api/v1/community/threads').send(PAYLOAD);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/community/threads (public)
// ─────────────────────────────────────────────────────────────────────────────
d('GET /api/v1/community/threads', () => {
  beforeEach(async () => {
    await createTestThread('user-001', { category: 'crop_advice', county: 'Nakuru' });
    await createTestThread('user-002', { category: 'market_talk', county: 'Nairobi' });
  });
  afterEach(async () => { await clearAll(); });

  it('returns 200 with paginated threads (public, no auth)', async () => {
    shouldRejectAuth = true; // auth should not be required
    const res = await request(app).get('/api/v1/community/threads');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta).toMatchObject({ total: 2, page: 1 });
  });

  it('filters by category', async () => {
    const res = await request(app).get(
      '/api/v1/community/threads?category=crop_advice',
    );
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].category).toBe('crop_advice');
  });

  it('filters by county', async () => {
    const res = await request(app).get(
      '/api/v1/community/threads?county=Nairobi',
    );
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].county).toBe('Nairobi');
  });

  it('sorts by top upvotes', async () => {
    const res = await request(app).get('/api/v1/community/threads?sort=top');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 400 when category is invalid', async () => {
    const res = await request(app).get('/api/v1/community/threads?category=invalid');
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('respects pagination', async () => {
    const res = await request(app).get('/api/v1/community/threads?page=1&page_size=1');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.page_size).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/community/threads/:id (public)
// ─────────────────────────────────────────────────────────────────────────────
d('GET /api/v1/community/threads/:id', () => {
  let threadId: string;
  beforeEach(async () => {
    const t = await createTestThread();
    threadId = t.id;
  });
  afterEach(async () => { await clearAll(); });

  it('returns thread (public, no auth)', async () => {
    shouldRejectAuth = true;
    const res = await request(app).get(`/api/v1/community/threads/${threadId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(threadId);
  });

  it('returns 404 for non-existent thread', async () => {
    const res = await request(app).get(
      '/api/v1/community/threads/00000000-0000-0000-0000-000000000000',
    );
    expect(res.status).toBe(404);
    expect(res.body.error_code).toBe('THREAD_NOT_FOUND');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/community/threads/:id
// ─────────────────────────────────────────────────────────────────────────────
d('PATCH /api/v1/community/threads/:id', () => {
  let threadId: string;
  beforeEach(async () => {
    const t = await createTestThread('user-001');
    threadId = t.id;
  });
  afterEach(async () => { await clearAll(); });

  it('updates thread title and returns 200', async () => {
    const res = await request(app)
      .patch(`/api/v1/community/threads/${threadId}`)
      .send({ title: 'Updated title here' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated title here');
  });

  it('returns 400 when body is empty object', async () => {
    const res = await request(app)
      .patch(`/api/v1/community/threads/${threadId}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 when another user tries to update', async () => {
    mockUser.id = 'user-002';
    const res = await request(app)
      .patch(`/api/v1/community/threads/${threadId}`)
      .send({ title: 'Hijack this title' });
    expect(res.status).toBe(403);
    expect(res.body.error_code).toBe('FORBIDDEN');
  });

  it('admin can update any thread', async () => {
    mockUser.id = 'admin-001';
    mockUser.role = 'admin';
    const res = await request(app)
      .patch(`/api/v1/community/threads/${threadId}`)
      .send({ title: 'Admin updated title' });
    expect(res.status).toBe(200);
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app)
      .patch(`/api/v1/community/threads/${threadId}`)
      .send({ title: 'X title update here' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/community/threads/:id
// ─────────────────────────────────────────────────────────────────────────────
d('DELETE /api/v1/community/threads/:id', () => {
  let threadId: string;
  beforeEach(async () => {
    const t = await createTestThread('user-001');
    threadId = t.id;
  });
  afterEach(async () => { await clearAll(); });

  it('soft-deletes thread and returns 204', async () => {
    const res = await request(app).delete(`/api/v1/community/threads/${threadId}`);
    expect(res.status).toBe(204);
    // Deleted thread not visible in GET
    const get = await request(app).get(`/api/v1/community/threads/${threadId}`);
    expect(get.status).toBe(404);
  });

  it('returns 403 when another user tries to delete', async () => {
    mockUser.id = 'user-002';
    const res = await request(app).delete(`/api/v1/community/threads/${threadId}`);
    expect(res.status).toBe(403);
  });

  it('admin can delete any thread', async () => {
    mockUser.id = 'admin-001';
    mockUser.role = 'admin';
    const res = await request(app).delete(`/api/v1/community/threads/${threadId}`);
    expect(res.status).toBe(204);
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).delete(`/api/v1/community/threads/${threadId}`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/community/threads/:id/upvote
// ─────────────────────────────────────────────────────────────────────────────
d('POST /api/v1/community/threads/:id/upvote', () => {
  let threadId: string;
  beforeEach(async () => {
    const t = await createTestThread();
    threadId = t.id;
  });
  afterEach(async () => { await clearAll(); });

  it('increments upvotes and returns 200', async () => {
    const res = await request(app).post(`/api/v1/community/threads/${threadId}/upvote`);
    expect(res.status).toBe(200);
    expect(res.body.data.upvotes).toBe(1);
  });

  it('returns 404 for non-existent thread', async () => {
    const res = await request(app).post(
      '/api/v1/community/threads/00000000-0000-0000-0000-000000000000/upvote',
    );
    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    shouldRejectAuth = true;
    const res = await request(app).post(`/api/v1/community/threads/${threadId}/upvote`);
    expect(res.status).toBe(401);
  });
});
