// Centralized config from environment variables.
// Supports multiple AI providers: claude, arli, openai.

export type AIProvider = 'claude' | 'arli' | 'openai';

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`ERROR: Missing required env var ${name}. Set it in .env or environment.`);
    process.exit(1);
  }
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

// Get API key for provider. Returns empty string if not set (some commands don't need AI).
function getApiKey(provider: AIProvider): string {
  switch (provider) {
    case 'claude':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'arli':
      return process.env.ARLI_API_KEY || '';
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
  }
}

export function loadConfig(providerOverride?: AIProvider) {
  const provider: AIProvider = providerOverride
    || (process.env.AI_PROVIDER as AIProvider)
    || 'arli'; // Default to ArliAI

  return {
    // Brand (defaults for local dev — override in .env for production)
    siteName: optional('SITE_NAME', 'XCam.VIP'),
    siteTagline: optional('SITE_TAGLINE', 'Live Cam Roulette'),
    siteDomain: optional('SITE_DOMAIN', 'xcam.vip'),
    whitelabelDomain: optional('WHITELABEL_DOMAIN', `www.${optional('SITE_DOMAIN', 'xcam.vip')}`),

    // Affiliate
    affiliateCampaign: optional('AFFILIATE_CAMPAIGN', 'roGHG'),
    affiliateTour: optional('AFFILIATE_TOUR', '9oGW'),
    affiliateTrack: optional('AFFILIATE_TRACK', 'xcamvip-roulette'),

    // Database
    mysql: {
      host: optional('MYSQL_HOST', 'localhost'),
      port: parseInt(optional('MYSQL_PORT', '3306'), 10),
      user: optional('MYSQL_USER', 'root'),
      password: optional('MYSQL_PASS', ''),
      database: optional('MYSQL_DB', 'xcamvip'),
    },

    // AI Provider (key may be empty for non-AI commands like build-pages, status, sitemap)
    aiProvider: provider,
    aiApiKey: getApiKey(provider),
    arliModel: optional('ARLI_MODEL', 'Mistral-Small-24B-ArliAI-RPMax-v1.1'),
    openaiModel: optional('OPENAI_MODEL', 'gpt-4o-mini'),

    // Keep for backwards compat (some code may reference directly)
    anthropicApiKey: provider === 'claude' ? getApiKey(provider) : '',
  };
}

export type Config = ReturnType<typeof loadConfig>;
