import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { verifyJwt, type JwtPayload } from '@agroconnect/shared';
import type { UpdateMeDto } from '../schemas/updateMe.schema.js';
import * as otpService from './otpService.js';
import {
  findUserByPhone,
  findUserById,
  createUser,
  updateUserLastLogin,
  updateUserProfile,
  updatePasswordHash,
  type UpdateProfileParams,
} from '../repositories/userRepository.js';
import {
  createSession,
  findSessionByHash,
  deleteSession,
  deleteSessionsByUserId,
} from '../repositories/sessionRepository.js';
import type { RegisterDto } from '../schemas/register.schema.js';
import type { LoginDto } from '../schemas/login.schema.js';

const PRIVATE_KEY = (process.env['JWT_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n');
const PUBLIC_KEY = (process.env['JWT_PUBLIC_KEY'] ?? '').replace(/\\n/g, '\n');
const ACCESS_TTL = parseInt(process.env['JWT_ACCESS_TTL'] ?? '900', 10);
const REFRESH_TTL = parseInt(process.env['JWT_REFRESH_TTL'] ?? '2592000', 10);
const BCRYPT_ROUNDS = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, ttlSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }));
  const signing = `${header}.${body}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signing);
  const sig = base64url(signer.sign(PRIVATE_KEY));
  return `${signing}.${sig}`;
}

export function verifyAccessToken(token: string): JwtPayload {
  return verifyJwt(token, PUBLIC_KEY);
}

export async function register(dto: RegisterDto, ipAddress: string, userAgent?: string) {
  const existing = await findUserByPhone(dto.phone);
  if (existing) throw Object.assign(new Error('error.phone.taken'), { statusCode: 409, errorCode: 'PHONE_TAKEN' });

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
  const { password: _pw, ...userFields } = dto;
  const user = await createUser({ ...userFields, passwordHash });

  const accessToken = signJwt(
    { sub: user.id, role: user.role, phone: user.phone, partner_bank_id: user.partnerBankId ?? undefined },
    ACCESS_TTL,
  );
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await createSession({
    userId: user.id,
    deviceId: null,
    refreshTokenHash,
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + REFRESH_TTL * 1000),
  });

  return { accessToken, refreshToken, user: { id: user.id, phone: user.phone, role: user.role, fullName: user.fullName } };
}

export async function login(dto: LoginDto, ipAddress: string, userAgent?: string) {
  const user = await findUserByPhone(dto.phone);
  if (!user || !user.isActive) {
    throw Object.assign(new Error('error.credentials.invalid'), { statusCode: 401, errorCode: 'INVALID_CREDENTIALS' });
  }

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('error.credentials.invalid'), { statusCode: 401, errorCode: 'INVALID_CREDENTIALS' });
  }

  await updateUserLastLogin(user.id);

  const accessToken = signJwt(
    { sub: user.id, role: user.role, phone: user.phone, partner_bank_id: user.partnerBankId ?? undefined },
    ACCESS_TTL,
  );
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await createSession({
    userId: user.id,
    deviceId: dto.deviceId,
    refreshTokenHash,
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + REFRESH_TTL * 1000),
  });

  return { accessToken, refreshToken, user: { id: user.id, phone: user.phone, role: user.role, fullName: user.fullName } };
}

export async function refresh(refreshToken: string, ipAddress: string, userAgent?: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const session = await findSessionByHash(tokenHash);
  if (!session) {
    throw Object.assign(new Error('error.refresh_token.invalid'), { statusCode: 401, errorCode: 'INVALID_REFRESH_TOKEN' });
  }

  await deleteSession(session.id);

  const { user } = session;
  const newAccessToken = signJwt(
    { sub: user.id, role: user.role, phone: user.phone, partner_bank_id: user.partnerBankId ?? undefined },
    ACCESS_TTL,
  );
  const newRefreshToken = crypto.randomBytes(48).toString('hex');
  const newRefreshHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

  await createSession({
    userId: user.id,
    deviceId: session.deviceId ?? undefined,
    refreshTokenHash: newRefreshHash,
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + REFRESH_TTL * 1000),
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const session = await findSessionByHash(tokenHash);
  if (session) await deleteSession(session.id);
}

export async function logoutAll(userId: string) {
  await deleteSessionsByUserId(userId);
}

export async function getMe(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw Object.assign(new Error('error.user.not_found'), { statusCode: 404, errorCode: 'USER_NOT_FOUND' });
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    county: user.county,
    language: user.language,
    isVerified: user.isVerified,
    kycStatus: user.kycStatus,
    createdAt: user.createdAt,
  };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await findUserById(userId);
  if (!user) throw Object.assign(new Error('error.user.not_found'), { statusCode: 404, errorCode: 'USER_NOT_FOUND' });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw Object.assign(new Error('error.credentials.invalid'), { statusCode: 401, errorCode: 'INVALID_CREDENTIALS' });

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await updatePasswordHash(userId, newHash);
}

export async function resetPassword(phone: string, code: string, newPassword: string) {
  const otpValid = await otpService.verifyOtp(phone, code);
  if (!otpValid) {
    throw Object.assign(new Error('error.otp.invalid'), { statusCode: 400, errorCode: 'OTP_INVALID' });
  }

  const user = await findUserByPhone(phone);
  if (!user) throw Object.assign(new Error('error.user.not_found'), { statusCode: 404, errorCode: 'USER_NOT_FOUND' });

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await updatePasswordHash(user.id, newHash);
  await deleteSessionsByUserId(user.id);
}

export async function updateMe(userId: string, dto: UpdateMeDto) {
  const data: UpdateProfileParams = {};
  if (dto.fullName !== undefined) data.fullName = dto.fullName;
  if (dto.email !== undefined) data.email = dto.email;
  if (dto.county !== undefined) data.county = dto.county;
  if (dto.language !== undefined) data.language = dto.language;

  const user = await updateUserProfile(userId, data);
  if (!user) throw Object.assign(new Error('error.user.not_found'), { statusCode: 404, errorCode: 'USER_NOT_FOUND' });
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    county: user.county,
    language: user.language,
    isVerified: user.isVerified,
    kycStatus: user.kycStatus,
    createdAt: user.createdAt,
  };
}
