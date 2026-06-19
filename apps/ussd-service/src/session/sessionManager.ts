import { redis } from '../lib/redis.js';
import { logger } from '../logger.js';
import type { SessionData } from '../types/index.js';

const SESSION_TTL_SECONDS = 300;

function sessionKey(sessionId: string): string {
  return `ussd:${sessionId}`;
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  try {
    const raw = await redis.get(sessionKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch (err) {
    logger.error({ err, sessionId }, 'Failed to read USSD session');
    return null;
  }
}

export async function upsertSession(
  sessionId: string,
  phoneNumber: string,
  currentMenu: string,
): Promise<void> {
  const data: SessionData = { phoneNumber, currentMenu, lastSeen: Date.now() };
  try {
    await redis.set(sessionKey(sessionId), JSON.stringify(data), 'EX', SESSION_TTL_SECONDS);
  } catch (err) {
    logger.error({ err, sessionId }, 'Failed to write USSD session');
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await redis.del(sessionKey(sessionId));
  } catch (err) {
    logger.error({ err, sessionId }, 'Failed to delete USSD session');
  }
}
