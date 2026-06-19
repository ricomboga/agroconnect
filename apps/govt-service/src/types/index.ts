import type { AuthRequest } from '@agroconnect/shared';

export type AuthenticatedRequest = AuthRequest;

export interface PaginationParams {
  take: number;
  skip: number;
}
