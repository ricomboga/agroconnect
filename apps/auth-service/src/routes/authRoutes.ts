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
import { changePasswordSchema } from '../schemas/changePassword.schema.js';
import { resetPasswordSchema } from '../schemas/resetPassword.schema.js';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  getMeHandler,
  updateMeHandler,
  changePasswordHandler,
  resetPasswordHandler,
  sendOtpHandler,
  verifyOtpHandler,
  lookupUserByPhoneHandler,
} from '../controllers/authController.js';

const router = Router();

router.post('/register', validateBody(registerSchema), registerHandler);
router.post('/login', validateBody(loginSchema), loginHandler);
router.post('/refresh', validateBody(refreshSchema), refreshHandler);
router.post('/logout', validateBody(refreshSchema), logoutHandler);
router.get('/me', requireAuth as RequestHandler, getMeHandler as RequestHandler);
router.patch('/me', requireAuth as RequestHandler, validateBody(updateMeSchema), updateMeHandler as RequestHandler);
router.patch('/password', requireAuth as RequestHandler, validateBody(changePasswordSchema), changePasswordHandler as RequestHandler);
router.post('/password/reset', validateBody(resetPasswordSchema), resetPasswordHandler);
router.post('/otp/send', validateBody(otpSendSchema), sendOtpHandler);
router.post('/otp/verify', validateBody(otpVerifySchema), verifyOtpHandler);
router.get('/users/lookup', requireAuth as RequestHandler, lookupUserByPhoneHandler as RequestHandler);

export { router as authRouter };
