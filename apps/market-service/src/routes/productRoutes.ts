import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createProductSchema } from '../schemas/createProduct.schema.js';
import { updateProductSchema } from '../schemas/updateProduct.schema.js';
import { listProductsQuerySchema } from '../schemas/listProducts.query.schema.js';
import * as productController from '../controllers/productController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', validateQuery(listProductsQuerySchema), productController.browseProducts);

router.post('/', auth, validateBody(createProductSchema), (req, res, next) =>
  productController.createProduct(req as AuthenticatedRequest, res, next),
);

router.patch('/:productId', auth, validateBody(updateProductSchema), (req, res, next) =>
  productController.updateProduct(req as AuthenticatedRequest, res, next),
);

export { router as productRouter };
