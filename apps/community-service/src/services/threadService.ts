import * as threadRepo from '../repositories/threadRepository.js';
import * as replyRepo from '../repositories/replyRepository.js';
import { publishPostCreated } from '../events/producers/postCreatedProducer.js';
import { CreateThreadDto } from '../schemas/createThread.schema.js';
import { UpdateThreadDto } from '../schemas/updateThread.schema.js';
import { ListThreadsQuery } from '../schemas/listThreads.query.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';
import { containsBlockedWord } from '../utils/blocklist.js';
import { logger } from '../logger.js';

export async function createThread(authorId: string, dto: CreateThreadDto) {
  const status = containsBlockedWord(dto.title + ' ' + dto.body) ? 'flagged' : 'active';
  const thread = await threadRepo.createThread(authorId, dto, status);

  publishPostCreated(thread.id, authorId, dto.category).catch((err: unknown) => {
    logger.warn({ err, threadId: thread.id }, 'Kafka publish failed — thread still created');
  });

  return thread;
}

export async function listThreads(query: ListThreadsQuery, pagination: PaginationParams) {
  const filter: threadRepo.ThreadFilter = {
    category: query.category,
    cropType: query.cropType,
    county: query.county,
    sort: query.sort,
  };
  const [threads, total] = await Promise.all([
    threadRepo.findThreads(filter, pagination),
    threadRepo.countThreads(filter),
  ]);
  return { threads, total };
}

export async function getThread(id: string) {
  const thread = await threadRepo.findThreadById(id);
  if (!thread) throw createError('Thread not found', 404, 'THREAD_NOT_FOUND', 'error.thread.not_found');
  const replies = await replyRepo.findRepliesByThread(id, { take: 500, skip: 0 });
  return { thread, replies };
}

export async function updateThread(
  id: string,
  authorId: string,
  role: string,
  dto: UpdateThreadDto,
) {
  await getThread(id);
  const ownerFilter = role === 'admin' ? undefined : authorId;
  const result = await threadRepo.updateThread(id, ownerFilter, dto);
  if (result.count === 0)
    throw createError('Thread not found or not authorized', 403, 'FORBIDDEN', 'error.forbidden');
  return threadRepo.findThreadById(id);
}

export async function deleteThread(id: string, authorId: string, role: string) {
  await getThread(id);
  const ownerFilter = role === 'admin' ? undefined : authorId;
  const result = await threadRepo.softDeleteThread(id, ownerFilter);
  if (result.count === 0)
    throw createError('Thread not found or not authorized', 403, 'FORBIDDEN', 'error.forbidden');
}

export async function upvoteThread(id: string, userId: string) {
  await getThread(id);
  const voted = await threadRepo.upsertThreadVote(id, userId);
  if (!voted)
    throw createError('Already upvoted', 409, 'ALREADY_UPVOTED', 'error.already_upvoted');
  return threadRepo.findThreadById(id);
}
