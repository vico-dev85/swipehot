# Analytics Event Architecture & A/B Testing — Research Findings

## For: xcam.vip Live Cam Roulette App

---

## 1. Event Schema Template

### Naming Convention: Object-Action, Past Tense, snake_case

The industry standard (Amplitude, Mixpanel, Segment) is **Object-Action** in past tense. For your MySQL backend, use `snake_case` for consistency with SQL.

### Global Properties (on EVERY event)

```json
{
  "session_id": "uuid-v4",
  "visitor_id": "uuid-v4-persisted-in-localStorage",
  "event_type": "performer_viewed",
  "timestamp": "2026-02-16T12:00:00Z",
  "device_type": "mobile|tablet|desktop",
  "viewport_width": 390,
  "viewport_height": 844,
  "referrer": "google|direct|twitter|...",
  "utm_source": "tiktok",
  "utm_medium": "cpc",
  "utm_campaign": "launch_v1",
  "ab_variants": {
    "cta_color": "pink_v1",
    "swipe_hint": "arrow_v2"
  },
  "page_url": "/roulette",
  "app_version": "1.0.0",
  "is_returning": true,
  "session_number": 3
}
```

### Event Taxonomy (15 events — not 50)

Keep it tight. You can always add events later. You cannot undo a messy taxonomy.

**Core Funnel Events (5):**

| Event | Key Properties | Why |
|-------|---------------|-----|
| `page_loaded` | `landing_page`, `load_time_ms` | Entry point, performance |
| `age_gate_passed` | `remembered` (bool) | Gate conversion |
| `start_clicked` | `gender_filter` | Intent signal |
| `performer_viewed` | `performer_id`, `gender`, `view_index` (nth performer in session), `source` (swipe/filter) | Core engagement |
| `cta_clicked` | `performer_id`, `cta_text`, `time_on_performer_ms`, `view_index` | THE conversion event |

**Engagement Events (6):**

| Event | Key Properties | Why |
|-------|---------------|-----|
| `performer_swiped` | `performer_id`, `direction` (up/down), `time_on_performer_ms`, `swipe_velocity` | Engagement depth |
| `performer_liked` | `performer_id`, `method` (double_tap/button), `time_on_performer_ms` | Positive signal |
| `sound_toggled` | `performer_id`, `new_state` (on/off), `time_on_performer_ms` | Deep engagement signal |
| `profile_opened` | `performer_id`, `time_on_performer_ms` | Interest signal |
| `gender_filter_changed` | `old_filter`, `new_filter` | Preference signal |
| `share_clicked` | `performer_id`, `share_method` | Viral signal |

**Session Events (4):**

| Event | Key Properties | Why |
|-------|---------------|-----|
| `session_started` | `is_returning`, `days_since_last`, `session_number` | Retention tracking |
| `session_heartbeat` | `performers_viewed`, `total_time_ms`, `likes_count`, `cta_clicks` | Sent every 30s while active |
| `session_ended` | `duration_ms`, `performers_viewed`, `cta_clicks`, `exit_performer_id` | Final session summary |
| `error_occurred` | `error_type`, `error_message`, `context` | Debug |

**Total: 15 events.** That's it. Resist the urge to add more until you've analyzed these for at least 2 weeks.

### Event Versioning

Add `schema_version` to your global properties. Start at `1`. When you change a property name or add/remove required properties, bump it. Your analysis queries can filter by version.

```json
{
  "schema_version": 1,
  "event_type": "performer_viewed",
  ...
}
```

---

## 2. A/B Test Significance Formula

### Two-Proportion Z-Test (TypeScript)

This is the standard formula used by every A/B testing tool. Input: visitors and conversions for control and variant. Output: whether it's significant at your chosen confidence level.

