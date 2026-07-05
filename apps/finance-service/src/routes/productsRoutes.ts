import { Router } from 'express';
import { listProducts, getProduct } from '../controllers/productsController.js';

const router = Router();

router.get('/', listProducts);
router.get('/:productId', getProduct);

export { router as productsRouter };
