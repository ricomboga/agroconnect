import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { searchProductsByNames } from '../repositories/internalProductSearchRepository.js';
import { logger } from '../logger.js';

const router = Router();

const searchQuerySchema = z.object({
  names: z.union([z.string(), z.array(z.string())]).transform((v) => (Array.isArray(v) ? v : [v])),
  county: z.string().optional(),
});

router.get('/search', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error_code: 'VALIDATION_ERROR', details: parsed.error.flatten() });
      return;
    }

    const { names, county } = parsed.data;
    const results = await searchProductsByNames(names, county);

    logger.info({ names, county, count: results.length, context: 'internalProductSearch' }, 'Product search');
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
});

export { router as internalProductSearchRouter };
