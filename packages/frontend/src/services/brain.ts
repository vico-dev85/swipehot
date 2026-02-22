/**
 * Session Personalization Brain
 *
 * 30-dimension tag preference vector stored in localStorage.
 * Weighted signals with exponential time decay.
 * Based on research: researches/results/04-personalization-recommendation.md
 */

const STORAGE_KEY = "xcam_brain";
const DECAY_RATE = 0.004; // half-life ~7 days
const MAX_ALPHA = 0.85;
const ALPHA_RAMP = 20; // swipes to reach max alpha
const BOREDOM_WINDOW = 10;
const BOREDOM_SKIP_THRESHOLD = 0.7; // 70% skip rate triggers boredom
const IMPLICIT_WEIGHT = 0.7; // age/country weighted lower than explicit tags
const MIN_GENDER_SAMPLES = 5; // min views of a gender before computing preference
const GENDER_WEIGHT_FLOOR = 0.05; // never fully zero-out a gender (exploration)

// Known countries (same list as performer-info.ts)
const KNOWN_COUNTRIES = new Set([
  "US","CO","RO","RU","UA","GB","ES","MX","BR","DE","FR","IT","CA","AU",
  "NL","PL","CZ","AR","CL","PE","PH","TH","JP","KR","IN","ZA","NZ","SE",
  "LT","LV","EE","HU","PT","VE","EC",
]);

/** Build synthetic tags from structured data (age bucket + country) */
function buildSyntheticTags(age: number | null, country: string): string[] {
  const synthetic: string[] = [];

  // Age bucket — only legit ages (18-69)
  if (age !== null && age >= 18 && age <= 69) {
    if (age <= 22) synthetic.push("age_18_22");
    else if (age <= 30) synthetic.push("age_23_30");
    else if (age <= 40) synthetic.push("age_31_40");
    else synthetic.push("age_41_plus");
  }

  // Country — only known 2-letter codes
  if (country && country.length === 2 && KNOWN_COUNTRIES.has(country.toUpperCase())) {
    synthetic.push("country_" + country.toLowerCase());
  }

  return synthetic;
}

interface GenderStats {
  views: number;
  skips: number;       // watched < 3s
  engaged: number;     // watched 10s+ OR liked OR CTA
  totalWatchSec: number;
}

interface BrainState {
  preferences: Record<string, number>;
  genderStats: Record<string, GenderStats>; // keyed by 'f','m','t','c'
  totalSwipes: number;
  lastUpdated: number;
  recentWatchTimes: number[]; // last N watch durations for boredom detection
  hasShownFirstLikeFeedback: boolean;
}

function loadState(): BrainState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate: add genderStats if missing (existing users upgrading)
      if (!parsed.genderStats) parsed.genderStats = {};
      return parsed;
    }
  } catch { /* corrupt data */ }
  return {
    preferences: {},
    genderStats: {},
    totalSwipes: 0,
    lastUpdated: Date.now(),
    recentWatchTimes: [],
    hasShownFirstLikeFeedback: false,
  };
}

function saveState(state: BrainState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage full */ }
}

let state = loadState();

/**
 * Update preferences after viewing a performer.
 * action: 'skip' | 'like' | 'cta'
 * gender: performer's gender ('f','m','t','c')
 * age/country: structured data for synthetic tag generation (optional)
 */
export function updatePreferences(
  tags: string[],
  action: "skip" | "like" | "cta",
  watchSeconds: number,
  gender?: string,
  age?: number | null,
  country?: string
): void {
  // Calculate signal weight
  const weight =
    action === "cta" ? 1.2 :
    action === "like" ? 1.0 :
    watchSeconds > 60 ? 0.8 :
    watchSeconds > 30 ? 0.4 :
    watchSeconds > 10 ? 0.1 :
    watchSeconds < 3 ? -0.5 : -0.2;

  // Apply time decay to existing preferences
  const hoursSince = (Date.now() - state.lastUpdated) / 3600000;
  if (hoursSince > 0.01) {
    const decay = Math.exp(-DECAY_RATE * hoursSince);
    for (const tag in state.preferences) {
      state.preferences[tag] *= decay;
      // Clean up near-zero values
      if (Math.abs(state.preferences[tag]) < 0.01) {
        delete state.preferences[tag];
      }
    }
  }

  // Apply new signal to performer's explicit tags
  for (const tag of tags) {
    state.preferences[tag] = (state.preferences[tag] || 0) + weight;
  }

  // Apply synthetic tags (age bucket + country) at reduced weight
  const synthetic = buildSyntheticTags(age ?? null, country ?? "");
  for (const tag of synthetic) {
    state.preferences[tag] = (state.preferences[tag] || 0) + weight * IMPLICIT_WEIGHT;
  }

  // Track gender engagement stats
  if (gender && ["f", "m", "t", "c"].includes(gender)) {
    if (!state.genderStats[gender]) {
      state.genderStats[gender] = { views: 0, skips: 0, engaged: 0, totalWatchSec: 0 };
    }
    const gs = state.genderStats[gender];
    gs.views++;
    gs.totalWatchSec += watchSeconds;
    if (watchSeconds < 3 && action === "skip") gs.skips++;
    if (watchSeconds >= 10 || action === "like" || action === "cta") gs.engaged++;
  }

  // Track swipe count and watch time for boredom detection
  state.totalSwipes++;
  state.recentWatchTimes.push(watchSeconds);
  if (state.recentWatchTimes.length > BOREDOM_WINDOW) {
    state.recentWatchTimes.shift();
  }

  state.lastUpdated = Date.now();
  saveState(state);
}

