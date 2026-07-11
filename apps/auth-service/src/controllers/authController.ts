import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import * as authService from '../services/authService.js';
import * as otpService from '../services/otpService.js';
import * as adminUserService from '../services/adminUserService.js';
import { verifyUserPhone, findUserByPhone } from '../repositories/userRepository.js';
import type { RegisterDto } from '../schemas/register.schema.js';
import type { LoginDto } from '../schemas/login.schema.js';
import type { RefreshDto } from '../schemas/refresh.schema.js';
import type { OtpSendDto } from '../schemas/otpSend.schema.js';
import type { OtpVerifyDto } from '../schemas/otpVerify.schema.js';
import type { UpdateMeDto } from '../schemas/updateMe.schema.js';
import type { ChangePasswordDto } from '../schemas/changePassword.schema.js';
import type { ResetPasswordDto } from '../schemas/resetPassword.schema.js';
import type { CreateFarmerDto } from '../schemas/createFarmer.schema.js';

// Roles allowed to create farmer accounts on a farmer's behalf (assisted
// registration) and/or act as a checker in the maker-checker verification flow.
const FIELD_STAFF_ROLES = new Set(['extension_officer', 'vet_officer', 'admin', 'govt_officer']);

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

// Assisted registration: a field agent (extension_officer/vet_officer) creates a
// farmer account on the farmer's behalf. The account starts pending_verification —
// only the field agent's own supervisor can verify it (see verifyAssistedUserHandler).
export async function createFarmerHandler(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const creator = req.user!;
    if (!FIELD_STAFF_ROLES.has(creator.role)) {
      res.status(403).json({
        error_code: 'FORBIDDEN',
        message_key: 'error.auth.forbidden',
        request_id: (req.headers['x-request-id'] as string) ?? '',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const dto = req.body as CreateFarmerDto;
    const farmer = await adminUserService.createUser({
      ...dto,
      role: 'farmer',
      createdByUserId: creator.id,
    });
    res.status(201).json({ data: farmer });
  } catch (err) {
    next(err);
  }
}

// Maker-checker verification for assisted registrations. Enforcement (creator can't
// verify their own creation; farmers created by a field agent require that field
// agent's supervisor) lives in adminUserService.verifyUser / adminVerifyUser.
export async function verifyAssistedUserHandler(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const verifier = req.user!;
    if (!FIELD_STAFF_ROLES.has(verifier.role)) {
      res.status(403).json({
        error_code: 'FORBIDDEN',
        message_key: 'error.auth.forbidden',
        request_id: (req.headers['x-request-id'] as string) ?? '',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const { id } = req.params as { id: string };
    await adminUserService.verifyUser(id, verifier.id);
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
