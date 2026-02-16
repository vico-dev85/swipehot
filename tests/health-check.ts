/**
 * Health Check Script
 *
 * Verifies API, Redis, pools, and embed URLs are working.
 * Usage: npx tsx tests/health-check.ts [base_url]
 */

const BASE_URL = process.argv[2] || "http://localhost:3001";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  ms: number;
}

async function check(name: string, fn: () => Promise<string>): Promise<CheckResult> {
  const start = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, detail, ms: Date.now() - start };
  } catch (err) {
    return { name, ok: false, detail: (err as Error).message, ms: Date.now() - start };
  }
}

async function run(): Promise<void> {
  console.log(`\nHealth check: ${BASE_URL}\n`);

  const results = await Promise.all([
    // 1. API health endpoint
    check("API /api/health", async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return `status=${data.status}, redis=${data.redis}`;
    }),

    // 2. Pool stats
    check("Pool /api/pool/stats", async () => {
      const res = await fetch(`${BASE_URL}/api/pool/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return `performers=${data.total_performers_cached}, viewers=${data.total_viewers}`;
    }),

    // 3. Pool next (with test session)
    check("Pool /api/pool/next", async () => {
      const sessionId = "healthcheck_" + Date.now().toString(16).padStart(24, "0");
      const res = await fetch(`${BASE_URL}/api/pool/next?session_id=${sessionId}&gender=all`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.username) throw new Error("No username in response");
      if (!data.embed_url) throw new Error("No embed_url in response");
      return `performer=${data.username}, viewers=${data.num_users}`;
    }),

    // 4. Config endpoint
    check("Config /api/config", async () => {
      const res = await fetch(`${BASE_URL}/api/config`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return `flags=${Object.keys(data.feature_flags || {}).length}`;
    }),

    // 5. Embed URL validity
    check("Embed URL format", async () => {
      const sessionId = "embedcheck_" + Date.now().toString(16).padStart(24, "0");
      const res = await fetch(`${BASE_URL}/api/pool/next?session_id=${sessionId}&gender=all`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const url = new URL(data.embed_url);
      const hasAffiliate = url.searchParams.has("campaign");
      const hasVideoOnly = url.searchParams.get("embed_video_only") === "1";
      if (!hasAffiliate) throw new Error("Missing affiliate params");
      if (!hasVideoOnly) throw new Error("Missing embed_video_only param");
      return `url=${url.hostname}${url.pathname}, affiliate=ok, video_only=ok`;
    }),
  ]);

  // Print results
  let allOk = true;
  for (const r of results) {
    const icon = r.ok ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${r.name} (${r.ms}ms)`);
    console.log(`         ${r.detail}`);
    if (!r.ok) allOk = false;
  }

  console.log(`\n${allOk ? "All checks passed." : "Some checks FAILED."}\n`);
  process.exit(allOk ? 0 : 1);
}

run();
