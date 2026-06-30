import { prisma } from '@agroconnect/db/community';
import { CreateArticleDto } from '../schemas/createArticle.schema.js';
import { PaginationParams } from '../types/index.js';

export type ArticleFilter = {
  category?: string;
};

export async function createArticle(dto: CreateArticleDto & { slug: string }) {
  return prisma.article.create({ data: dto });
}

export async function findArticleBySlug(slug: string) {
  return prisma.article.findFirst({ where: { slug, isPublished: true } });
}

export async function findArticles(filter: ArticleFilter, pagination: PaginationParams) {
  return prisma.article.findMany({
    where: {
      isPublished: true,
      ...(filter.category && { category: filter.category as never }),
    },
    orderBy: { publishedAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countArticles(filter: ArticleFilter) {
  return prisma.article.count({
    where: {
      isPublished: true,
      ...(filter.category && { category: filter.category as never }),
    },
  });
}
