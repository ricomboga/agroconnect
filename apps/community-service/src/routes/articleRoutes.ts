import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createArticleSchema } from '../schemas/createArticle.schema.js';
import { listArticlesQuerySchema } from '../schemas/listArticles.query.schema.js';
import * as articleController from '../controllers/articleController.js';

export const articleRouter = Router();

articleRouter.get('/', validateQuery(listArticlesQuerySchema), articleController.listArticles);
articleRouter.get('/:slug', articleController.getArticle);

articleRouter.post(
  '/',
  requireServiceToken,
  validateBody(createArticleSchema),
  articleController.createArticle,
);
