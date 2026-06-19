import * as threadRepo from '../../../src/repositories/threadRepository';
import * as threadService from '../../../src/services/threadService';

jest.mock('../../../src/repositories/threadRepository', () => ({
  createThread: jest.fn(),
  findThreads: jest.fn(),
  countThreads: jest.fn(),
  findThreadById: jest.fn(),
  updateThread: jest.fn(),
  softDeleteThread: jest.fn(),
  incrementThreadUpvotes: jest.fn(),
}));

jest.mock('../../../src/events/producers/postCreatedProducer', () => ({
  publishPostCreated: jest.fn(),
}));

import { publishPostCreated } from '../../../src/events/producers/postCreatedProducer';

const mockCreateThread = jest.mocked(threadRepo.createThread);
const mockFindThreads = jest.mocked(threadRepo.findThreads);
const mockCountThreads = jest.mocked(threadRepo.countThreads);
const mockFindThreadById = jest.mocked(threadRepo.findThreadById);
const mockUpdateThread = jest.mocked(threadRepo.updateThread);
const mockSoftDeleteThread = jest.mocked(threadRepo.softDeleteThread);
const mockIncrementUpvotes = jest.mocked(threadRepo.incrementThreadUpvotes);
const mockPublishPostCreated = jest.mocked(publishPostCreated);

const fakeThread = {
  id: 'thread-1',
  authorId: 'author-1',
  title: 'How to treat maize rust?',
  body: 'My maize leaves have rust spots',
  category: 'plant_health',
  status: 'active',
  upvotes: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('threadService.createThread', () => {
  it('creates thread with active status when no blocked words', async () => {
    mockCreateThread.mockResolvedValue(fakeThread as never);
    mockPublishPostCreated.mockResolvedValue();

    const dto = { title: 'How to treat maize rust?', body: 'My maize has rust', category: 'crop_advice' as const };
    const result = await threadService.createThread('author-1', dto);

    expect(mockCreateThread).toHaveBeenCalledWith('author-1', dto, 'active');
    expect(mockPublishPostCreated).toHaveBeenCalledWith('thread-1', 'author-1', 'crop_advice');
    expect(result.id).toBe('thread-1');
  });

  it('creates thread with flagged status when blocked word detected', async () => {
    const flaggedThread = { ...fakeThread, status: 'flagged' };
    mockCreateThread.mockResolvedValue(flaggedThread as never);
    mockPublishPostCreated.mockResolvedValue();

    const dto = { title: 'spam title', body: 'spam content here', category: 'market_talk' as const };
    await threadService.createThread('author-1', dto);

    expect(mockCreateThread).toHaveBeenCalledWith('author-1', dto, 'flagged');
  });
});

describe('threadService.listThreads', () => {
  it('returns threads and total', async () => {
    mockFindThreads.mockResolvedValue([fakeThread] as never);
    mockCountThreads.mockResolvedValue(1);

    const query = { sort: 'newest' as const, page: 1, page_size: 20 };
    const result = await threadService.listThreads(query, { take: 20, skip: 0 });

    expect(result.threads).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('passes filter and pagination to repo', async () => {
    mockFindThreads.mockResolvedValue([]);
    mockCountThreads.mockResolvedValue(0);

    const query = { category: 'crop_advice' as const, sort: 'top' as const, page: 2, page_size: 10 };
    await threadService.listThreads(query, { take: 10, skip: 20 });

    expect(mockFindThreads).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'crop_advice', sort: 'top' }),
      { take: 10, skip: 20 },
    );
  });
});

describe('threadService.getThread', () => {
  it('returns the thread when found', async () => {
    mockFindThreadById.mockResolvedValue(fakeThread as never);

    const result = await threadService.getThread('thread-1');

    expect(result.id).toBe('thread-1');
  });

  it('throws 404 THREAD_NOT_FOUND when thread missing', async () => {
    mockFindThreadById.mockResolvedValue(null);

    await expect(threadService.getThread('ghost-id')).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'THREAD_NOT_FOUND',
    });
  });
});

describe('threadService.updateThread', () => {
  it('updates thread and returns refreshed data', async () => {
    mockFindThreadById.mockResolvedValue(fakeThread as never);
    mockUpdateThread.mockResolvedValue({ count: 1 } as never);

    const dto = { title: 'Updated title' };
    await threadService.updateThread('thread-1', 'author-1', 'farmer', dto);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', 'author-1', dto);
    expect(mockFindThreadById).toHaveBeenCalledTimes(2);
  });

  it('uses undefined ownerFilter for admin', async () => {
    mockFindThreadById.mockResolvedValue(fakeThread as never);
    mockUpdateThread.mockResolvedValue({ count: 1 } as never);

    await threadService.updateThread('thread-1', 'admin-id', 'admin', { title: 'X' });

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', undefined, { title: 'X' });
  });

  it('throws 403 FORBIDDEN when thread belongs to another user', async () => {
    mockFindThreadById.mockResolvedValue(fakeThread as never);
    mockUpdateThread.mockResolvedValue({ count: 0 } as never);

    await expect(
      threadService.updateThread('thread-1', 'other-user', 'farmer', { title: 'Hack' }),
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'FORBIDDEN' });
  });

  it('throws 404 when thread not found on initial check', async () => {
    mockFindThreadById.mockResolvedValue(null);

    await expect(
      threadService.updateThread('ghost', 'author-1', 'farmer', { title: 'X' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('threadService.deleteThread', () => {
  it('soft deletes the thread', async () => {
    mockFindThreadById.mockResolvedValue(fakeThread as never);
    mockSoftDeleteThread.mockResolvedValue({ count: 1 } as never);

    await threadService.deleteThread('thread-1', 'author-1', 'farmer');

    expect(mockSoftDeleteThread).toHaveBeenCalledWith('thread-1', 'author-1');
  });

  it('throws 403 FORBIDDEN when not authorized', async () => {
    mockFindThreadById.mockResolvedValue(fakeThread as never);
    mockSoftDeleteThread.mockResolvedValue({ count: 0 } as never);

    await expect(
      threadService.deleteThread('thread-1', 'intruder', 'farmer'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('threadService.upvoteThread', () => {
  it('increments upvotes when thread exists', async () => {
    mockFindThreadById.mockResolvedValue(fakeThread as never);
    mockIncrementUpvotes.mockResolvedValue({ ...fakeThread, upvotes: 1 } as never);

    await threadService.upvoteThread('thread-1');

    expect(mockIncrementUpvotes).toHaveBeenCalledWith('thread-1');
  });

  it('throws 404 when thread not found', async () => {
    mockFindThreadById.mockResolvedValue(null);

    await expect(threadService.upvoteThread('ghost')).rejects.toMatchObject({ statusCode: 404 });
  });
});
