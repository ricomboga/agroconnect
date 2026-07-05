import type { RequestHandler } from 'express';
import * as auditService from '../services/auditService.js';

export const listAuditLog: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['page_size'] ?? '20'), 10) || 20));
    const result = await auditService.list(page, pageSize);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
