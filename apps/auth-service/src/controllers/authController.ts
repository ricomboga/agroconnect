import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import * as authService from '../services/authService.js';
import * as otpService from '../services/otpService.js';
import { verifyUserPhone, findUserByPhone } from '../repositories/userRepository.js';
import type { RegisterDto } from '../schemas/register.schema.js';
import type { LoginDto } from '../schemas/login.schema.js';
import type { RefreshDto } from '../schemas/refresh.schema.js';
import type { OtpSendDto } from '../schemas/otpSend.schema.js';
import type { OtpVerifyDto } from '../schemas/otpVerify.schema.js';
import type { UpdateMeDto } from '../schemas/updateMe.schema.js';
import type { ChangePasswordDto } from '../schemas/changePassword.schema.js';
import type { ResetPasswordDto } from '../schemas/resetPassword.schema.js';

export async function registerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(
      req.body as RegisterDto,
      req.ip ?? '0.0.0.0',
      req.headers['user-agent'],
    );
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(
      req.body as LoginDto,
      req.ip ?? '0.0.0.0',
      req.headers['user-agent'],
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshDto;
    const result = await authService.refresh(
      refreshToken,
      req.ip ?? '0.0.0.0',
      req.headers['user-agent'],
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshDto;
    await authService.logout(refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getMeHandler(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const user = await authService.getMe(userId);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function changePasswordHandler(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { current_password, new_password } = req.body as ChangePasswordDto;
    await authService.changePassword(userId, current_password, new_password);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, code, new_password } = req.body as ResetPasswordDto;
    await authService.resetPassword(phone, code, new_password);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function updateMeHandler(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const user = await authService.updateMe(userId, req.body as UpdateMeDto);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function sendOtpHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone } = req.body as OtpSendDto;
    await otpService.sendOtp(phone);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function verifyOtpHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, code } = req.body as OtpVerifyDto;
    const valid = await otpService.verifyOtp(phone, code);
    if (!valid) {
      res.status(400).json({
        error_code: 'OTP_INVALID',
        message_key: 'error.otp.invalid',
        request_id: (req.headers['x-request-id'] as string) ?? '',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const user = await findUserByPhone(phone);
    if (user) await verifyUserPhone(user.id);
    res.json({ data: { verified: true } });
  } catch (err) {
    next(err);
  }
}

export async function lookupUserByPhoneHandler(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const phone = req.query['phone'] as string | undefined;
    if (!phone) {
      res.status(400).json({ error_code: 'PHONE_REQUIRED', message_key: 'error.phone.required' });
      return;
    }
    const user = await findUserByPhone(phone);
    if (!user) {
      res.status(404).json({ error_code: 'USER_NOT_FOUND', message_key: 'error.user.notFound' });
      return;
    }
    res.json({ data: { id: user.id, fullName: user.fullName, phone: user.phone } });
  } catch (err) {
    next(err);
  }
}
