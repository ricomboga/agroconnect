import type { RequestHandler } from 'express';
import * as analyticsService from '../services/analyticsService.js';

export const getSummary: RequestHandler = async (_req, res, next): Promise<void> => {
  try {
    const summary = await analyticsService.getSummary();
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
};
