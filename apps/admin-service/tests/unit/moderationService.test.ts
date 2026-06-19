import * as communityClient from '../../src/clients/communityServiceClient';
import * as moderationService from '../../src/services/moderationService';

jest.mock('../../src/clients/communityServiceClient', () => ({
  listFlaggedPosts: jest.fn(),
  setPostStatus: jest.fn(),
}));

const mockListFlaggedPosts = jest.mocked(communityClient.listFlaggedPosts);
const mockSetPostStatus = jest.mocked(communityClient.setPostStatus);

const fakePosts = {
  data: [
    {
      id: 'thread-001',
      authorId: 'user-001',
      category: 'crop_advice',
      title: 'Bad words here',
      body: 'Flagged content body',
      status: 'flagged',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],
  meta: { total: 1, page: 1, page_size: 20 },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('moderationService.listFlagged', () => {
  it('returns paginated flagged posts', async () => {
    mockListFlaggedPosts.mockResolvedValue(fakePosts);

    const result = await moderationService.listFlagged(1, 20);

    expect(mockListFlaggedPosts).toHaveBeenCalledWith(1, 20);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].status).toBe('flagged');
  });

  it('passes pagination params through', async () => {
    mockListFlaggedPosts.mockResolvedValue({ ...fakePosts, data: [], meta: { total: 0, page: 2, page_size: 10 } });

    await moderationService.listFlagged(2, 10);

    expect(mockListFlaggedPosts).toHaveBeenCalledWith(2, 10);
  });
});

describe('moderationService.moderatePost', () => {
  it('approves a flagged post', async () => {
    mockSetPostStatus.mockResolvedValue(undefined);

    await moderationService.moderatePost('thread-001', 'active');

    expect(mockSetPostStatus).toHaveBeenCalledWith('thread-001', 'active');
  });

  it('deletes a flagged post', async () => {
    mockSetPostStatus.mockResolvedValue(undefined);

    await moderationService.moderatePost('thread-001', 'deleted');

    expect(mockSetPostStatus).toHaveBeenCalledWith('thread-001', 'deleted');
  });

  it('propagates 404 errors', async () => {
    const err = new Error('post not found') as Error & { statusCode: number };
    err.statusCode = 404;
    mockSetPostStatus.mockRejectedValue(err);

    await expect(moderationService.moderatePost('nonexistent', 'active')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
