import type { Response, NextFunction } from 'express';
import type { AdminRequest } from '../types/index.js';
import * as programsService from '../services/programsService.js';
import type { BulkApproveApplicationsDto } from '../schemas/bulkApproveApplications.schema.js';

function tokenFrom(req: AdminRequest): string {
  return ((req.headers['authorization'] as string | undefined) ?? '').replace(/^Bearer\s+/i, '');
}

export const listPrograms = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['page_size'] ?? '20'), 10) || 20));
    const filters = {
      status: req.query['status'] as string | undefined,
      ministry: req.query['ministry'] as string | undefined,
    };
    const result = await programsService.listPrograms(filters, page, pageSize, tokenFrom(req));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const listApplications = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['page_size'] ?? '20'), 10) || 20));
    const result = await programsService.listApplications(
      id,
      { county: req.query['county'] as string | undefined, status: req.query['status'] as string | undefined },
      page,
      pageSize,
      tokenFrom(req),
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const bulkApprove = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dto = req.body as BulkApproveApplicationsDto;
    const result = await programsService.bulkApprove(dto, tokenFrom(req), req.user.phone);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
