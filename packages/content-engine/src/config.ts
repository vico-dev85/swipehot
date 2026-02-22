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

// Determine which API key is required based on provider
function requireApiKey(provider: AIProvider): string {
  switch (provider) {
    case 'claude':
      return required('ANTHROPIC_API_KEY');
    case 'arli':
      return required('ARLI_API_KEY');
    case 'openai':
      return required('OPENAI_API_KEY');
  }
}

export function loadConfig(providerOverride?: AIProvider) {
  const provider: AIProvider = providerOverride
    || (process.env.AI_PROVIDER as AIProvider)
    || 'arli'; // Default to ArliAI

  return {
    // Brand
    siteName: required('SITE_NAME'),
    siteTagline: optional('SITE_TAGLINE', 'Live Cam Roulette'),
    siteDomain: required('SITE_DOMAIN'),
    whitelabelDomain: optional('WHITELABEL_DOMAIN', `www.${process.env.SITE_DOMAIN || ''}`),

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

    // AI Provider
    aiProvider: provider,
    aiApiKey: requireApiKey(provider),
    arliModel: optional('ARLI_MODEL', 'Mistral-Small-24B-ArliAI-RPMax-v1.1'),
    openaiModel: optional('OPENAI_MODEL', 'gpt-4o-mini'),

    // Keep for backwards compat (some code may reference directly)
    anthropicApiKey: provider === 'claude' ? requireApiKey(provider) : '',
  };
}

export type Config = ReturnType<typeof loadConfig>;
