/**
 * A/B Testing — Client-side variant assignment
 *
 * Assigns visitors to test variants on first visit, persists in localStorage.
 * Includes two-proportion Z-test significance calculator.
 * Based on Research 06: analytics-research.md
 */

const AB_STORAGE_KEY = "xcam_ab";

export interface ABTestDef {
  test_name: string;
  variants: string[]; // first is always control
  traffic_pct: number; // 0-100
}

/**
 * Get current A/B variant assignments for all active tests.
 * Assigns new variants for tests the visitor hasn't seen yet.
 */
export function getVariants(tests: ABTestDef[]): Record<string, string> {
  const stored = loadVariants();

  for (const test of tests) {
    if (stored[test.test_name]) continue; // already assigned

    // Traffic allocation — some users may not be in the test
    if (Math.random() * 100 > test.traffic_pct) continue;

    // Uniform random assignment across variants
    const idx = Math.floor(Math.random() * test.variants.length);
    stored[test.test_name] = test.variants[idx];
  }

  saveVariants(stored);
  return stored;
}

/**
 * Get a specific variant for a test. Returns null if not assigned.
 */
export function getVariant(testName: string): string | null {
  const stored = loadVariants();
  return stored[testName] ?? null;
}

function loadVariants(): Record<string, string> {
  try {
    const raw = localStorage.getItem(AB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveVariants(variants: Record<string, string>): void {
  try {
    localStorage.setItem(AB_STORAGE_KEY, JSON.stringify(variants));
  } catch { /* storage full — silent fail */ }
}

// --- Significance Calculator ---

export interface ABTestResult {
  controlRate: number;
  variantRate: number;
  relativeLift: number;
  zScore: number;
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
}

export function calculateSignificance(
  controlVisitors: number,
  controlConversions: number,
  variantVisitors: number,
  variantConversions: number,
  confidenceLevel = 0.95,
): ABTestResult {
  const p1 = controlConversions / controlVisitors;
  const p2 = variantConversions / variantVisitors;

  // Pooled proportion under null hypothesis
  const pPooled =
    (controlConversions + variantConversions) /
    (controlVisitors + variantVisitors);

  // Standard error
  const se = Math.sqrt(
    pPooled * (1 - pPooled) * (1 / controlVisitors + 1 / variantVisitors),
  );

  const z = se === 0 ? 0 : (p2 - p1) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  const alpha = 1 - confidenceLevel;

  return {
    controlRate: p1,
    variantRate: p2,
    relativeLift: p1 === 0 ? 0 : (p2 - p1) / p1,
    zScore: z,
    pValue,
    isSignificant: pValue < alpha,
    confidenceLevel,
  };
}

// Normal CDF approximation (Abramowitz & Stegun) — accurate to ~1.5e-7
function normalCDF(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * ax);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);

  return 0.5 * (1.0 + sign * y);
}

export function calculateSampleSize(
  baselineRate: number,
  minimumDetectableEffect: number, // relative, e.g. 0.20 for 20% lift
  confidence = 0.95,
  power = 0.80,
): number {
  const p1 = baselineRate;
  const p2 = baselineRate * (1 + minimumDetectableEffect);

  const zAlpha = getZScore(1 - (1 - confidence) / 2);
  const zBeta = getZScore(power);

  return Math.ceil(
    Math.pow(zAlpha + zBeta, 2) *
      (p1 * (1 - p1) + p2 * (1 - p2)) /
      Math.pow(p2 - p1, 2),
  );
}

function getZScore(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < 0.5) return -getZScore(1 - p);

  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  return (
    t -
    (c0 + c1 * t + c2 * t * t) /
      (1 + d1 * t + d2 * t * t + d3 * t * t * t)
  );
}
