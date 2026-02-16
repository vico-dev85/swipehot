import { getRedis } from '../redis.js';

const SESSION_KEY_PREFIX = 'session:seen:';
const SESSION_TTL = 1800; // 30 minutes
const MAX_SESSION_SIZE = 100; // rotate after 100 performers

// Session exclusion: track which performers a session has already seen
// Uses Redis SADD/SISMEMBER/EXPIRE (ported from v3.0 PHP plugin's WP transients)

export async function markSeen(sessionId: string, username: string): Promise<void> {
  const redis = getRedis();
  const key = `${SESSION_KEY_PREFIX}${sessionId}`;

  // Check if session needs rotation (> MAX_SESSION_SIZE)
  const size = await redis.scard(key);
  if (size >= MAX_SESSION_SIZE) {
    await redis.del(key);
  }

  await redis.sadd(key, username);
  await redis.expire(key, SESSION_TTL);
}

export async function hasSeen(sessionId: string, username: string): Promise<boolean> {
  const redis = getRedis();
  const key = `${SESSION_KEY_PREFIX}${sessionId}`;
  const result = await redis.sismember(key, username);
  return result === 1;
}

export async function getSeenCount(sessionId: string): Promise<number> {
  const redis = getRedis();
  const key = `${SESSION_KEY_PREFIX}${sessionId}`;
  return redis.scard(key);
}

export async function getSeenSet(sessionId: string): Promise<Set<string>> {
  const redis = getRedis();
  const key = `${SESSION_KEY_PREFIX}${sessionId}`;
  const members = await redis.smembers(key);
  return new Set(members);
}

// Validate session ID: must be alphanumeric, 16-64 chars
export function isValidSessionId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  if (id.length < 16 || id.length > 64) return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}
