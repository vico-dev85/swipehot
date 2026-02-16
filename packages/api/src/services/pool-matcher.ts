/**
 * Pool Matcher — Personalized performer selection
 *
 * Blended scoring: alpha * personalScore + (1-alpha) * popularityScore
 * With 30% exploration picks for variety.
 * Based on research: researches/results/04-personalization-recommendation.md
 */

import type { CachedPerformer } from '@xcamvip/shared';

interface MatchOptions {
  pool: CachedPerformer[];
  seenUsernames: Set<string>;
  preferTags: string[];
  alpha: number; // 0 = pure popularity, 0.85 = heavily personalized
}

interface ScoredPerformer {
  performer: CachedPerformer;
  score: number;
}

/**
 * Calculate personal score based on tag overlap with user preferences.
 * More overlap = higher score. Order matters (first tag = strongest preference).
 */
function personalScore(performer: CachedPerformer, preferTags: string[]): number {
  if (preferTags.length === 0) return 0;
  let score = 0;
  for (let i = 0; i < preferTags.length; i++) {
    const tag = preferTags[i];
    if (performer.normalized_tags.includes(tag)) {
      // Earlier tags in preferTags have higher weight (stronger preference)
      score += (preferTags.length - i) / preferTags.length;
    }
  }
  // Normalize to 0-100 range
  return (score / preferTags.length) * 100;
}

/**
 * Normalize quality_score to 0-100 range within the current pool.
 */
function normalizePopularity(pool: CachedPerformer[]): Map<string, number> {
  const scores = new Map<string, number>();
  if (pool.length === 0) return scores;

  let maxScore = -Infinity;
  let minScore = Infinity;
  for (const p of pool) {
    if (p.quality_score > maxScore) maxScore = p.quality_score;
    if (p.quality_score < minScore) minScore = p.quality_score;
  }
  const range = maxScore - minScore || 1;

  for (const p of pool) {
    scores.set(p.username, ((p.quality_score - minScore) / range) * 100);
  }
  return scores;
}

/**
 * Weighted random selection from scored performers.
 * Picks from top quartile with probability proportional to score.
 */
function weightedRandomPick(scored: ScoredPerformer[]): CachedPerformer {
  if (scored.length === 0) throw new Error('No performers to pick from');
  if (scored.length === 1) return scored[0].performer;

  // Take top 25%
  const topCount = Math.max(1, Math.ceil(scored.length * 0.25));
  const topQuartile = scored.slice(0, topCount);

  // Weighted random within top quartile
  const totalWeight = topQuartile.reduce((sum, s) => sum + Math.max(s.score, 0.1), 0);
  let random = Math.random() * totalWeight;

  for (const entry of topQuartile) {
    random -= Math.max(entry.score, 0.1);
    if (random <= 0) return entry.performer;
  }

  return topQuartile[topQuartile.length - 1].performer;
}

/**
 * Select the best performer from the pool using blended scoring.
 * Returns null if no unseen performers are available.
 */
export function selectPerformer(options: MatchOptions): CachedPerformer | null {
  const { pool, seenUsernames, preferTags, alpha } = options;

  // Filter out seen performers
  const unseen = pool.filter(p => !seenUsernames.has(p.username));
  if (unseen.length === 0) return null;

  // 30% chance of pure exploration (random pick from full unseen pool)
  if (Math.random() < 0.3) {
    return unseen[Math.floor(Math.random() * unseen.length)];
  }

  // Blended scoring for remaining 70%
  const popScores = normalizePopularity(unseen);

  const scored: ScoredPerformer[] = unseen.map(performer => {
    const popScore = popScores.get(performer.username) ?? 0;
    const persScore = personalScore(performer, preferTags);
    const blended = alpha * persScore + (1 - alpha) * popScore;
    return { performer, score: blended };
  });

  // Sort by blended score descending
  scored.sort((a, b) => b.score - a.score);

  // Weighted random from top quartile (not deterministic top-1)
  return weightedRandomPick(scored);
}
