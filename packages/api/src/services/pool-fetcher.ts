import type { CBPerformer, CachedPerformer, GenderFilter } from '@xcamvip/shared';
import { POOL_SIZES } from '@xcamvip/shared';
import { config } from '../config.js';
import { getRedis } from '../redis.js';

const REDIS_KEY_PREFIX = 'pool:';
const CACHE_TTL = 120; // 2 minutes — pool refresh runs every 60s, so data is always fresh

// Tag normalization: collapse synonyms into canonical tags
// ~30-40 groups covering 97+ raw Chaturbate tags
const TAG_SYNONYMS: Record<string, string[]> = {
  latina: ['latina', 'latin', 'colombian', 'mexican', 'brazilian', 'spanish'],
  asian: ['asian', 'japanese', 'korean', 'chinese', 'thai', 'filipina'],
  ebony: ['ebony', 'black', 'african'],
  bigboobs: ['bigboobs', 'bigtits', 'hugetits', 'busty', 'bigbreasts'],
  smalltits: ['smalltits', 'tinytits', 'flatchest', 'petite'],
  milf: ['milf', 'mature', 'mom', 'mommy'],
  teen: ['teen', '18', 'young', 'barely legal'],
  blonde: ['blonde', 'blond'],
  brunette: ['brunette', 'darkhaair'],
  redhead: ['redhead', 'ginger', 'red hair'],
  anal: ['anal', 'ass', 'butt'],
  lovense: ['lovense', 'lush', 'ohmibod', 'interactive', 'toy'],
  squirt: ['squirt', 'squirting'],
  bdsm: ['bdsm', 'bondage', 'domination', 'submissive'],
  feet: ['feet', 'foot', 'footfetish', 'soles'],
  hairy: ['hairy', 'bush', 'natural'],
  tattoo: ['tattoo', 'tattoos', 'tattooed', 'inked'],
  curvy: ['curvy', 'bbw', 'thick', 'chubby', 'plussize'],
  skinny: ['skinny', 'slim', 'thin', 'fit'],
  couple: ['couple', 'couples', 'duo'],
  lesbian: ['lesbian', 'lesbians', 'girlongirl'],
  muscle: ['muscle', 'muscular', 'fit', 'athletic', 'bodybuilder'],
};

// Build reverse lookup: raw tag → canonical tag
const tagToCanonical = new Map<string, string>();
for (const [canonical, synonyms] of Object.entries(TAG_SYNONYMS)) {
  for (const syn of synonyms) {
    tagToCanonical.set(syn.toLowerCase(), canonical);
  }
}

export function normalizeTags(rawTags: string[]): string[] {
  const normalized = new Set<string>();
  for (const raw of rawTags) {
    const lower = raw.toLowerCase().trim();
    const canonical = tagToCanonical.get(lower);
    if (canonical) {
      normalized.add(canonical);
    } else {
      normalized.add(lower);
    }
  }
  return [...normalized];
}

// Quality score: weighted combination of viewers, HD, time online
// Higher = better quality. Used for top-quartile selection (from v2.0 plugin).
function calculateQualityScore(performer: CBPerformer): number {
  let score = 0;
  // Viewer count (log scale — 1000 viewers isn't 10x better than 100)
  score += Math.log10(Math.max(performer.num_users, 1)) * 25;
  // HD bonus
  if (performer.is_hd) score += 15;
  // Online time sweet spot: 10-60 minutes is best (warmed up, not exhausted)
  const minutesOnline = performer.seconds_online / 60;
  if (minutesOnline >= 10 && minutesOnline <= 60) score += 10;
  else if (minutesOnline > 60 && minutesOnline <= 120) score += 5;
  // Minimum viewer threshold (from v3.0 plugin)
  if (performer.num_users < 1) score -= 50;
  return Math.round(score * 100) / 100;
}

// Map gender codes: CB uses 's' for couples sometimes
function mapGender(gender: string): 'f' | 'm' | 't' | 'c' {
  switch (gender) {
    case 'f': return 'f';
    case 'm': return 'm';
    case 't': return 't';
    case 'c':
    case 's': return 'c';
    default: return 'f';
  }
}

