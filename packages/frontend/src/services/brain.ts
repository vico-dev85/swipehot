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

interface BrainState {
  preferences: Record<string, number>;
  totalSwipes: number;
  lastUpdated: number;
  recentWatchTimes: number[]; // last N watch durations for boredom detection
  hasShownFirstLikeFeedback: boolean;
}

function loadState(): BrainState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt data */ }
  return {
    preferences: {},
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
 */
export function updatePreferences(
  tags: string[],
  action: "skip" | "like" | "cta",
  watchSeconds: number
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

  // Apply new signal to performer's tags
  for (const tag of tags) {
    state.preferences[tag] = (state.preferences[tag] || 0) + weight;
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
