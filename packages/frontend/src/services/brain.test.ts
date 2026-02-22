import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Fresh import per test — reset module state
let brain: typeof import("./brain");

beforeEach(async () => {
  localStorageMock.clear();
  // Re-import to reset module-level `state`
  vi.resetModules();
  brain = await import("./brain");
});

describe("gender weights", () => {
  it("returns null before MIN_GENDER_SAMPLES (5) views", () => {
    // 4 views — not enough
    for (let i = 0; i < 4; i++) {
      brain.updatePreferences(["latina"], "skip", 1, "f");
    }
    expect(brain.getGenderWeights()).toBeNull();
  });

  it("returns weights after enough samples", () => {
    // 5 views of females, all engaged
    for (let i = 0; i < 5; i++) {
      brain.updatePreferences(["latina"], "skip", 30, "f");
    }
    const w = brain.getGenderWeights();
    expect(w).not.toBeNull();
    expect(w!.f).toBeGreaterThan(0);
  });

  it("heavily favors engaged gender over insta-skipped gender", () => {
    // 5 female views — engaged (watched 30s+)
    for (let i = 0; i < 5; i++) {
      brain.updatePreferences(["latina"], "skip", 30, "f");
    }
    // 5 male views — insta-skipped (<3s)
    for (let i = 0; i < 5; i++) {
      brain.updatePreferences(["muscle"], "skip", 1, "m");
    }
    const w = brain.getGenderWeights()!;
    expect(w.f).toBeGreaterThan(w.m);
    // Female should be dominant
    expect(w.f).toBeGreaterThan(0.5);
    // Male should be near floor but not zero
    expect(w.m).toBeGreaterThanOrEqual(0.05);
    expect(w.m).toBeLessThan(0.15);
  });

  it("gives floor weight to never-seen genders (not zero)", () => {
    // Only interact with females
    for (let i = 0; i < 6; i++) {
      brain.updatePreferences(["latina"], "like", 20, "f");
    }
    const w = brain.getGenderWeights()!;
    // Trans and couples never seen — should get floor-ish weight via neutral 0.5
    expect(w.t).toBeGreaterThan(0);
    expect(w.c).toBeGreaterThan(0);
  });

  it("weights sum to approximately 1", () => {
    for (let i = 0; i < 5; i++) {
      brain.updatePreferences(["latina"], "skip", 25, "f");
    }
    for (let i = 0; i < 3; i++) {
      brain.updatePreferences(["muscle"], "skip", 1, "m");
    }
    const w = brain.getGenderWeights()!;
    const sum = w.f + w.m + w.t + w.c;
    expect(sum).toBeCloseTo(1, 1);
  });

  it("CTA click counts as strong engagement signal", () => {
    // 3 female CTA clicks
    for (let i = 0; i < 3; i++) {
      brain.updatePreferences(["latina"], "cta", 5, "f");
    }
    // 3 male skips
    for (let i = 0; i < 3; i++) {
      brain.updatePreferences(["muscle"], "skip", 1, "m");
    }
    const w = brain.getGenderWeights()!;
    expect(w.f).toBeGreaterThan(w.m);
  });

  it("likes count as engagement", () => {
    // 3 female likes (even with short watch time)
    for (let i = 0; i < 3; i++) {
      brain.updatePreferences(["asian"], "like", 4, "f");
    }
    // 3 male quick skips
    for (let i = 0; i < 3; i++) {
      brain.updatePreferences(["muscle"], "skip", 2, "m");
    }
    const w = brain.getGenderWeights()!;
    expect(w.f).toBeGreaterThan(w.m);
  });

  it("survives localStorage round-trip", () => {
    for (let i = 0; i < 6; i++) {
      brain.updatePreferences(["latina"], "skip", 30, "f");
    }
    // Re-import to simulate page reload
    vi.resetModules();
    return import("./brain").then((fresh) => {
      const w = fresh.getGenderWeights();
      expect(w).not.toBeNull();
      expect(w!.f).toBeGreaterThan(0);
    });
  });

  it("migrates old brain state without genderStats", () => {
    // Simulate old format in localStorage
    const oldState = {
      preferences: { latina: 2.5 },
      totalSwipes: 10,
      lastUpdated: Date.now(),
      recentWatchTimes: [5, 10, 15],
      hasShownFirstLikeFeedback: false,
      // no genderStats field
    };
    store["xcam_brain"] = JSON.stringify(oldState);

    vi.resetModules();
    return import("./brain").then((fresh) => {
      // Should not crash, weights null (no gender data yet)
      expect(fresh.getGenderWeights()).toBeNull();
      // Should still work for new interactions
      fresh.updatePreferences(["latina"], "skip", 30, "f");
      expect(fresh.getTotalSwipes()).toBe(11);
    });
  });
});
