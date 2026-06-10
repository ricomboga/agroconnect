import { z } from 'zod';

export interface PaginationParams {
  take: number;
  skip: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    page_size?: number;
  };
}

export interface ApiError {
  error_code: string;
  message_key: string;
  details?: unknown;
  request_id: string;
  timestamp: string;
}

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
