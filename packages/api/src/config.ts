import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  cbApiUrl: process.env.CB_API_URL || 'https://chaturbate.com/api/public/affiliates/onlinerooms/',
  cbApiToken: process.env.CB_API_TOKEN || '',

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  affiliate: {
    campaign: process.env.AFFILIATE_CAMPAIGN || 'roGHG',
    tour: process.env.AFFILIATE_TOUR || '9oGW',
    track: process.env.AFFILIATE_TRACK || 'wetroulette',
  },

  poolRefreshCron: process.env.POOL_REFRESH_CRON || '*/60 * * * * *',

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  },
} as const;
