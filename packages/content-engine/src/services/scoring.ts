// Scoring engine for living listicle pages.
// Computes a composite score for each model to determine ranking on category pages.
// Formula from plan: score = (is_online * 1000) + (current_viewers * 0.5) + (upvotes_decayed * 3)
//                          + (avg_viewers_7d * 0.3) + (is_new_model * 200) + (tag_relevance * 100)

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
}

export interface VoteRecord {
  createdAt: Date;
}

// Decay function: older votes count less. Full value for today, ~0.3 after a week.
// weight = 1.0 / (1 + days_since_vote * 0.15)
export function computeVoteDecay(voteDate: Date, now: Date = new Date()): number {
  const daysSinceVote = (now.getTime() - voteDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceVote < 0) return 1.0; // future vote? full weight
  return 1.0 / (1 + daysSinceVote * 0.15);
}

// Compute decayed upvote total from individual vote timestamps.
export function computeDecayedUpvotes(votes: VoteRecord[], now: Date = new Date()): number {
  return votes.reduce((sum, v) => sum + computeVoteDecay(v.createdAt, now), 0);
}

// Compute tag relevance: how many of the model's tags match the category's target tags.
// Returns 0-1 (fraction of category tags matched).
export function computeTagRelevance(modelTags: string[], categoryTags: string[]): number {
  if (categoryTags.length === 0) return 0;
  const modelTagSet = new Set(modelTags.map(t => t.toLowerCase()));
  const matches = categoryTags.filter(ct => modelTagSet.has(ct.toLowerCase()));
  return matches.length / categoryTags.length;
}

export interface ScoreInput {
  isOnline: boolean;
  currentViewers: number;
  upvotesDecayed: number;
  avgViewers7d: number;
  isNewModel: boolean;
  tagRelevance: number; // 0-1
}

// Core scoring formula.
export function computeScore(input: ScoreInput): number {
  return (
    (input.isOnline ? 1000 : 0) +
    (input.currentViewers * 0.5) +
    (input.upvotesDecayed * 3) +
    (input.avgViewers7d * 0.3) +
    (input.isNewModel ? 200 : 0) +
    (input.tagRelevance * 100)
  );
}

// Score and rank a list of models for a category page.
// Returns models sorted by score descending.
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
  }>,
  categoryTags: string[],
  now: Date = new Date(),
): ScoredModel[] {
  return models
    .map(m => {
      const upvotesDecayed = computeDecayedUpvotes(m.votes, now);
      const tagRelevance = computeTagRelevance(m.tags, categoryTags);
      const score = computeScore({
        isOnline: m.isOnline,
        currentViewers: m.currentViewers,
        upvotesDecayed,
        avgViewers7d: m.avgViewers7d,
        isNewModel: m.isNew,
        tagRelevance,
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
      };
    })
    .sort((a, b) => b.score - a.score);
}
