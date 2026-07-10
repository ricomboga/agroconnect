import { Request, Response, NextFunction } from 'express';
import * as expertService from '../services/expertService.js';
import { parsePaginationParams } from '../utils/pagination.js';

export async function listExperts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const { experts, total, matchedOn } = await expertService.listExperts(req.query as never, pagination);
    res.json({
      data: experts,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take, matched_on: matchedOn },
    });
  } catch (err) {
    next(err);
  }
}

export async function getExpert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const expert = await expertService.getExpert(req.params['id'] as string);
    res.json({ data: expert });
  } catch (err) {
    next(err);
  }
}

export async function createExpert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const expert = await expertService.createExpert(req.body);
    res.status(201).json({ data: expert });
  } catch (err) {
    next(err);
  }
}

export async function updateExpert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const expert = await expertService.updateExpert(req.params['id'] as string, req.body);
    res.json({ data: expert });
  } catch (err) {
    next(err);
  }
}

export async function getExpertByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const expert = await expertService.getExpertByUserId(req.params['userId'] as string);
    res.json({ data: expert });
  } catch (err) {
    next(err);
  }
}
