import { Router } from 'express';
import { handleMpesaCallback } from '../controllers/mpesaController.js';

const router = Router();

// No JWT, no validateBody middleware — the controller validates IP + HMAC itself
// and always returns 200 to prevent Safaricom retry storms on errors.
router.post('/callback', handleMpesaCallback);

export { router as mpesaRouter };
