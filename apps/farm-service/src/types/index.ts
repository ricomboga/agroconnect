import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    role: string;
    phone: string;
  };
}

export interface PaginationParams {
  take: number;
  skip: number;
}
