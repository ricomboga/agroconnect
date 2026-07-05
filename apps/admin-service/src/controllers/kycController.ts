import type { Response, NextFunction, RequestHandler } from 'express';
import type { AdminRequest } from '../types/index.js';
import * as kycService from '../services/kycService.js';
import type { KycDecisionDto } from '../schemas/kycDecision.schema.js';

export const listQueue: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const data = await kycService.listQueue({
      role: req.query['role'] as string | undefined,
      county: req.query['county'] as string | undefined,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getKyc = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };
    const data = await kycService.getKyc(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const decideKyc = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };
    const dto = req.body as KycDecisionDto;
    const actor = req.user.phone;
    const data = await kycService.decide(userId, dto, actor);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