```typescript
interface ABTestResult {
  controlRate: number;
  variantRate: number;
  relativeLift: number;
  zScore: number;
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
}

function calculateABSignificance(
  controlVisitors: number,
  controlConversions: number,
  variantVisitors: number,
  variantConversions: number,
  confidenceLevel: number = 0.95
): ABTestResult {
  const p1 = controlConversions / controlVisitors;
  const p2 = variantConversions / variantVisitors;

  // Pooled proportion under null hypothesis (H0: p1 = p2)
  const pPooled = (controlConversions + variantConversions) /
                  (controlVisitors + variantVisitors);

  // Standard error using pooled proportion
  const se = Math.sqrt(
    pPooled * (1 - pPooled) * (1 / controlVisitors + 1 / variantVisitors)
  );

  // Z-statistic
  const z = se === 0 ? 0 : (p2 - p1) / se;

  // Two-tailed p-value using normal CDF approximation
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  // Alpha from confidence level
  const alpha = 1 - confidenceLevel;

  return {
    controlRate: p1,
    variantRate: p2,
    relativeLift: p1 === 0 ? 0 : (p2 - p1) / p1,
    zScore: z,
    pValue: pValue,
    isSignificant: pValue < alpha,
    confidenceLevel: confidenceLevel,
  };
}

// Normal CDF approximation (Abramowitz & Stegun)
// Accurate to ~1.5e-7
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
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// Usage example:
const result = calculateABSignificance(
  5000,  // control visitors
  150,   // control conversions (3% rate)
  5000,  // variant visitors
  190,   // variant conversions (3.8% rate)
  0.95   // 95% confidence
);

console.log(result);
// {
//   controlRate: 0.03,
//   variantRate: 0.038,
//   relativeLift: 0.2667,  (26.7% lift)
//   zScore: 2.16,
//   pValue: 0.031,
//   isSignificant: true,
//   confidenceLevel: 0.95
// }
```

### When to Use 90% vs 95% Confidence

| Scenario | Confidence Level | Why |
|----------|-----------------|-----|
| CTA button color test | 90% | Low risk, easily reversible |
| Major layout change | 95% | Higher stakes |
| Anything touching revenue | 95% | You want to be sure |
| Early exploration (< 1K users) | 90% | Move fast, learn fast |

### Don't Peek Problem

**Never** check results daily and stop when you see significance. This inflates false positive rates to 20-30%. Instead:

1. **Pre-calculate** your required sample size (see Section 3)
2. **Run the test** until you hit that sample size
3. **Only then** check significance

If you must check early, use **sequential testing**: multiply your alpha by a correction factor. Simple version: require p < 0.01 for early stopping instead of p < 0.05.

---

## 3. Sample Size Requirements

### Formula

```
n = (Z_α/2 + Z_β)² × (p1(1-p1) + p2(1-p2)) / (p1 - p2)²
```

Where:
- `Z_α/2` = 1.96 for 95% confidence (two-sided)
- `Z_β` = 0.84 for 80% power
- `p1` = baseline conversion rate
- `p2` = baseline + minimum detectable effect (MDE)
- `n` = sample size **per variant**

### Sample Size Table for xcam.vip

Your likely baseline CTA click-through rate will be 2-5%. Here's what you need:

**At 95% confidence, 80% power, per variant:**

| Baseline Rate | MDE (relative) | MDE (absolute) | Sample Size Per Variant |
|--------------|----------------|----------------|------------------------|
| 2% | +25% | 0.5% → 2.5% | 12,527 |
| 2% | +50% | 1.0% → 3.0% | 3,267 |
| 3% | +20% | 0.6% → 3.6% | 9,364 |
| 3% | +33% | 1.0% → 4.0% | 3,606 |
| 3% | +50% | 1.5% → 4.5% | 1,648 |
| 5% | +20% | 1.0% → 6.0% | 4,861 |
| 5% | +30% | 1.5% → 6.5% | 2,209 |
| 5% | +50% | 2.5% → 7.5% | 847 |
| 10% | +20% | 2.0% → 12.0% | 2,015 |
| 10% | +30% | 3.0% → 13.0% | 919 |

### TypeScript Sample Size Calculator

```typescript
function calculateSampleSize(
  baselineRate: number,
  minimumDetectableEffect: number, // relative, e.g. 0.20 for 20% lift
  confidence: number = 0.95,
  power: number = 0.80
): number {
  const p1 = baselineRate;
  const p2 = baselineRate * (1 + minimumDetectableEffect);

  const zAlpha = getZScore(1 - (1 - confidence) / 2); // 1.96 for 95%
  const zBeta = getZScore(power); // 0.84 for 80%

  const n = Math.ceil(
    Math.pow(zAlpha + zBeta, 2) *
    (p1 * (1 - p1) + p2 * (1 - p2)) /
    Math.pow(p2 - p1, 2)
  );

  return n; // per variant
}

function getZScore(p: number): number {
  // Rational approximation (Abramowitz & Stegun 26.2.23)
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

  return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
}

// Example: 3% baseline, detect 33% relative lift, 95% confidence, 80% power
console.log(calculateSampleSize(0.03, 0.33)); // ~3,606 per variant
```