// Fetch performers from Chaturbate API for a given gender
async function fetchFromCB(gender: GenderFilter, limit: number): Promise<CBPerformer[]> {
  const params = new URLSearchParams({
    wm: config.affiliate.campaign,
    client_ip: 'request_ip',
    limit: String(limit),
    format: 'json',
  });
  if (gender !== 'all') {
    params.set('gender', gender);
  }

  const url = `${config.cbApiUrl}?${params}`;
  const headers: Record<string, string> = {};
  if (config.cbApiToken) {
    headers['Authorization'] = `Bearer ${config.cbApiToken}`;
  }

  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });

  if (!response.ok) {
    throw new Error(`CB API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json() as { results: CBPerformer[] };
  return data.results || [];
}

// Fetch with retry (from v2.0 plugin — multi-attempt with one retry after 1s)
async function fetchWithRetry(gender: GenderFilter, limit: number): Promise<CBPerformer[]> {
  try {
    return await fetchFromCB(gender, limit);
  } catch (err) {
    console.warn(`[PoolFetcher] First attempt failed for ${gender}, retrying in 1s...`, (err as Error).message);
    await new Promise(r => setTimeout(r, 1000));
    return await fetchFromCB(gender, limit);
  }
}

// Process raw CB performers into cached format
function processPerformers(raw: CBPerformer[]): CachedPerformer[] {
  const now = Date.now();
  return raw
    .filter(p => p.num_users >= 1) // viewer threshold (v3.0)
    .map(p => ({
      username: p.username,
      display_name: p.display_name || p.username,
      gender: mapGender(p.gender),
      age: p.age,
      num_users: p.num_users,
      tags: p.tags || [],
      normalized_tags: normalizeTags(p.tags || []),
      image_url: p.image_url_360x270 || p.image_url,
      iframe_embed: p.iframe_embed,
      chat_room_url: p.chat_room_url,
      room_subject: p.room_subject || '',
      is_hd: p.is_hd,
      seconds_online: p.seconds_online,
      quality_score: calculateQualityScore(p),
      fetched_at: now,
    }))
    .sort((a, b) => b.quality_score - a.quality_score); // best first
}

// Refresh the pool for all genders — runs on cron
export async function refreshPool(): Promise<void> {
  const redis = getRedis();
  const genders: GenderFilter[] = ['all', 'f', 'm', 't', 'c'];
  const startTime = Date.now();

  console.log('[PoolFetcher] Refreshing pools...');

  const results = await Promise.allSettled(
    genders.map(async (gender) => {
      const limit = POOL_SIZES[gender];
      const raw = await fetchWithRetry(gender, limit);
      const processed = processPerformers(raw);

      // Store in Redis as JSON array
      const key = `${REDIS_KEY_PREFIX}${gender}`;
      await redis.set(key, JSON.stringify(processed), 'EX', CACHE_TTL);

      return { gender, count: processed.length };
    })
  );

  const elapsed = Date.now() - startTime;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      console.log(`[PoolFetcher] ${result.value.gender}: ${result.value.count} performers cached`);
    } else {
      console.error(`[PoolFetcher] Failed:`, result.reason);
    }
  }

  // Store last fetch metadata
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  await redis.set('pool:meta:last_fetch', JSON.stringify({
    timestamp: Date.now(),
    elapsed_ms: elapsed,
    success: successCount === genders.length,
    pools_refreshed: successCount,
  }), 'EX', CACHE_TTL * 2);

  console.log(`[PoolFetcher] Done in ${elapsed}ms (${successCount}/${genders.length} pools)`);
}

// Get cached pool for a gender
export async function getPool(gender: GenderFilter): Promise<CachedPerformer[]> {
  const redis = getRedis();
  const key = `${REDIS_KEY_PREFIX}${gender}`;
  const data = await redis.get(key);
  if (!data) return [];
  return JSON.parse(data) as CachedPerformer[];
}
