import * as articleRepo from '../../../src/repositories/articleRepository';
import * as articleService from '../../../src/services/articleService';

jest.mock('../../../src/repositories/articleRepository', () => ({
  createArticle: jest.fn(),
  findArticleBySlug: jest.fn(),
  findArticles: jest.fn(),
  countArticles: jest.fn(),
}));

jest.mock('../../../src/events/producers/articleCreatedProducer', () => ({
  publishArticleCreated: jest.fn(),
}));

import { publishArticleCreated } from '../../../src/events/producers/articleCreatedProducer';

const mockCreateArticle = jest.mocked(articleRepo.createArticle);
const mockFindArticles = jest.mocked(articleRepo.findArticles);
const mockCountArticles = jest.mocked(articleRepo.countArticles);
const mockPublishArticleCreated = jest.mocked(publishArticleCreated);

const fakeArticle = {
  id: 'article-1',
  slug: 'maize-planting-webinar',
  title: 'Maize Planting Webinar',
  summary: 'Join us to learn about maize planting best practices this season.',
  body: 'A'.repeat(60),
  category: 'crop_advice' as const,
  type: 'webinar' as const,
  startsAt: new Date('2026-08-01T10:00:00Z'),
  endsAt: null,
  joinLink: 'https://meet.example.com/maize',
  location: null,
  authorName: 'AgroConnect Team',
  isPublished: true,
  publishedAt: new Date(),
  createdAt: new Date(),
};

const createDto = {
  title: 'Maize Planting Webinar',
  summary: 'Join us to learn about maize planting best practices this season.',
  body: 'A'.repeat(60),
  category: 'crop_advice' as const,
  type: 'webinar' as const,
  startsAt: '2026-08-01T10:00:00Z',
  authorName: 'AgroConnect Team',
  isPublished: true,
};

beforeEach(() => jest.clearAllMocks());

describe('articleService.createArticle', () => {
  it('creates the article and publishes community.article.created when published', async () => {
    mockCreateArticle.mockResolvedValue(fakeArticle as never);
    mockPublishArticleCreated.mockResolvedValue();

    const result = await articleService.createArticle(createDto);

    expect(mockCreateArticle).toHaveBeenCalledWith(
      expect.objectContaining({ ...createDto, slug: expect.any(String) }),
    );
    expect(mockPublishArticleCreated).toHaveBeenCalledWith(
      'article-1',
      'maize-planting-webinar',
      'Maize Planting Webinar',
      'webinar',
    );
    expect(result.id).toBe('article-1');
  });

  it('does not publish an event when the article is created unpublished', async () => {
    const draft = { ...fakeArticle, isPublished: false };
    mockCreateArticle.mockResolvedValue(draft as never);

    await articleService.createArticle({ ...createDto, isPublished: false });

    expect(mockPublishArticleCreated).not.toHaveBeenCalled();
  });

  it('still creates the article when the Kafka publish fails', async () => {
    mockCreateArticle.mockResolvedValue(fakeArticle as never);
    mockPublishArticleCreated.mockRejectedValue(new Error('Kafka down'));

    const result = await articleService.createArticle(createDto);

    expect(result.id).toBe('article-1');
  });
});

describe('articleService.listArticles', () => {
  it('forwards the type filter to the repository', async () => {
    mockFindArticles.mockResolvedValue([fakeArticle] as never);
    mockCountArticles.mockResolvedValue(1);

    await articleService.listArticles({ type: 'webinar' } as never, { take: 20, skip: 0 });

    expect(mockFindArticles).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'webinar' }),
      { take: 20, skip: 0 },
    );
  });
});