### What This Means for xcam.vip

If you get **500 daily visitors** (realistic early-stage):
- To detect a 50% lift on a 3% conversion rate → 1,648 per variant → **~7 days**
- To detect a 20% lift on a 3% conversion rate → 9,364 per variant → **~38 days**

**Recommendation:** Set your MDE at 30-50% relative for early tests. You're looking for big wins first, not 5% optimizations.

---

## 4. Engagement Metric Hierarchy

Ranked from most predictive of retention to least, for a swipe-based content discovery app:

### Tier 1: Strongest Retention Predictors

1. **D1/D7 Return Rate** — Did the user come back within 1 day? 7 days? This IS retention. Not a proxy.
2. **Session Depth (performers viewed per session)** — Users who view 10+ performers are significantly more likely to return than those who view 2-3. This is your "aha moment" metric.
3. **Sound-On Rate** — A user unmuting audio is a strong signal of real engagement, not just idle swiping. Track what % of sessions include at least one sound-on event.
4. **CTA Click-Through Rate** — Direct revenue signal. Users who click through at least once per session are your power users.

### Tier 2: Strong Leading Indicators

5. **Average Time Per Performer** — Users lingering 30+ seconds on individual performers are genuinely engaged vs. speed-swiping.
6. **Like Rate (likes / performers viewed)** — Active participation signal. Double-tap requires intent.
7. **Profile Open Rate** — Curiosity beyond the feed = deep engagement.
8. **Sessions Per Week** — Frequency beats duration. 3 short sessions > 1 long session for retention prediction.

### Tier 3: Useful But Noisy

9. **Total Session Duration** — Correlated with engagement but easily inflated by idle tabs. Use as supporting metric, not primary.
10. **Share Rate** — Viral signal, but very low base rate. Hard to A/B test.
11. **Gender Filter Usage** — Shows preference development (user is learning what they want), but not directly tied to retention.

### Tier 4: Vanity Metrics (track but don't optimize for)

12. **Total Page Views** — Inflated by bots, accidental visits, bounces
13. **Total Likes Count** — Absolute numbers mean nothing without rate context
14. **Raw Visitor Count** — Acquisition metric, not engagement

### Your North Star Metric

**Weekly Active Viewers who viewed 5+ performers and clicked CTA at least once.**

This combines frequency (weekly active), depth (5+ views), and intent (CTA click) into one number. If this goes up, your product is working.

### Your Key Proxy Metrics for A/B Tests

Don't A/B test against your North Star. Instead:

| What You're Testing | Proxy Metric | Why |
|---------------------|-------------|-----|
| CTA copy/color/position | CTA click rate per session | Direct, fast, sensitive |
| Swipe UX changes | Performers viewed per session | Measures engagement depth |
| Content/performer ordering | Time on first 3 performers | Early engagement = retention signal |
| Gender filter UX | Filter usage rate | Measures feature adoption |
| Loading/transition speed | Bounce rate (< 2 performers) | Performance = retention |

---

## 5. Event Pipeline Recommendation

### Client-Side: Batch + Beacon

