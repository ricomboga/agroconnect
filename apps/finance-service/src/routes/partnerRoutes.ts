import { Router } from 'express';
import { listPartners } from '../controllers/partnerController.js';

const router = Router();

router.get('/', listPartners);

export { router as partnerRouter };
