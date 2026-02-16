/**
 * CTA Timing Engine
 *
 * Surface conversion prompts at peak engagement, not on arbitrary timers.
 * Based on CLAUDE.md CTA Timing Framework:
 *   0-30s:  nothing (build value first)
 *   30-60s: soft signals (viewer count, LIVE badge)
 *   1-2m:   curiosity builders
 *   2-3m:   first CTA: "Watch Her Live →"
 *   3-5m:   social pressure
 *   5+m:    direct CTA
 */

export type CTAPhase =
  | "hidden"     // 0-30s: no CTA shown
  | "soft"       // 30-60s: viewer count visible, CTA muted
  | "curiosity"  // 1-2m: curiosity text
  | "first"      // 2-3m: standard CTA
  | "pressure"   // 3-5m: social pressure CTA
  | "direct";    // 5+m: urgent CTA

export interface CTAState {
  phase: CTAPhase;
  ctaVisible: boolean;
  ctaText: string;
  ctaSubtext: string | null;
}

/**
 * Get CTA phase based on cumulative session watch time (seconds).
 */
export function getCTAPhase(sessionSeconds: number): CTAPhase {
  if (sessionSeconds < 30) return "hidden";
  if (sessionSeconds < 60) return "soft";
  if (sessionSeconds < 120) return "curiosity";
  if (sessionSeconds < 180) return "first";
  if (sessionSeconds < 300) return "pressure";
  return "direct";
}

/**
 * Get full CTA state including dynamic copy.
 * @param sessionSeconds - total seconds spent in the roulette this session
 * @param gender - current performer's gender code
 * @param viewerCount - current performer's viewer count
 */
export function getCTAState(
  sessionSeconds: number,
  gender: "f" | "m" | "t" | "c",
  viewerCount: number
): CTAState {
  const phase = getCTAPhase(sessionSeconds);
  const pronoun = gender === "c" ? "Them" : gender === "m" ? "Him" : "Her";

  switch (phase) {
    case "hidden":
      return {
        phase,
        ctaVisible: false,
        ctaText: `Watch ${pronoun} Live`,
        ctaSubtext: null,
      };

    case "soft":
      return {
        phase,
        ctaVisible: true,
        ctaText: `Watch ${pronoun} Live`,
        ctaSubtext: null,
      };

    case "curiosity":
      return {
        phase,
        ctaVisible: true,
        ctaText: `Watch ${pronoun} Live`,
        ctaSubtext: viewerCount > 100 ? `${viewerCount.toLocaleString()} watching now` : null,
      };

    case "first":
      return {
        phase,
        ctaVisible: true,
        ctaText: `Watch ${pronoun} Live →`,
        ctaSubtext: null,
      };

    case "pressure":
      return {
        phase,
        ctaVisible: true,
        ctaText: `Watch ${pronoun} Live →`,
        ctaSubtext: `${viewerCount.toLocaleString()} viewers right now`,
      };

    case "direct":
      return {
        phase,
        ctaVisible: true,
        ctaText: `See ${pronoun === "Them" ? "Their" : pronoun === "Him" ? "His" : "Her"} Full Show — Free`,
        ctaSubtext: null,
      };
  }
}
