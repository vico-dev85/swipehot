import { describe, it, expect } from "vitest";
import { getCTAPhase, getCTAState } from "./cta-timing";

describe("getCTAPhase", () => {
  it("returns hidden for 0-29s", () => {
    expect(getCTAPhase(0)).toBe("hidden");
    expect(getCTAPhase(15)).toBe("hidden");
    expect(getCTAPhase(29)).toBe("hidden");
  });

  it("returns soft for 30-59s", () => {
    expect(getCTAPhase(30)).toBe("soft");
    expect(getCTAPhase(45)).toBe("soft");
    expect(getCTAPhase(59)).toBe("soft");
  });

  it("returns curiosity for 60-119s", () => {
    expect(getCTAPhase(60)).toBe("curiosity");
    expect(getCTAPhase(90)).toBe("curiosity");
    expect(getCTAPhase(119)).toBe("curiosity");
  });

  it("returns first for 120-179s", () => {
    expect(getCTAPhase(120)).toBe("first");
    expect(getCTAPhase(150)).toBe("first");
    expect(getCTAPhase(179)).toBe("first");
  });

  it("returns pressure for 180-299s", () => {
    expect(getCTAPhase(180)).toBe("pressure");
    expect(getCTAPhase(240)).toBe("pressure");
    expect(getCTAPhase(299)).toBe("pressure");
  });

  it("returns direct for 300s+", () => {
    expect(getCTAPhase(300)).toBe("direct");
    expect(getCTAPhase(600)).toBe("direct");
  });
});

describe("getCTAState", () => {
  it("hides CTA in hidden phase", () => {
    const state = getCTAState(10, "f", 500);
    expect(state.ctaVisible).toBe(false);
    expect(state.phase).toBe("hidden");
  });

  it("shows CTA in soft phase", () => {
    const state = getCTAState(40, "f", 500);
    expect(state.ctaVisible).toBe(true);
    expect(state.ctaSubtext).toBeNull();
  });

  it("uses correct gender pronouns", () => {
    expect(getCTAState(130, "f", 100).ctaText).toContain("Her");
    expect(getCTAState(130, "m", 100).ctaText).toContain("Him");
    expect(getCTAState(130, "c", 100).ctaText).toContain("Them");
    expect(getCTAState(130, "t", 100).ctaText).toContain("Her");
  });

  it("shows viewer count subtext in pressure phase", () => {
    const state = getCTAState(200, "f", 2341);
    expect(state.ctaSubtext).toContain("2,341");
  });

  it("shows direct CTA text after 5 minutes", () => {
    const state = getCTAState(310, "f", 500);
    expect(state.ctaText).toContain("Full Show");
    expect(state.ctaText).toContain("Free");
  });

  it("shows curiosity subtext only when viewer count > 100", () => {
    expect(getCTAState(90, "f", 50).ctaSubtext).toBeNull();
    expect(getCTAState(90, "f", 500).ctaSubtext).toContain("watching now");
  });
});
