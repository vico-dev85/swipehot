import type { FastifyInstance } from 'fastify';
import type { HealthResponse, GenderFilter } from '@xcamvip/shared';
import { getPool } from '../services/pool-fetcher.js';
import { isRedisConnected, getRedis } from '../redis.js';

const startTime = Date.now();

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /api/health — overall system health
  fastify.get('/api/health', async (_request, reply) => {
    const redis = getRedis();
    const redisOk = await isRedisConnected();

    // Get pool sizes
    const genders: GenderFilter[] = ['all', 'f', 'm', 't', 'c'];
    const poolSizes: Record<GenderFilter, number> = { all: 0, f: 0, m: 0, t: 0, c: 0 };
    for (const g of genders) {
      const pool = await getPool(g);
      poolSizes[g] = pool.length;
    }

    // Get last fetch metadata
    let cacheAgeSeconds = Infinity;
    let lastFetchSuccess = false;
    const metaRaw = await redis.get('pool:meta:last_fetch');
    if (metaRaw) {
      const meta = JSON.parse(metaRaw);
      cacheAgeSeconds = Math.round((Date.now() - meta.timestamp) / 1000);
      lastFetchSuccess = meta.success;
    }

    // Determine status
    let status: HealthResponse['status'] = 'ok';
    if (!redisOk) status = 'down';
    else if (poolSizes.all === 0 || cacheAgeSeconds > 180) status = 'degraded';

    const response: HealthResponse = {
      status,
      uptime: Math.round((Date.now() - startTime) / 1000),
      pool_sizes: poolSizes,
      cache_age_seconds: cacheAgeSeconds === Infinity ? -1 : cacheAgeSeconds,
      last_fetch_success: lastFetchSuccess,
      redis_connected: redisOk,
    };

    const httpStatus = status === 'down' ? 503 : status === 'degraded' ? 200 : 200;
    return reply.status(httpStatus).send(response);
  });
}
