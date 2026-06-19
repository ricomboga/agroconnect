import type { AuthRequest } from '@agroconnect/shared';

export type AdminRequest = AuthRequest;

export interface PaginationParams {
  take: number;
  skip: number;
}
