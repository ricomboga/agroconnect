import { Router } from 'express';
import type { RequestHandler } from 'express';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { registerSchema } from '../schemas/register.schema.js';
import { loginSchema } from '../schemas/login.schema.js';
import { refreshSchema } from '../schemas/refresh.schema.js';
import { otpSendSchema } from '../schemas/otpSend.schema.js';
import { otpVerifySchema } from '../schemas/otpVerify.schema.js';
import { updateMeSchema } from '../schemas/updateMe.schema.js';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  getMeHandler,
  updateMeHandler,
  sendOtpHandler,
  verifyOtpHandler,
} from '../controllers/authController.js';

const router = Router();

router.post('/register', validateBody(registerSchema), registerHandler);
router.post('/login', validateBody(loginSchema), loginHandler);
router.post('/refresh', validateBody(refreshSchema), refreshHandler);
router.post('/logout', validateBody(refreshSchema), logoutHandler);
router.get('/me', requireAuth as RequestHandler, getMeHandler as RequestHandler);
router.patch('/me', requireAuth as RequestHandler, validateBody(updateMeSchema), updateMeHandler as RequestHandler);
router.post('/otp/send', validateBody(otpSendSchema), sendOtpHandler);
router.post('/otp/verify', validateBody(otpVerifySchema), verifyOtpHandler);

export { router as authRouter };
