import { PaginationParams } from '../types/index.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function parsePaginationParams(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query['page'] ?? '1'), 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(String(query['page_size'] ?? String(DEFAULT_PAGE_SIZE)), 10) || DEFAULT_PAGE_SIZE),
  );
  return { take: pageSize, skip: (page - 1) * pageSize };
}

export function buildMeta(query: Record<string, unknown>, pagination: PaginationParams, total: number) {
  const page = Math.max(1, parseInt(String(query['page'] ?? '1'), 10) || 1);
  return {
    page,
    page_size: pagination.take,
    total,
    total_pages: Math.ceil(total / pagination.take),
  };
}
