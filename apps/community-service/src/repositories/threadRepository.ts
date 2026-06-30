import { prisma } from '@agroconnect/db/community';
import { CreateThreadDto } from '../schemas/createThread.schema.js';
import { UpdateThreadDto } from '../schemas/updateThread.schema.js';
import { PaginationParams } from '../types/index.js';

export type ThreadFilter = {
  category?: string;
  cropType?: string;
  county?: string;
  sort?: 'newest' | 'top';
};

export async function createThread(
  authorId: string,
  dto: CreateThreadDto,
  status: 'active' | 'flagged',
) {
  return prisma.thread.create({
    data: {
      authorId,
      authorName: dto.authorName,
      authorCounty: dto.authorCounty,
      category: dto.category,
      title: dto.title,
      body: dto.body,
      cropType: dto.cropType,
      county: dto.county,
      photos: dto.photos ?? [],
      status,
    },
  });
}

export async function findThreadById(id: string) {
  return prisma.thread.findFirst({
    where: { id, status: { not: 'deleted' } },
  });
}

export async function findThreads(filter: ThreadFilter, pagination: PaginationParams) {
  return prisma.thread.findMany({
    where: {
      status: 'active',
      ...(filter.category && { category: filter.category as never }),
      ...(filter.cropType && { cropType: filter.cropType }),
      ...(filter.county && { county: filter.county }),
    },
    orderBy: filter.sort === 'top' ? { upvotes: 'desc' } : { createdAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countThreads(filter: ThreadFilter) {
  return prisma.thread.count({
    where: {
      status: 'active',
      ...(filter.category && { category: filter.category as never }),
      ...(filter.cropType && { cropType: filter.cropType }),
      ...(filter.county && { county: filter.county }),
    },
  });
}

export async function updateThread(id: string, authorId: string | undefined, dto: UpdateThreadDto) {
  return prisma.thread.updateMany({
    where: {
      id,
      ...(authorId !== undefined ? { authorId } : {}),
      status: { not: 'deleted' },
    },
    data: dto,
  });
}

export async function softDeleteThread(id: string, authorId: string | undefined) {
  return prisma.thread.updateMany({
    where: { id, ...(authorId !== undefined ? { authorId } : {}) },
    data: { status: 'deleted' },
  });
}

export async function upsertThreadVote(threadId: string, userId: string): Promise<boolean> {
  try {
    await prisma.threadVote.create({ data: { threadId, userId } });
    await prisma.thread.update({
      where: { id: threadId },
      data: { upvotes: { increment: 1 } },
    });
    return true;
  } catch {
    return false;
  }
}
