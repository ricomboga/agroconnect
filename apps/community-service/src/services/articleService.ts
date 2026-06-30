import * as articleRepo from '../repositories/articleRepository.js';
import { CreateArticleDto } from '../schemas/createArticle.schema.js';
import { ListArticlesQuery } from '../schemas/listArticles.query.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';
import { slugify } from '../utils/slugify.js';

export async function createArticle(dto: CreateArticleDto) {
  const slug = slugify(dto.title);
  return articleRepo.createArticle({ ...dto, slug });
}

export async function getArticle(slug: string) {
  const article = await articleRepo.findArticleBySlug(slug);
  if (!article) throw createError('Article not found', 404, 'ARTICLE_NOT_FOUND', 'error.article.not_found');
  return article;
}

export async function listArticles(query: ListArticlesQuery, pagination: PaginationParams) {
  const filter: articleRepo.ArticleFilter = { category: query.category };
  const [articles, total] = await Promise.all([
    articleRepo.findArticles(filter, pagination),
    articleRepo.countArticles(filter),
  ]);
  return { articles, total };
}