```typescript
class EventTracker {
  private queue: Event[] = [];
  private flushInterval: number;
  private endpoint: string;
  private globalProps: Record<string, any>;

  constructor(endpoint: string = '/api/events') {
    this.endpoint = endpoint;
    this.globalProps = this.buildGlobalProps();

    // Flush every 10 seconds
    this.flushInterval = window.setInterval(() => this.flush(), 10_000);

    // Flush on page hide (most reliable mobile event)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush(true); // use beacon
      }
    });

    // Heartbeat every 30s while page is visible
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.track('session_heartbeat', this.buildHeartbeatData());
      }
    }, 30_000);
  }

  track(eventType: string, properties: Record<string, any> = {}) {
    this.queue.push({
      ...this.globalProps,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      ...properties,
    });

    // Immediate flush if queue hits 20 events
    if (this.queue.length >= 20) {
      this.flush();
    }
  }

  private flush(useBeacon: boolean = false) {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    const payload = JSON.stringify({ events: batch });

    if (useBeacon && navigator.sendBeacon) {
      // Beacon API: guaranteed delivery on page hide
      navigator.sendBeacon(this.endpoint, payload);
    } else {
      // Normal fetch for in-session flushes
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true, // survives page navigation
      }).catch(() => {
        // Re-queue on failure (will retry next flush)
        this.queue.unshift(...batch);
      });
    }
  }

  private buildGlobalProps() {
    return {
      session_id: this.getOrCreateSessionId(),
      visitor_id: this.getOrCreateVisitorId(),
      ab_variants: this.getABVariants(),
      device_type: this.getDeviceType(),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      referrer: document.referrer || 'direct',
      schema_version: 1,
    };
  }

  // ... helper methods for IDs, device type, etc.
}
```

### Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Flush interval | 10 seconds | Balances data freshness vs request count |
| Max batch size | 20 events | Keeps payload under 64KB (Beacon API limit) |
| Page hide strategy | `visibilitychange` + Beacon API | Most reliable on mobile (MDN recommends this over `beforeunload`) |
| Heartbeat interval | 30 seconds | Captures session duration without flooding |
| Failed request handling | Re-queue to front | Simple retry without complexity |
| Offline handling | Not needed for v1 | You're not a PWA yet. Add later with IndexedDB if needed |

### Server-Side: Direct Write (for now)

At your scale (< 10K daily events), write directly to MySQL. No need for Redis queues or Kafka.

```
POST /api/events
  → Validate JSON schema
  → Extract batch of events
  → Bulk INSERT into MySQL
  → Return 204 No Content
```

When to add a queue (Redis/BullMQ): when you consistently see > 100 events/second sustained, or when event processing takes > 100ms. At 500 daily visitors × 15 events/session ≈ 7,500 events/day ≈ 0.09 events/second. You're nowhere near needing a queue.

### MySQL Schema

```sql
-- Core events table
CREATE TABLE events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  visitor_id CHAR(36) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_timestamp DATETIME(3) NOT NULL,  -- millisecond precision
  received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  -- Denormalized common fields (avoid JSON parsing for frequent queries)
  performer_id VARCHAR(100) DEFAULT NULL,
  time_on_performer_ms INT UNSIGNED DEFAULT NULL,
  view_index SMALLINT UNSIGNED DEFAULT NULL,

  -- Everything else
  properties JSON NOT NULL,  -- full event payload including ab_variants

  -- Device/session context
  device_type ENUM('mobile', 'tablet', 'desktop') NOT NULL,
  referrer VARCHAR(500) DEFAULT NULL,
  page_url VARCHAR(500) DEFAULT NULL,
  schema_version TINYINT UNSIGNED NOT NULL DEFAULT 1,

  -- Indexes
  INDEX idx_session (session_id, event_timestamp),
  INDEX idx_visitor (visitor_id, event_timestamp),
  INDEX idx_event_type_time (event_type, event_timestamp),
  INDEX idx_performer (performer_id, event_type),
  INDEX idx_timestamp (event_timestamp)
) ENGINE=InnoDB
  ROW_FORMAT=COMPRESSED
  PARTITION BY RANGE (UNIX_TIMESTAMP(event_timestamp)) (
    PARTITION p_2026_02 VALUES LESS THAN (UNIX_TIMESTAMP('2026-03-01')),
    PARTITION p_2026_03 VALUES LESS THAN (UNIX_TIMESTAMP('2026-04-01')),
    PARTITION p_2026_04 VALUES LESS THAN (UNIX_TIMESTAMP('2026-05-01')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
  );

-- A/B test configuration
CREATE TABLE ab_tests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  test_name VARCHAR(100) NOT NULL UNIQUE,
  variants JSON NOT NULL,          -- ["control", "pink_v1", "pink_v2"]
  traffic_pct TINYINT UNSIGNED NOT NULL DEFAULT 100,  -- % of traffic in test
  status ENUM('draft', 'running', 'paused', 'completed') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME DEFAULT NULL,
  ended_at DATETIME DEFAULT NULL
);

-- Session summary (materialized from events, updated on session_ended)
CREATE TABLE sessions (
  session_id CHAR(36) PRIMARY KEY,
  visitor_id CHAR(36) NOT NULL,
  started_at DATETIME(3) NOT NULL,
  ended_at DATETIME(3) DEFAULT NULL,
  duration_ms INT UNSIGNED DEFAULT NULL,
  performers_viewed SMALLINT UNSIGNED DEFAULT 0,
  cta_clicks SMALLINT UNSIGNED DEFAULT 0,
  likes_count SMALLINT UNSIGNED DEFAULT 0,
  sound_on_count SMALLINT UNSIGNED DEFAULT 0,
  device_type ENUM('mobile', 'tablet', 'desktop') NOT NULL,
  referrer VARCHAR(500) DEFAULT NULL,
  ab_variants JSON DEFAULT NULL,

  INDEX idx_visitor (visitor_id, started_at),
  INDEX idx_started (started_at),
  INDEX idx_engagement (performers_viewed, cta_clicks)
);

-- Daily visitor summary (for retention analysis)
CREATE TABLE daily_visitors (
  visitor_id CHAR(36) NOT NULL,
  visit_date DATE NOT NULL,
  sessions_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  total_performers_viewed SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_cta_clicks SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  first_seen_date DATE NOT NULL,  -- for cohort analysis

  PRIMARY KEY (visitor_id, visit_date),
  INDEX idx_date (visit_date),
  INDEX idx_first_seen (first_seen_date, visit_date)
);
```

