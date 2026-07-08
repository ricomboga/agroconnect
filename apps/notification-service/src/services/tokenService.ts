import { findTokenByUserId, findAllTokens } from '../repositories/fcmTokenRepository.js';

export async function getToken(userId: string): Promise<string | null> {
  return findTokenByUserId(userId);
}

export async function getAllTokens(): Promise<{ userId: string; token: string }[]> {
  return findAllTokens();
}
