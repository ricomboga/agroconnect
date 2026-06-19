import { prisma } from '@agroconnect/db/community';

export interface ModerationPagination {
  take: number;
  skip: number;
}

export async function findFlaggedThreads(pagination: ModerationPagination) {
  return prisma.thread.findMany({
    where: { status: 'flagged' },
    select: {
      id: true,
      authorId: true,
      category: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countFlaggedThreads() {
  return prisma.thread.count({ where: { status: 'flagged' } });
}

export async function setThreadStatus(id: string, status: 'active' | 'deleted') {
  return prisma.thread.update({ where: { id }, data: { status } });
}