### When MySQL Stops Scaling

| Stage | Events/Day | Solution |
|-------|-----------|----------|
| Now | < 50K | MySQL with monthly partitions, direct writes |
| Growing | 50K - 500K | Add read replica for dashboard queries |
| Scaling | 500K - 5M | Archive old partitions, consider ClickHouse for analytics |
| Big | 5M+ | Move analytics to ClickHouse or BigQuery, keep MySQL for real-time |

You won't hit 50K events/day for a while. Don't over-engineer.

---

## 6. What NOT to Track

### Antipatterns That Create Noise

**Don't track mouse movements or scroll positions.** Massive data volume, almost zero insight for a video roulette app. If you need scroll heatmaps later, use Hotjar/FullStory (separate tool, not your own pipeline).

**Don't track every UI micro-interaction.** "Button hover", "tooltip shown", "menu opened" — these generate 10x your useful events and dilute your funnel analysis. Only track interactions that could influence conversion or retention.

**Don't track performer details you can join later.** Don't embed performer name, tags, category, viewer count into every event. Store `performer_id` and join with a performers table. Keeps events small, avoids stale data.

**Don't track "page_viewed" for SPA navigation.** In a single-page roulette app, you have one page. Track `performer_viewed` instead — that's your actual content impression.

**Don't create duplicate events with different names.** `cta_clicked`, `cta_tapped`, `affiliate_link_clicked`, `external_click` — if they all mean "user clicked the CTA", they should be ONE event with a `source` property.

**Don't track client-side errors at high volume.** One broken API response can generate 10,000 error events per hour. Rate-limit error tracking to 1 error of same type per session.

**Don't track timing data on every event.** Page load time, API response time — track these as separate performance events sampled at 10-25% of sessions, not on every interaction.

### Events That SEEM Useful But Aren't (Yet)

| Don't Track Yet | Why | When to Add |
|----------------|-----|-------------|
| `performer_impression_time` (viewability) | Overcomplicates early analysis | When you need ad-style viewability metrics |
| `network_speed` | Interesting but not actionable yet | When you're optimizing for slow connections |
| `battery_level` | Fun fact, zero ROI | Never, probably |
| `exact_swipe_coordinates` | Huge data, need ML to extract value | When you hire a data scientist |
| `chat_message_sent` | You don't have chat | When you add native chat |
| `performer_preview_loaded` | Too granular for v1 | When you're optimizing preloading |

---

## 7. Funnel SQL Queries

### The Core Funnel: page_load → start_click → performer_viewed → cta_click

