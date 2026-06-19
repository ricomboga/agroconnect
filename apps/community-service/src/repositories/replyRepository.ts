import { prisma } from '@agroconnect/db/community';
import { CreateReplyDto } from '../schemas/createReply.schema.js';
import { PaginationParams } from '../types/index.js';

export async function createReply(
  threadId: string,
  authorId: string,
  dto: CreateReplyDto,
  status: 'active' | 'flagged',
) {
  return prisma.reply.create({
    data: {
      threadId,
      authorId,
      body: dto.body,
      status,
    },
  });
}

export async function findReplyById(id: string) {
  return prisma.reply.findFirst({ where: { id } });
}

export async function findRepliesByThread(threadId: string, pagination: PaginationParams) {
  return prisma.reply.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countRepliesByThread(threadId: string) {
  return prisma.reply.count({ where: { threadId } });
}

export async function setExpertVerified(id: string) {
  return prisma.reply.update({
    where: { id },
    data: { isExpertVerified: true },
  });
}

export async function incrementReplyUpvotes(id: string) {
  return prisma.reply.update({
    where: { id },
    data: { upvotes: { increment: 1 } },
  });
}

export async function flagReply(id: string) {
  return prisma.reply.update({
    where: { id },
    data: { status: 'flagged' },
  });
}
