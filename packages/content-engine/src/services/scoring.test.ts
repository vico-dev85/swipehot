import { describe, it, expect } from 'vitest';
import {
  computeVoteDecay,
  computeDecayedUpvotes,
  computeTagRelevance,
  computeScore,
  rankModelsForCategory,
} from './scoring.js';

describe('computeVoteDecay', () => {
  const now = new Date('2026-02-19T12:00:00Z');

  it('returns 1.0 for a vote cast right now', () => {
    expect(computeVoteDecay(now, now)).toBe(1.0);
  });

  it('decays over time', () => {
    const oneDayAgo = new Date('2026-02-18T12:00:00Z');
    const weight = computeVoteDecay(oneDayAgo, now);
    // 1 / (1 + 1 * 0.15) = 1 / 1.15 ≈ 0.8696
    expect(weight).toBeCloseTo(0.8696, 3);
  });

  it('decays significantly after a week', () => {
    const sevenDaysAgo = new Date('2026-02-12T12:00:00Z');
    const weight = computeVoteDecay(sevenDaysAgo, now);
    // 1 / (1 + 7 * 0.15) = 1 / 2.05 ≈ 0.4878
    expect(weight).toBeCloseTo(0.4878, 3);
  });

  it('returns ~0.25 after 20 days', () => {
    const twentyDaysAgo = new Date('2026-01-30T12:00:00Z');
    const weight = computeVoteDecay(twentyDaysAgo, now);
    // 1 / (1 + 20 * 0.15) = 1 / 4 = 0.25
    expect(weight).toBeCloseTo(0.25, 3);
  });
});

describe('computeDecayedUpvotes', () => {
  const now = new Date('2026-02-19T12:00:00Z');

  it('returns 0 for no votes', () => {
    expect(computeDecayedUpvotes([], now)).toBe(0);
  });

  it('sums decayed vote weights', () => {
    const votes = [
      { createdAt: now },
      { createdAt: new Date('2026-02-18T12:00:00Z') }, // 1 day ago
      { createdAt: new Date('2026-02-12T12:00:00Z') }, // 7 days ago
    ];
    const total = computeDecayedUpvotes(votes, now);
    // 1.0 + 0.8696 + 0.4878 ≈ 2.3574
    expect(total).toBeCloseTo(2.3574, 2);
  });
});

describe('computeTagRelevance', () => {
  it('returns 0 for empty category tags', () => {
    expect(computeTagRelevance(['asian', 'teen'], [])).toBe(0);
  });

  it('returns 1.0 for full match', () => {
    expect(computeTagRelevance(['asian', 'teen', 'lovense'], ['asian', 'teen'])).toBe(1.0);
  });

  it('returns partial match correctly', () => {
    expect(computeTagRelevance(['asian', 'squirt'], ['asian', 'japanese', 'korean'])).toBeCloseTo(1 / 3, 3);
  });

  it('is case insensitive', () => {
    expect(computeTagRelevance(['Asian', 'TEEN'], ['asian', 'teen'])).toBe(1.0);
  });
});

describe('computeScore', () => {
  it('online model with viewers scores higher than offline', () => {
    const online = computeScore({
      isOnline: true, currentViewers: 500, upvotesDecayed: 5,
      avgViewers7d: 300, isNewModel: false, tagRelevance: 1.0,
    });
    const offline = computeScore({
      isOnline: false, currentViewers: 0, upvotesDecayed: 5,
      avgViewers7d: 300, isNewModel: false, tagRelevance: 1.0,
    });
    expect(online).toBeGreaterThan(offline);
    // Online bonus is 1000, plus 500*0.5=250 from viewers
    expect(online - offline).toBeCloseTo(1000 + 250, 0);
  });

  it('new model gets +200 bonus', () => {
    const newModel = computeScore({
      isOnline: true, currentViewers: 100, upvotesDecayed: 0,
      avgViewers7d: 0, isNewModel: true, tagRelevance: 0.5,
    });
    const oldModel = computeScore({
      isOnline: true, currentViewers: 100, upvotesDecayed: 0,
      avgViewers7d: 0, isNewModel: false, tagRelevance: 0.5,
    });
    expect(newModel - oldModel).toBe(200);
  });

  it('upvotes contribute meaningfully', () => {
    const withVotes = computeScore({
      isOnline: false, currentViewers: 0, upvotesDecayed: 10,
      avgViewers7d: 100, isNewModel: false, tagRelevance: 0.5,
    });
    const noVotes = computeScore({
      isOnline: false, currentViewers: 0, upvotesDecayed: 0,
      avgViewers7d: 100, isNewModel: false, tagRelevance: 0.5,
    });
    // 10 * 3 = 30 points from votes
    expect(withVotes - noVotes).toBe(30);
  });
});

describe('rankModelsForCategory', () => {
  const now = new Date('2026-02-19T12:00:00Z');

  const makeModel = (overrides: Partial<Parameters<typeof rankModelsForCategory>[0][0]>) => ({
    username: 'test_model',
    displayName: 'Test Model',
    isOnline: false,
    currentViewers: 0,
    votes: [] as { createdAt: Date }[],
    avgViewers7d: 0,
    isNew: false,
    tags: [],
    age: 25,
    gender: 'f',
    imageUrl: 'https://example.com/img.jpg',
    screenshotPath: null,
    bioCached: null,
    country: 'US',
    numFollowers: 100,
    ...overrides,
  });

  it('ranks online models above offline', () => {
    const models = [
      makeModel({ username: 'offline', isOnline: false, currentViewers: 0 }),
      makeModel({ username: 'online', isOnline: true, currentViewers: 200, tags: ['asian'] }),
    ];
    const ranked = rankModelsForCategory(models, ['asian'], now);
    expect(ranked[0].username).toBe('online');
    expect(ranked[1].username).toBe('offline');
  });

  it('ranks by viewer count among online models', () => {
    const models = [
      makeModel({ username: 'low', isOnline: true, currentViewers: 50, tags: ['asian'] }),
      makeModel({ username: 'high', isOnline: true, currentViewers: 500, tags: ['asian'] }),
    ];
    const ranked = rankModelsForCategory(models, ['asian'], now);
    expect(ranked[0].username).toBe('high');
  });

  it('tag relevance boosts score', () => {
    const models = [
      makeModel({ username: 'relevant', tags: ['asian', 'japanese'], avgViewers7d: 100 }),
      makeModel({ username: 'irrelevant', tags: ['latina', 'bbw'], avgViewers7d: 100 }),
    ];
    const ranked = rankModelsForCategory(models, ['asian', 'japanese', 'korean'], now);
    expect(ranked[0].username).toBe('relevant');
  });
});
