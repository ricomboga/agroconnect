import * as replyRepo from '../../../src/repositories/replyRepository';
import * as threadRepo from '../../../src/repositories/threadRepository';
import * as replyService from '../../../src/services/replyService';

jest.mock('../../../src/repositories/replyRepository', () => ({
  createReply: jest.fn(),
  findRepliesByThread: jest.fn(),
  countRepliesByThread: jest.fn(),
  findReplyById: jest.fn(),
  incrementReplyUpvotes: jest.fn(),
  setExpertVerified: jest.fn(),
  flagReply: jest.fn(),
}));

jest.mock('../../../src/repositories/threadRepository', () => ({
  createThread: jest.fn(),
  findThreads: jest.fn(),
  countThreads: jest.fn(),
  findThreadById: jest.fn(),
  updateThread: jest.fn(),
  softDeleteThread: jest.fn(),
  incrementThreadUpvotes: jest.fn(),
}));

jest.mock('../../../src/socket', () => ({
  getIo: jest.fn().mockReturnValue(null),
}));

const mockCreateReply = jest.mocked(replyRepo.createReply);
const mockFindRepliesByThread = jest.mocked(replyRepo.findRepliesByThread);
const mockCountRepliesByThread = jest.mocked(replyRepo.countRepliesByThread);
const mockFindReplyById = jest.mocked(replyRepo.findReplyById);
const mockIncrementUpvotes = jest.mocked(replyRepo.incrementReplyUpvotes);
const mockSetExpertVerified = jest.mocked(replyRepo.setExpertVerified);
const mockFlagReply = jest.mocked(replyRepo.flagReply);
const mockFindThreadById = jest.mocked(threadRepo.findThreadById);

const fakeThread = { id: 'thread-1', status: 'active' };
const fakeReply = {
  id: 'reply-1',
  threadId: 'thread-1',
  authorId: 'author-1',
  body: 'Use copper fungicide on the leaves',
  status: 'active',
  expertVerified: false,
  upvotes: 0,
  createdAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('replyService.createReply', () => {
  it('creates reply with active status when no blocked words', async () => {
    mockFindThreadById.mockResolvedValue(fakeThread as never);
    mockCreateReply.mockResolvedValue(fakeReply as never);

    const dto = { body: 'Use copper fungicide' };
    const result = await replyService.createReply('thread-1', 'author-1', dto);

    expect(mockCreateReply).toHaveBeenCalledWith('thread-1', 'author-1', dto, 'active');
    expect(result.id).toBe('reply-1');
  });

  it('flags reply when blocked word detected in body', async () => {
    mockFindThreadById.mockResolvedValue(fakeThread as never);
    mockCreateReply.mockResolvedValue({ ...fakeReply, status: 'flagged' } as never);

    const dto = { body: 'This is a scam product' };
    await replyService.createReply('thread-1', 'author-1', dto);

    expect(mockCreateReply).toHaveBeenCalledWith('thread-1', 'author-1', dto, 'flagged');
  });

  it('throws 404 THREAD_NOT_FOUND when thread missing', async () => {
    mockFindThreadById.mockResolvedValue(null);

    await expect(
      replyService.createReply('ghost-thread', 'author-1', { body: 'Hi' }),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'THREAD_NOT_FOUND' });
  });
});

describe('replyService.listReplies', () => {
  it('returns replies and total for a thread', async () => {
    mockFindThreadById.mockResolvedValue(fakeThread as never);
    mockFindRepliesByThread.mockResolvedValue([fakeReply] as never);
    mockCountRepliesByThread.mockResolvedValue(1);

    const result = await replyService.listReplies('thread-1', { take: 20, skip: 0 });

    expect(result.replies).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('throws 404 when thread not found', async () => {
    mockFindThreadById.mockResolvedValue(null);

    await expect(
      replyService.listReplies('ghost-thread', { take: 20, skip: 0 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('replyService.upvoteReply', () => {
  it('increments upvotes when reply exists', async () => {
    mockFindReplyById.mockResolvedValue(fakeReply as never);
    mockIncrementUpvotes.mockResolvedValue({ ...fakeReply, upvotes: 1 } as never);

    await replyService.upvoteReply('reply-1');

    expect(mockIncrementUpvotes).toHaveBeenCalledWith('reply-1');
  });

  it('throws 404 REPLY_NOT_FOUND when reply missing', async () => {
    mockFindReplyById.mockResolvedValue(null);

    await expect(replyService.upvoteReply('ghost')).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'REPLY_NOT_FOUND',
    });
  });
});

describe('replyService.verifyReply', () => {
  it('sets expert verified when role is extension_officer', async () => {
    mockFindReplyById.mockResolvedValue(fakeReply as never);
    mockSetExpertVerified.mockResolvedValue({ ...fakeReply, expertVerified: true } as never);

    await replyService.verifyReply('reply-1', 'extension_officer');

    expect(mockSetExpertVerified).toHaveBeenCalledWith('reply-1');
  });

  it('sets expert verified when role is vet_officer', async () => {
    mockFindReplyById.mockResolvedValue(fakeReply as never);
    mockSetExpertVerified.mockResolvedValue({ ...fakeReply, expertVerified: true } as never);

    await replyService.verifyReply('reply-1', 'vet_officer');

    expect(mockSetExpertVerified).toHaveBeenCalledWith('reply-1');
  });

  it('throws 403 FORBIDDEN when role is not an expert role', async () => {
    await expect(replyService.verifyReply('reply-1', 'farmer')).rejects.toMatchObject({
      statusCode: 403,
      errorCode: 'FORBIDDEN',
    });

    expect(mockFindReplyById).not.toHaveBeenCalled();
  });

  it('throws 404 when reply not found', async () => {
    mockFindReplyById.mockResolvedValue(null);

    await expect(replyService.verifyReply('ghost', 'extension_officer')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('replyService.reportReply', () => {
  it('flags the reply', async () => {
    mockFindReplyById.mockResolvedValue(fakeReply as never);
    mockFlagReply.mockResolvedValue({ ...fakeReply, status: 'flagged' } as never);

    await replyService.reportReply('reply-1');

    expect(mockFlagReply).toHaveBeenCalledWith('reply-1');
  });

  it('throws 404 when reply not found', async () => {
    mockFindReplyById.mockResolvedValue(null);

    await expect(replyService.reportReply('ghost')).rejects.toMatchObject({ statusCode: 404 });
  });
});
