// Scoring engine for living listicle pages.
// Computes a composite score for each model to determine ranking on category pages.
//
// Score formula (v2):
//   online_bonus          +1000 if currently live
//   viewer_score          log10(viewers) * 200  (logarithmic — 10 viewers ≈ 400, 1000 ≈ 600, 10K ≈ 800)
//   follower_score        log10(followers) * 50  (578K followers ≈ 288, 1K ≈ 150)
//   upvotes_decayed       decayed votes * 3
//   avg_viewers_7d        weekly average * 0.3
//   new_model_bonus       +200 if new
//   tag_relevance         0-1 fraction * 150
//   streaming_bonus       +100 if online > 1 hour, +50 if > 30 min
//   manual_boost          from boosts.json (default 0)
//   room_subject_keywords extra relevance from room subject text matching category tags

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ScoredModel {
  username: string;
  displayName: string;
  score: number;
  isOnline: boolean;
  currentViewers: number;
  upvotes: number;
  upvotesDecayed: number;
  avgViewers7d: number;
  isNew: boolean;
  tagRelevance: number;
  // Data for display
  age: number | null;
  gender: string;
  tags: string[];
  imageUrl: string;
  screenshotPath: string | null;
  bioCached: string | null;
  country: string;
  numFollowers: number;
  roomSubject: string;
  secondsOnline: number;
  manualBoost: number;
}

export interface VoteRecord {
  createdAt: Date;
}

// Decay function: older votes count less. Full value for today, ~0.3 after a week.
export function computeVoteDecay(voteDate: Date, now: Date = new Date()): number {
  const daysSinceVote = (now.getTime() - voteDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceVote < 0) return 1.0;
  return 1.0 / (1 + daysSinceVote * 0.15);
}

export function computeDecayedUpvotes(votes: VoteRecord[], now: Date = new Date()): number {
  return votes.reduce((sum, v) => sum + computeVoteDecay(v.createdAt, now), 0);
}

// Tag relevance: fraction of category tags that appear in model's tags
export function computeTagRelevance(modelTags: string[], categoryTags: string[]): number {
  if (categoryTags.length === 0) return 0;
  const modelTagSet = new Set(modelTags.map(t => t.toLowerCase()));
  const matches = categoryTags.filter(ct => modelTagSet.has(ct.toLowerCase()));
  return matches.length / categoryTags.length;
}

// Room subject keyword matching: check if room_subject contains category-relevant words
export function computeSubjectRelevance(roomSubject: string, categoryTags: string[]): number {
  if (!roomSubject || categoryTags.length === 0) return 0;
  const subjectLower = roomSubject.toLowerCase();
  const matches = categoryTags.filter(t => subjectLower.includes(t.toLowerCase()));
  return Math.min(matches.length / categoryTags.length, 1.0);
}

export interface ScoreInput {
  isOnline: boolean;
  currentViewers: number;
  numFollowers: number;
  upvotesDecayed: number;
  avgViewers7d: number;
  isNewModel: boolean;
  tagRelevance: number;
  subjectRelevance: number;
  secondsOnline: number;
  manualBoost: number;
}

// Core scoring formula (v2).
export function computeScore(input: ScoreInput): number {
  // Logarithmic viewer score — prevents one 10K-viewer model from dominating
  const viewerScore = input.currentViewers > 0
    ? Math.log10(input.currentViewers) * 200
    : 0;

  // Follower score — strong quality signal
  const followerScore = input.numFollowers > 0
    ? Math.log10(input.numFollowers) * 50
    : 0;

  // Streaming duration bonus — rewards committed performers
  const streamingBonus = input.secondsOnline > 3600 ? 100
    : input.secondsOnline > 1800 ? 50
    : 0;

  return (
    (input.isOnline ? 1000 : 0) +
    viewerScore +
    followerScore +
    (input.upvotesDecayed * 3) +
    (input.avgViewers7d * 0.3) +
    (input.isNewModel ? 200 : 0) +
    (input.tagRelevance * 150) +
    (input.subjectRelevance * 50) +
    streamingBonus +
    input.manualBoost
  );
}

// ─── Manual boosts ───────────────────────────────────────────────────────────
// File: packages/content-engine/data/boosts.json
// Format: { "username": 500, "another_model": 300 }
// Positive = boost up, negative = push down

let _boostCache: Map<string, number> | null = null;

export function loadManualBoosts(): Map<string, number> {
  if (_boostCache) return _boostCache;
  const boostPath = join(__dirname, '..', '..', 'data', 'boosts.json');
  _boostCache = new Map();
  if (existsSync(boostPath)) {
    try {
      const data = JSON.parse(readFileSync(boostPath, 'utf-8'));
      for (const [username, boost] of Object.entries(data)) {
        if (typeof boost === 'number') {
          _boostCache.set(username.toLowerCase(), boost);
        }
      }
    } catch {
      // Invalid JSON — skip
    }
  }
  return _boostCache;
}

export function getManualBoost(username: string): number {
  return loadManualBoosts().get(username.toLowerCase()) || 0;
}

// Reset cache (for testing or after editing boosts.json)
export function clearBoostCache(): void {
  _boostCache = null;
}

// ─── Main ranking function ───────────────────────────────────────────────────

export function rankModelsForCategory(
  models: Array<{
    username: string;
    displayName: string;
    isOnline: boolean;
    currentViewers: number;
    votes: VoteRecord[];
    avgViewers7d: number;
    isNew: boolean;
    tags: string[];
    age: number | null;
    gender: string;
    imageUrl: string;
    screenshotPath: string | null;
    bioCached: string | null;
    country: string;
    numFollowers: number;
    roomSubject?: string;
    secondsOnline?: number;
  }>,
  categoryTags: string[],
  now: Date = new Date(),
): ScoredModel[] {
  return models
    .map(m => {
      const upvotesDecayed = computeDecayedUpvotes(m.votes, now);
      const tagRelevance = computeTagRelevance(m.tags, categoryTags);
      const subjectRelevance = computeSubjectRelevance(m.roomSubject || '', categoryTags);
      const manualBoost = getManualBoost(m.username);
      const score = computeScore({
        isOnline: m.isOnline,
        currentViewers: m.currentViewers,
        numFollowers: m.numFollowers,
        upvotesDecayed,
        avgViewers7d: m.avgViewers7d,
        isNewModel: m.isNew,
        tagRelevance,
        subjectRelevance,
        secondsOnline: m.secondsOnline || 0,
        manualBoost,
      });

      return {
        username: m.username,
        displayName: m.displayName,
        score,
        isOnline: m.isOnline,
        currentViewers: m.currentViewers,
        upvotes: m.votes.length,
        upvotesDecayed,
        avgViewers7d: m.avgViewers7d,
        isNew: m.isNew,
        tagRelevance,
        age: m.age,
        gender: m.gender,
        tags: m.tags,
        imageUrl: m.imageUrl,
        screenshotPath: m.screenshotPath,
        bioCached: m.bioCached,
        country: m.country,
        numFollowers: m.numFollowers,
        roomSubject: m.roomSubject || '',
        secondsOnline: m.secondsOnline || 0,
        manualBoost,
      };
    })
    .sort((a, b) => b.score - a.score);
}
