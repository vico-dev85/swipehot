import { describe, it, expect } from "vitest";
import { selectPerformer } from "./pool-matcher";
import type { CachedPerformer } from "@xcamvip/shared";

function makePerformer(overrides: Partial<CachedPerformer> = {}): CachedPerformer {
  return {
    username: "test_user",
    display_name: "Test User",
    gender: "f",
    age: 25,
    num_users: 100,
    tags: ["tag1"],
    normalized_tags: ["tag1"],
    image_url: "https://example.com/img.jpg",
    iframe_embed: "https://example.com/embed",
    chat_room_url: "https://example.com/room",
    room_subject: "Test room",
    is_hd: true,
    seconds_online: 600,
    quality_score: 50,
    fetched_at: Date.now(),
    ...overrides,
  };
}

describe("selectPerformer", () => {
  it("returns null when all performers are seen", () => {
    const pool = [makePerformer({ username: "a" }), makePerformer({ username: "b" })];
    const result = selectPerformer({
      pool,
      seenUsernames: new Set(["a", "b"]),
      preferTags: [],
      alpha: 0,
    });
    expect(result).toBeNull();
  });

  it("returns an unseen performer", () => {
    const pool = [
      makePerformer({ username: "a" }),
      makePerformer({ username: "b" }),
    ];
    const result = selectPerformer({
      pool,
      seenUsernames: new Set(["a"]),
      preferTags: [],
      alpha: 0,
    });
    expect(result?.username).toBe("b");
  });

  it("selects a performer from pool when no tags preferred", () => {
    const pool = Array.from({ length: 20 }, (_, i) =>
      makePerformer({
        username: `user_${i}`,
        quality_score: 50 + i,
        normalized_tags: [`tag_${i}`],
      })
    );
    const result = selectPerformer({
      pool,
      seenUsernames: new Set(),
      preferTags: [],
      alpha: 0,
    });
    expect(result).not.toBeNull();
    expect(pool.some((p) => p.username === result!.username)).toBe(true);
  });

  it("favors performers with matching tags when alpha is high", () => {
    const preferred = makePerformer({
      username: "preferred",
      quality_score: 30, // lower popularity
      normalized_tags: ["latina", "bigboobs", "lovense"],
    });
    const popular = makePerformer({
      username: "popular",
      quality_score: 90, // higher popularity
      normalized_tags: ["feet", "hairy"],
    });

    // Run 100 times — with alpha=0.85, the preferred performer should win most of the time
    let preferredCount = 0;
    for (let i = 0; i < 100; i++) {
      const result = selectPerformer({
        pool: [preferred, popular],
        seenUsernames: new Set(),
        preferTags: ["latina", "bigboobs", "lovense"],
        alpha: 0.85,
      });
      if (result?.username === "preferred") preferredCount++;
    }

    // Should be selected significantly more than 50% of the time
    // (30% exploration + 70% scored where preferred dominates)
    expect(preferredCount).toBeGreaterThan(40);
  });

  it("uses pure popularity when alpha is 0", () => {
    // Use a larger pool so top-quartile selection is meaningful
    const pool = Array.from({ length: 20 }, (_, i) =>
      makePerformer({
        username: `user_${i}`,
        quality_score: i * 5, // 0 to 95
        normalized_tags: i < 5 ? ["latina"] : ["feet"],
      })
    );

    let topQuartileCount = 0;
    const topUsernames = new Set(["user_15", "user_16", "user_17", "user_18", "user_19"]);

    for (let i = 0; i < 100; i++) {
      const result = selectPerformer({
        pool,
        seenUsernames: new Set(),
        preferTags: ["latina"], // should not matter at alpha=0
        alpha: 0,
      });
      if (result && topUsernames.has(result.username)) topQuartileCount++;
    }

    // ~70% should come from scored path (top quartile), ~30% from exploration (random)
    // So top quartile should appear in at least 30% of results
    expect(topQuartileCount).toBeGreaterThan(25);
  });
});
