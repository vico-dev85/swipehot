import { Redis } from 'ioredis';
import { config } from './config.js';

/**
 * In-memory Redis substitute for local dev without Redis installed.
 * Implements the subset of Redis commands we use (get, set, del, sadd, sismember, scard, smembers, expire, ping).
 */
class MemoryStore {
  private data = new Map<string, { value: string | Set<string>; expiresAt?: number }>();

  private alive(key: string): boolean {
    const entry = this.data.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.data.delete(key);
      return false;
    }
    return true;
  }

  async ping(): Promise<string> { return 'PONG'; }

  async get(key: string): Promise<string | null> {
    if (!this.alive(key)) return null;
    const v = this.data.get(key)!.value;
    return typeof v === 'string' ? v : null;
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK'> {
    const expiresAt = (mode === 'EX' && ttl) ? Date.now() + ttl * 1000 : undefined;
    this.data.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.alive(key)) {
      this.data.set(key, { value: new Set<string>() });
    }
    const set = this.data.get(key)!.value as Set<string>;
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) { set.add(m); added++; }
    }
    return added;
  }

  async sismember(key: string, member: string): Promise<number> {
    if (!this.alive(key)) return 0;
    const set = this.data.get(key)!.value as Set<string>;
    return set.has(member) ? 1 : 0;
  }

  async scard(key: string): Promise<number> {
    if (!this.alive(key)) return 0;
    const set = this.data.get(key)!.value as Set<string>;
    return set.size;
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.alive(key)) return [];
    const set = this.data.get(key)!.value as Set<string>;
    return [...set];
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.data.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async quit(): Promise<'OK'> { return 'OK'; }
}

// We type the store as `any` so it satisfies both Redis and MemoryStore usage
let redis: any = null;
let usingMemory = false;

export function getRedis(): any {
  if (!redis) {
    throw new Error('Redis/MemoryStore not initialized — call connectRedis() first');
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  // Try real Redis first
  try {
    const r = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy() { return null; }, // don't retry — fail fast
      lazyConnect: true,
      connectTimeout: 3000,
    });
    await r.connect();
    await r.ping();
    redis = r;
    usingMemory = false;

    r.on('error', (err: Error) => {
      console.error('[Redis] Connection error:', err.message);
    });
    console.log('[Redis] Connected');
    return;
  } catch {
    console.warn('[Redis] Not available — using in-memory store (fine for local dev)');
  }

  // Fallback to in-memory
  redis = new MemoryStore();
  usingMemory = true;
  console.log('[MemoryStore] Ready');
}

export async function disconnectRedis(): Promise<void> {
  if (redis && !usingMemory) {
    await redis.quit();
  }
  redis = null;
}

export async function isRedisConnected(): Promise<boolean> {
  try {
    const pong = await redis?.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
