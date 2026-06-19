import { Router } from 'express';
import * as priceController from '../controllers/priceController.js';

const router = Router();

router.get('/', priceController.getCurrentPrices);

export { router as priceRouter };
