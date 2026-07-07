import type { Response, NextFunction } from 'express';
import type { AdminRequest } from '../types/index.js';
import * as analyticsService from '../services/analyticsService.js';
import { assertCapability } from '../middleware/staffAccess.js';

export const getSummary = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    assertCapability(req.user, 'analytics');
    const summary = await analyticsService.getSummary();
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
};
