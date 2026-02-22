import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cron from 'node-cron';
import { config } from './config.js';
import { connectRedis, disconnectRedis } from './redis.js';
import { connectMySQL, disconnectMySQL } from './db.js';
import { refreshPool } from './services/pool-fetcher.js';
import { poolRoutes } from './routes/pool.js';
import { healthRoutes } from './routes/health.js';
import { eventRoutes } from './routes/events.js';
import { configRoutes } from './routes/config.js';

const isProd = process.env.NODE_ENV === 'production';

const fastify = Fastify({
  logger: isProd
    ? { level: 'info' } // JSON logs in production (no pino-pretty)
    : {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      },
});

async function start(): Promise<void> {
  // Register plugins
  await fastify.register(cors, {
    origin: isProd
      ? ['https://swipe.hot', 'https://www.swipe.hot']
      : true,
  });

  await fastify.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
  });

  // Register routes
  await fastify.register(poolRoutes);
  await fastify.register(healthRoutes);
  await fastify.register(eventRoutes);
  await fastify.register(configRoutes);

  // Connect to Redis
  console.log('[Server] Connecting to Redis...');
  await connectRedis();

  // Connect to MySQL (optional — gracefully degrades to in-memory buffer)
  console.log('[Server] Connecting to MySQL...');
  await connectMySQL();

  // Initial pool fetch
  console.log('[Server] Running initial pool fetch...');
  try {
    await refreshPool();
  } catch (err) {
    console.error('[Server] Initial pool fetch failed (will retry on cron):', (err as Error).message);
  }

  // Schedule pool refresh cron
  cron.schedule(config.poolRefreshCron, async () => {
    try {
      await refreshPool();
    } catch (err) {
      console.error('[Cron] Pool refresh failed:', (err as Error).message);
    }
  });
  console.log(`[Server] Pool refresh cron scheduled: ${config.poolRefreshCron}`);

  // Start server
  await fastify.listen({ port: config.port, host: config.host });
  console.log(`[Server] API running on http://${config.host}:${config.port}`);
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  console.log(`[Server] ${signal} received, shutting down...`);
  await fastify.close();
  await disconnectRedis();
  await disconnectMySQL();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
