# Research: Analytics Event Architecture & A/B Testing for Engagement Apps

## Context

I'm building a live cam roulette app and need to track user behavior to improve the experience over time. The analytics system must answer: "What drives engagement and conversion?" and "Which changes actually make things better?"

**Current plan:**
- Frontend fires lightweight JSON events to `POST /api/events`
- Events include: session_id, event_type, data payload, active A/B variant assignments, timestamp
- Events stored in MySQL `events` table
- A/B tests: assign variant on first page load, store in localStorage, include in every event
- Dashboard shows funnel metrics, engagement stats, A/B test comparisons

**What I don't know:**
- How to structure the event schema so it's actually useful for analysis (not just a blob of JSON)
- How many events per session is too many (performance vs granularity)
- How to calculate if an A/B test result is statistically significant (not just "A has higher number than B")
- What sample sizes I actually need for reliable A/B test results
- How to avoid the "too much data, no insights" problem
- Best practices for event naming, event properties, and event taxonomy

---

## Research Questions

### 1. Event Schema Design
- How do companies like Amplitude, Mixpanel, Segment structure their event schemas?
- What's the recommended event taxonomy? (noun-verb? verb-noun? category.action?)
- Which properties should be on EVERY event vs only specific events?
- How to handle event versioning (when you add/change event properties over time)?
- What's the ideal number of distinct event types? (5? 20? 50?)
- Common mistakes in event schema design that make analysis painful later?

**Search queries:**
- "analytics event schema design best practices"
- "event taxonomy analytics Amplitude Mixpanel"
- "analytics event naming convention"
- "product analytics event design patterns"
- "tracking plan template startups"
- "analytics schema versioning events"

### 2. What to Track (and What NOT to Track)
- For a content discovery app (swipe-based), what are the most valuable events to track?
- Which metrics actually predict retention vs which are vanity metrics?
- Session-level metrics vs event-level metrics — when to use which?
- How to track engagement depth (not just "did they visit" but "how engaged were they")?
- What's the minimum set of events for a useful analytics system?
- What events create more noise than signal?

**Search queries:**
- "content discovery app analytics what to track"
- "engagement metrics that predict retention"
- "vanity metrics vs actionable metrics"
- "minimum viable analytics startup"
- "swipe app analytics events list"
- "TikTok engagement metrics explained"

### 3. A/B Testing Statistical Significance
- How to calculate statistical significance for A/B tests? (formula, not just "use a tool")
- What confidence level to use? (95%? 90%? depends on stakes?)
- How to calculate minimum sample size needed before an A/B test is reliable?
- What's the minimum detectable effect (MDE) and how to choose it?
- Sequential testing vs fixed-horizon — which is better for continuous products?
- How to avoid peeking problems (checking results too early)?
- Bayesian vs frequentist A/B testing — which is simpler to implement?

**Search queries:**
- "A/B test statistical significance calculation formula"
- "A/B test sample size calculator how it works"
- "minimum sample size A/B test calculation"
- "sequential A/B testing implementation"
- "Bayesian A/B testing simple implementation"
- "A/B test peeking problem solution"
- "A/B testing for startups practical guide"

### 4. A/B Testing for Engagement (Not Just Conversion)
- How to A/B test things that affect engagement (session length, return rate) not just click rate?
- Long-term metric A/B tests — how to measure "users come back more" without waiting months?
- Proxy metrics: what short-term signals predict long-term retention?
- Multi-metric A/B tests: what if variant A has higher conversion but lower retention?
- How to run multiple A/B tests simultaneously without interference?

**Search queries:**
- "A/B testing engagement metrics not just conversion"
- "proxy metrics predict retention"
- "A/B test session length engagement"
- "multiple A/B tests simultaneously interference"
- "long term metric A/B testing approach"
- "guardrail metrics A/B testing"

### 5. Event Pipeline Architecture (Lightweight)
- How to handle high-volume events without overloading the backend?
- Client-side batching: batch N events and send every X seconds?
- Event queue on the server: process async or write directly to DB?
- How to handle events when user goes offline (PWA)?
- MySQL vs dedicated analytics DB for event storage?
- When does a simple MySQL events table stop scaling, and what's the next step?

**Search queries:**
- "lightweight analytics event pipeline architecture"
- "client side event batching strategy"
- "analytics event ingestion architecture small scale"
- "MySQL events table scaling limits"
- "analytics pipeline startup simple implementation"
- "event tracking offline PWA strategy"

### 6. Funnel Analysis & Cohort Analysis
- How to structure data for funnel analysis (user lands → starts → swipes → converts)?
- What SQL queries power a basic funnel dashboard?
- Cohort analysis: how to track "users who signed up in week 1" behavior over time?
- Retention curves: how to build and interpret them?
- What visualization makes funnel/retention data actionable (not just pretty)?

**Search queries:**
- "funnel analysis SQL query example"
- "cohort analysis implementation MySQL"
- "retention curve calculation method"
- "funnel analysis best practices product analytics"
- "build analytics dashboard from scratch"
- "SQL retention analysis query example"

---

## Output Format

### Finding: [Specific technique or insight]
**Source:** [URL or documentation]
**Key points:**
- [Specific, implementable detail]
- [SQL query, formula, or code snippet if applicable]
**How to apply for our roulette app:**
- [Specific recommendation]

---

## Summary I Need

1. **Event schema template** — a concrete event taxonomy for a swipe-based content app. Exact event names, required properties per event, and which properties go on every event.
2. **A/B test significance formula** — something I can implement in JavaScript/TypeScript. Input: control count, control conversions, variant count, variant conversions. Output: is it significant at 95%?
3. **Sample size requirements** — table or formula: "for X% baseline conversion rate and Y% minimum detectable effect, you need N sessions per variant"
4. **Engagement metric hierarchy** — ranked list of which metrics actually matter for a content discovery app, from most predictive of retention to least.
5. **Event pipeline recommendation** — client batching interval, server processing strategy, MySQL schema for the events table (actual CREATE TABLE statement).
6. **What NOT to track** — specific antipatterns and events that create noise.
7. **Funnel SQL** — the actual SQL queries for our specific funnel (page_load → start_click → performer_shown → cta_click).

---

**Estimated research time:** 45-60 minutes
**Priority:** HIGH — Bad analytics = bad decisions = building the wrong things
