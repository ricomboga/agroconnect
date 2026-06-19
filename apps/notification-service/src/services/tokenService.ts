import { findTokenByUserId } from '../repositories/fcmTokenRepository.js';

export async function getToken(userId: string): Promise<string | null> {
  return findTokenByUserId(userId);
}