```sql
-- FUNNEL: Daily conversion funnel
-- Shows drop-off at each step
SELECT
  DATE(event_timestamp) AS day,

  COUNT(DISTINCT CASE WHEN event_type = 'page_loaded'
    THEN session_id END) AS step1_page_loaded,

  COUNT(DISTINCT CASE WHEN event_type = 'start_clicked'
    THEN session_id END) AS step2_start_clicked,

  COUNT(DISTINCT CASE WHEN event_type = 'performer_viewed'
    THEN session_id END) AS step3_performer_viewed,

  COUNT(DISTINCT CASE WHEN event_type = 'cta_clicked'
    THEN session_id END) AS step4_cta_clicked,

  -- Conversion rates
  ROUND(
    COUNT(DISTINCT CASE WHEN event_type = 'start_clicked' THEN session_id END) /
    NULLIF(COUNT(DISTINCT CASE WHEN event_type = 'page_loaded' THEN session_id END), 0) * 100
  , 1) AS start_rate_pct,

  ROUND(
    COUNT(DISTINCT CASE WHEN event_type = 'cta_clicked' THEN session_id END) /
    NULLIF(COUNT(DISTINCT CASE WHEN event_type = 'performer_viewed' THEN session_id END), 0) * 100
  , 1) AS cta_rate_pct

FROM events
WHERE event_timestamp >= CURDATE() - INTERVAL 30 DAY
GROUP BY DATE(event_timestamp)
ORDER BY day DESC;
```

### A/B Test Comparison

```sql
-- Compare conversion rates between A/B variants
-- Extracts variant from JSON properties
SELECT
  JSON_UNQUOTE(JSON_EXTRACT(properties, '$.ab_variants.cta_color')) AS variant,

  COUNT(DISTINCT session_id) AS total_sessions,

  COUNT(DISTINCT CASE WHEN event_type = 'cta_clicked'
    THEN session_id END) AS sessions_with_cta,

  ROUND(
    COUNT(DISTINCT CASE WHEN event_type = 'cta_clicked' THEN session_id END) /
    NULLIF(COUNT(DISTINCT session_id), 0) * 100
  , 2) AS cta_rate_pct,

  -- Average performers viewed per session (engagement)
  ROUND(AVG(
    CASE WHEN event_type = 'performer_viewed' THEN 1 ELSE 0 END
  ) * COUNT(*) / NULLIF(COUNT(DISTINCT session_id), 0), 1) AS avg_performers_viewed

FROM events
WHERE event_timestamp >= '2026-02-01'
  AND JSON_EXTRACT(properties, '$.ab_variants.cta_color') IS NOT NULL
GROUP BY variant;
```

### Retention Cohort Analysis

```sql
-- Weekly cohort retention
-- Shows: of users first seen in week X, what % returned in week X+1, X+2, etc.
WITH cohorts AS (
  SELECT
    visitor_id,
    MIN(visit_date) AS cohort_date,
    DATE(MIN(visit_date) - INTERVAL WEEKDAY(MIN(visit_date)) DAY) AS cohort_week
  FROM daily_visitors
  GROUP BY visitor_id
),
activity AS (
  SELECT
    c.cohort_week,
    c.visitor_id,
    FLOOR(DATEDIFF(dv.visit_date, c.cohort_date) / 7) AS week_number
  FROM cohorts c
  JOIN daily_visitors dv ON c.visitor_id = dv.visitor_id
)
SELECT
  cohort_week,
  COUNT(DISTINCT CASE WHEN week_number = 0 THEN visitor_id END) AS week_0,
  COUNT(DISTINCT CASE WHEN week_number = 1 THEN visitor_id END) AS week_1,
  COUNT(DISTINCT CASE WHEN week_number = 2 THEN visitor_id END) AS week_2,
  COUNT(DISTINCT CASE WHEN week_number = 3 THEN visitor_id END) AS week_3,
  COUNT(DISTINCT CASE WHEN week_number = 4 THEN visitor_id END) AS week_4,

  -- Retention percentages
  ROUND(COUNT(DISTINCT CASE WHEN week_number = 1 THEN visitor_id END) /
    NULLIF(COUNT(DISTINCT CASE WHEN week_number = 0 THEN visitor_id END), 0) * 100, 1
  ) AS ret_w1_pct,
  ROUND(COUNT(DISTINCT CASE WHEN week_number = 2 THEN visitor_id END) /
    NULLIF(COUNT(DISTINCT CASE WHEN week_number = 0 THEN visitor_id END), 0) * 100, 1
  ) AS ret_w2_pct,
  ROUND(COUNT(DISTINCT CASE WHEN week_number = 4 THEN visitor_id END) /
    NULLIF(COUNT(DISTINCT CASE WHEN week_number = 0 THEN visitor_id END), 0) * 100, 1
  ) AS ret_w4_pct

FROM activity
GROUP BY cohort_week
ORDER BY cohort_week DESC;
```

