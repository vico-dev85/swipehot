import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  cbApiUrl: process.env.CB_API_URL || 'https://chaturbate.com/api/public/affiliates/onlinerooms/',
  cbApiToken: process.env.CB_API_TOKEN || '',

  // White label domain — embeds and CTAs go through this, not chaturbate.com directly
  // This avoids ad blocker issues and keeps branding consistent
  whitelabelDomain: process.env.WHITELABEL_DOMAIN || 'cams.swipe.hot',

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  affiliate: {
    campaign: process.env.AFFILIATE_CAMPAIGN || 'roGHG',
    tour: process.env.AFFILIATE_TOUR || '9oGW',
    track: process.env.AFFILIATE_TRACK || 'swipehot-roulette',
  },

  poolRefreshCron: process.env.POOL_REFRESH_CRON || '*/60 * * * * *',

  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'swipehot',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'swipehot',
    connectionLimit: parseInt(process.env.MYSQL_POOL_SIZE || '10', 10),
  },

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  },
} as const;
