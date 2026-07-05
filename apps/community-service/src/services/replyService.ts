import * as replyRepo from '../repositories/replyRepository.js';
import * as threadRepo from '../repositories/threadRepository.js';
import { CreateReplyDto } from '../schemas/createReply.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';
import { containsBlockedWord } from '../utils/blocklist.js';
import { getIo } from '../socket.js';
import { publishReplyCreated } from '../events/producers/replyCreatedProducer.js';
import { logger } from '../logger.js';

const EXPERT_ROLES = ['extension_officer', 'vet_officer'];

export async function createReply(
  threadId: string,
  authorId: string,
  dto: CreateReplyDto,
) {
  const thread = await threadRepo.findThreadById(threadId);
  if (!thread)
    throw createError('Thread not found', 404, 'THREAD_NOT_FOUND', 'error.thread.not_found');

  const status = containsBlockedWord(dto.body) ? 'flagged' : 'active';
  const reply = await replyRepo.createReply(threadId, authorId, dto, status);

  if (status === 'active') {
    getIo()?.to(`thread:${threadId}`).emit('new_reply', reply);

    if (authorId !== thread.authorId) {
      publishReplyCreated({
        replyId: reply.id,
        threadId,
        threadTitle: thread.title,
        threadAuthorId: thread.authorId,
        replierId: authorId,
        replierName: dto.authorName,
      }).catch((err: unknown) => {
        logger.warn({ err, replyId: reply.id }, 'Kafka publish failed — reply still created');
      });
    }
  }

  return reply;
}

export async function listReplies(threadId: string, pagination: PaginationParams) {
  const thread = await threadRepo.findThreadById(threadId);
  if (!thread)
    throw createError('Thread not found', 404, 'THREAD_NOT_FOUND', 'error.thread.not_found');

  const [replies, total] = await Promise.all([
    replyRepo.findRepliesByThread(threadId, pagination),
    replyRepo.countRepliesByThread(threadId),
  ]);
  return { replies, total };
}

export async function upvoteReply(id: string, userId: string) {
  const reply = await replyRepo.findReplyById(id);
  if (!reply) throw createError('Reply not found', 404, 'REPLY_NOT_FOUND', 'error.reply.not_found');
  const voted = await replyRepo.upsertReplyVote(id, userId);
  if (!voted)
    throw createError('Already upvoted', 409, 'ALREADY_UPVOTED', 'error.already_upvoted');
  return replyRepo.findReplyById(id);
}

export async function verifyReply(id: string, role: string) {
  if (!EXPERT_ROLES.includes(role))
    throw createError('Forbidden', 403, 'FORBIDDEN', 'error.forbidden');

  const reply = await replyRepo.findReplyById(id);
  if (!reply) throw createError('Reply not found', 404, 'REPLY_NOT_FOUND', 'error.reply.not_found');

  return replyRepo.setExpertVerified(id);
}

export async function reportReply(id: string, reason: string | undefined) {
  const reply = await replyRepo.findReplyById(id);
  if (!reply) throw createError('Reply not found', 404, 'REPLY_NOT_FOUND', 'error.reply.not_found');
  return replyRepo.flagReply(id, reason);
}

export async function deleteReply(id: string, authorId: string, role: string) {
  const reply = await replyRepo.findReplyById(id);
  if (!reply) throw createError('Reply not found', 404, 'REPLY_NOT_FOUND', 'error.reply.not_found');

  const ownerFilter = role === 'admin' ? undefined : authorId;
  const result = await replyRepo.softDeleteReply(id, ownerFilter);
  if (result.count === 0)
    throw createError('Reply not found or not authorized', 403, 'FORBIDDEN', 'error.forbidden');
}
