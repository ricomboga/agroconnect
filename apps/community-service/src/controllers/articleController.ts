import { Request, Response, NextFunction } from 'express';
import * as articleService from '../services/articleService.js';
import { parsePaginationParams } from '../utils/pagination.js';

export async function listArticles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const { articles, total } = await articleService.listArticles(req.query as never, pagination);
    res.json({
      data: articles,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}

export async function getArticle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const article = await articleService.getArticle(req.params['slug'] as string);
    res.json({ data: article });
  } catch (err) {
    next(err);
  }
}

export async function createArticle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const article = await articleService.createArticle(req.body);
    res.status(201).json({ data: article });
  } catch (err) {
    next(err);
  }
}
