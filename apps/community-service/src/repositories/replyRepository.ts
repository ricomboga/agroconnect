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
      authorName: dto.authorName,
      authorRole: dto.authorRole,
      body: dto.body,
      status,
    },
  });
}

export async function findReplyById(id: string) {
  return prisma.reply.findFirst({ where: { id, status: 'active' } });
}

export async function findRepliesByThread(threadId: string, pagination: PaginationParams) {
  return prisma.reply.findMany({
    where: { threadId, status: 'active' },
    orderBy: { createdAt: 'asc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countRepliesByThread(threadId: string) {
  return prisma.reply.count({ where: { threadId, status: 'active' } });
}

export async function setExpertVerified(id: string) {
  return prisma.reply.update({
    where: { id },
    data: { isExpertVerified: true },
  });
}

export async function softDeleteReply(id: string, authorId: string | undefined) {
  return prisma.reply.updateMany({
    where: { id, ...(authorId !== undefined ? { authorId } : {}), status: 'active' },
    data: { status: 'deleted' },
  });
}

export async function upsertReplyVote(replyId: string, userId: string): Promise<boolean> {
  try {
    await prisma.replyVote.create({ data: { replyId, userId } });
    await prisma.reply.update({
      where: { id: replyId },
      data: { upvotes: { increment: 1 } },
    });
    return true;
  } catch {
    return false;
  }
}

export async function flagReply(id: string, reason: string | undefined) {
  return prisma.reply.update({
    where: { id },
    data: { status: 'flagged', reportReason: reason },
  });
}

export async function findFlaggedReplies(pagination: { take: number; skip: number }) {
  return prisma.reply.findMany({
    where: { status: 'flagged' },
    select: {
      id: true,
      threadId: true,
      authorId: true,
      authorName: true,
      body: true,
      reportReason: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countFlaggedReplies() {
  return prisma.reply.count({ where: { status: 'flagged' } });
}

export async function setReplyStatus(id: string, status: 'active' | 'deleted') {
  return prisma.reply.update({ where: { id }, data: { status } });
}