/**
 * Get gender weights based on behavioral signals.
 * Returns null if not enough data yet, otherwise a map like {f: 0.8, m: 0.05, t: 0.1, c: 0.05}
 * Weights sum to ~1. Disliked genders get GENDER_WEIGHT_FLOOR (never zero — exploration).
 */
export function getGenderWeights(): Record<string, number> | null {
  const genders = ["f", "m", "t", "c"];
  const totalViews = genders.reduce((sum, g) => sum + (state.genderStats[g]?.views || 0), 0);

  // Need enough total data before inferring gender preference
  if (totalViews < MIN_GENDER_SAMPLES) return null;

  // Compute engagement rate per gender (engaged / views), default to neutral 0.5
  const scores: Record<string, number> = {};
  for (const g of genders) {
    const gs = state.genderStats[g];
    if (!gs || gs.views < 2) {
      // Not enough data for this gender — low default (exploration only)
      scores[g] = 0.1;
    } else {
      const engageRate = gs.engaged / gs.views; // 0-1, higher = likes this gender
      const skipRate = gs.skips / gs.views;      // 0-1, higher = dislikes
      // Score: engagement rate penalized by skip rate
      // Range roughly 0 to 1. Fast-skip-heavy gender → near 0
      scores[g] = Math.max(0, engageRate - skipRate * 0.5);
    }
  }

  // Normalize to weights summing to 1, with floor
  const rawSum = genders.reduce((sum, g) => sum + scores[g], 0);
  if (rawSum <= 0) return null; // all zero, no preference detectable

  const weights: Record<string, number> = {};
  for (const g of genders) {
    weights[g] = Math.max(GENDER_WEIGHT_FLOOR, scores[g] / rawSum);
  }

  // Re-normalize after floor clamping, then re-enforce floor
  const wSum = genders.reduce((sum, g) => sum + weights[g], 0);
  for (const g of genders) {
    weights[g] = Math.max(GENDER_WEIGHT_FLOOR, Math.round((weights[g] / wSum) * 1000) / 1000);
  }

  return weights;
}

/**
 * Get top N preferred tags for API prefer_tags parameter.
 */
export function getPreferredTags(n: number = 5): string[] {
  const entries = Object.entries(state.preferences)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  return entries.slice(0, n).map(([tag]) => tag);
}

/**
 * Get alpha (personalization blend ratio).
 * 0 = pure popularity, 0.85 = heavily personalized.
 */
export function getAlpha(): number {
  return Math.min(MAX_ALPHA, state.totalSwipes / ALPHA_RAMP);
}

/**
 * Detect boredom: high skip rate in recent window.
 * Returns true if exploration should be increased.
 */
export function isBored(): boolean {
  if (state.recentWatchTimes.length < BOREDOM_WINDOW) return false;
  const skipCount = state.recentWatchTimes.filter((t) => t < 3).length;
  return skipCount / state.recentWatchTimes.length > BOREDOM_SKIP_THRESHOLD;
}

/**
 * Get total swipes for this brain's lifetime.
 */
export function getTotalSwipes(): number {
  return state.totalSwipes;
}

/**
 * Check if first-like feedback has been shown.
 */
export function hasShownFirstLikeFeedback(): boolean {
  return state.hasShownFirstLikeFeedback;
}

/**
 * Mark first-like feedback as shown.
 */
export function markFirstLikeFeedbackShown(): void {
  state.hasShownFirstLikeFeedback = true;
  saveState(state);
}