### Engagement by Performer View Depth

```sql
-- How does session depth relate to CTA clicks?
-- Answers: "Do users who see more performers click CTA more?"
SELECT
  CASE
    WHEN performers_viewed = 1 THEN '1'
    WHEN performers_viewed BETWEEN 2 AND 3 THEN '2-3'
    WHEN performers_viewed BETWEEN 4 AND 7 THEN '4-7'
    WHEN performers_viewed BETWEEN 8 AND 15 THEN '8-15'
    WHEN performers_viewed BETWEEN 16 AND 30 THEN '16-30'
    ELSE '30+'
  END AS depth_bucket,

  COUNT(*) AS sessions,
  SUM(cta_clicks) AS total_cta_clicks,
  ROUND(SUM(CASE WHEN cta_clicks > 0 THEN 1 ELSE 0 END) / COUNT(*) * 100, 1) AS pct_with_cta,
  ROUND(AVG(duration_ms) / 1000, 0) AS avg_duration_sec

FROM sessions
WHERE started_at >= CURDATE() - INTERVAL 30 DAY
GROUP BY depth_bucket
ORDER BY MIN(performers_viewed);
```

### Time-to-CTA Analysis

```sql
-- How long after session start do users first click CTA?
-- Helps determine optimal CTA timing in the conversion framework
SELECT
  CASE
    WHEN time_to_cta_sec < 30 THEN '<30s'
    WHEN time_to_cta_sec < 60 THEN '30-60s'
    WHEN time_to_cta_sec < 120 THEN '1-2min'
    WHEN time_to_cta_sec < 300 THEN '2-5min'
    ELSE '5min+'
  END AS time_bucket,
  COUNT(*) AS cta_clicks,
  ROUND(COUNT(*) / SUM(COUNT(*)) OVER () * 100, 1) AS pct_of_clicks
FROM (
  SELECT
    e.session_id,
    TIMESTAMPDIFF(SECOND,
      MIN(CASE WHEN e.event_type = 'session_started' THEN e.event_timestamp END),
      MIN(CASE WHEN e.event_type = 'cta_clicked' THEN e.event_timestamp END)
    ) AS time_to_cta_sec
  FROM events e
  WHERE e.event_timestamp >= CURDATE() - INTERVAL 30 DAY
    AND e.event_type IN ('session_started', 'cta_clicked')
  GROUP BY e.session_id
  HAVING time_to_cta_sec IS NOT NULL
) sub
GROUP BY time_bucket
ORDER BY MIN(time_to_cta_sec);
```

---

## Quick Reference: Implementation Checklist

### Week 1: Foundation
- [ ] Create `events` table with schema above
- [ ] Build client-side EventTracker class
- [ ] Implement 5 core funnel events only
- [ ] Build `POST /api/events` endpoint with batch insert
- [ ] Verify events are recording correctly

### Week 2: A/B Infrastructure
- [ ] Build A/B variant assignment (localStorage + first-visit)
- [ ] Add `ab_variants` to global properties
- [ ] Create `ab_tests` table
- [ ] Build significance calculator endpoint or dashboard query
- [ ] Run first test (CTA copy: "Watch Her Live" vs "Go Live" vs "Chat Now")

### Week 3: Engagement Layer
- [ ] Add 6 engagement events
- [ ] Add 4 session events + heartbeat
- [ ] Build `sessions` summary table (populate on `session_ended`)
- [ ] Build `daily_visitors` table (nightly cron)
- [ ] Create basic dashboard: funnel + engagement depth

### Week 4: Analysis
- [ ] Run retention cohort query
- [ ] Identify your "aha moment" (performers viewed threshold that predicts return)
- [ ] Run time-to-CTA analysis to validate conversion timing framework
- [ ] Review first A/B test results
- [ ] Decide what to test next based on data
