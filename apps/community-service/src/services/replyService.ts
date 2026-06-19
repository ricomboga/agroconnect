import * as replyRepo from '../repositories/replyRepository.js';
import * as threadRepo from '../repositories/threadRepository.js';
import { CreateReplyDto } from '../schemas/createReply.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';
import { containsBlockedWord } from '../utils/blocklist.js';
import { getIo } from '../socket.js';

const EXPERT_ROLES = ['extension_officer', 'vet_officer'];

export async function createReply(threadId: string, authorId: string, dto: CreateReplyDto) {
  const thread = await threadRepo.findThreadById(threadId);
  if (!thread)
    throw createError('Thread not found', 404, 'THREAD_NOT_FOUND', 'error.thread.not_found');

  const status = containsBlockedWord(dto.body) ? 'flagged' : 'active';
  const reply = await replyRepo.createReply(threadId, authorId, dto, status);

  getIo()?.to(`thread:${threadId}`).emit('new_reply', reply);

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

export async function upvoteReply(id: string) {
  const reply = await replyRepo.findReplyById(id);
  if (!reply) throw createError('Reply not found', 404, 'REPLY_NOT_FOUND', 'error.reply.not_found');
  return replyRepo.incrementReplyUpvotes(id);
}

export async function verifyReply(id: string, role: string) {
  if (!EXPERT_ROLES.includes(role))
    throw createError('Forbidden', 403, 'FORBIDDEN', 'error.forbidden');

  const reply = await replyRepo.findReplyById(id);
  if (!reply) throw createError('Reply not found', 404, 'REPLY_NOT_FOUND', 'error.reply.not_found');

  return replyRepo.setExpertVerified(id);
}

export async function reportReply(id: string) {
  const reply = await replyRepo.findReplyById(id);
  if (!reply) throw createError('Reply not found', 404, 'REPLY_NOT_FOUND', 'error.reply.not_found');
  return replyRepo.flagReply(id);
}
