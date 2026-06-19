import { Router } from 'express';
import { handleUssd } from '../controllers/ussdController.js';

const router = Router();

router.post('/', (req, res, next) => {
  handleUssd(req, res).catch(next);
});

export { router as ussdRouter };
