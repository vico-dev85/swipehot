# xcam.vip — Live Cam Roulette

## What This Is

A TikTok-style live cam roulette hosted on **xcam.vip** (WordPress, dedicated server).
Shows random live Chaturbate performers one at a time, full-screen, no blur, muted.
Users swipe through performers fast. When they want to engage (chat, sound, enter the
room, get notified) they click through to **www.xcam.vip**, a Chaturbate white label
owned by the same person. Revenue comes from Chaturbate affiliate commissions on signups.

## Two Domains (Same Owner)

| Domain | What it is | Role |
|---|---|---|
| **xcam.vip** | WordPress site on dedicated server | Hosts the roulette app, backend API, future content pages |
| **www.xcam.vip** | Chaturbate white label | Registration, performer rooms, embeds — looks like one platform to users |

Users never see chaturbate.com. The only direct Chaturbate call is the backend
fetching performer data from the affiliate API — invisible to visitors.

---

## Core User Experience

### The Flow
1. Start screen with branding + "Chat Now!" (A/B testable: splash vs instant start)
2. Full-screen live video — NO blur, muted, performer streaming immediately
3. Swipe up or tap NEXT for next performer (preloaded in hidden iframe = instant)
4. Swipe down = go back to previous performer (one-deep history)
5. Performer info overlaid on video: username, viewer count, tags
6. "Enter Room" CTA button floating on video (like TikTok right-side icons)
7. Gender filter: Everyone / Female / Male / Trans / Couples — free, no gate
8. All UI floats transparently over the video — no solid header bar

### What Drives Conversion
No artificial gates. Users enjoy free, clear, live video. Conversion comes from wanting
MORE of a specific performer:
- **Sound** — streams are muted by default (embed param `disable_sound=1`)
- **Chat** — can't type in the performer's room from the roulette
- **Enter room** — full white label experience with tipping, private shows, cam2cam
- **Notifications** — "know when this performer goes live again"

The "Enter Room" CTA is always visible and prominent. Opens in a new tab.
Configurable destination: direct to performer's room OR registration page (A/B testable).

### Local Camera Box
The webcam PiP box does NOT show the user's camera. Instead, tapping it promotes
1-on-1 private cam sites (configurable destination URL via dashboard). The specific
sites and ad copy will be managed through the admin dashboard.

### Navigation
- **Mobile** (primary): Swipe up = next, swipe down = previous. Buttons also visible.
- **Desktop**: NEXT button, keyboard shortcuts possible later.
- Transitions must be TikTok-fast: preloaded iframes, instant swap, minimal loading indicator.

### Online Counter
Real data from Chaturbate API — sum of `num_users` across the cached pool.
Smooth animated transitions between updates (no jarring jumps).
Falls back to realistic estimation if real count temporarily unavailable.

---

## Affiliate Config

| Key | Value |
|---|---|
| Campaign | `roGHG` |
| Tour | `9oGW` |
| Track | `wetroulette` |
| Embed pattern | `https://www.xcam.vip/embed/{username}/?campaign=roGHG&disable_sound=1&embed_video_only=1&join_overlay=1&mobileRedirect=auto&room={username}&tour=9oGW&track=wetroulette` |
| Registration | `https://www.xcam.vip/accounts/register/?track=xcamvip&room={username}` |
| Room direct | `https://www.xcam.vip/in/?tour=9oGW&campaign=roGHG&track=default&room={username}` |

---

## Chaturbate API (Data Source)

### Endpoint
```
GET https://chaturbate.com/api/public/affiliates/onlinerooms/
```

### Query Parameters
| Param | Values | Notes |
|---|---|---|
| `wm` | `roGHG` | Required — affiliate campaign ID |
| `client_ip` | `request_ip` | Geo-targeting |
| `format` | `json` | Response format |
| `limit` | 1–500 | Rooms per request |
| `offset` | 0–2500+ | Pagination |
| `gender` | `f`, `m`, `t`, `c` | Filter (omit = all genders) |
| `tag` | any tag string | Filter by tag (AND logic only — no OR) |

### Room Object Fields (22 fields per room)
| Field | Type | Coverage | Algorithm Value |
|---|---|---|---|
| `tags` | string[] | 91% | **Primary** — content DNA for personalization |
| `gender` | string | 100% | Explicit filter |
| `num_users` | number | 100% | Popularity/quality signal |
| `num_followers` | number | 100% | Performer quality signal |
| `is_hd` | boolean | 100% | Quality filter |
| `spoken_languages` | string | 100% | Language matching |
| `age` | number/null | 73% | Useful but often null |
| `seconds_online` | number | 100% | Session freshness |
| `room_subject` | string | 99% | Bonus tags via hashtags, mood hints |
| `image_url` | URL | 100% | Thumbnail for previews |
| `display_name` | string | 100% | Display |
| `is_new` | boolean | 100% | New performer flag |
| `country` | string | 30% | Sparse, unreliable |
| `location` | string | freeform | Unreliable ("paradise city") |
| `chat_room_url` | URL | 100% | Direct room link |
| `iframe_embed` | HTML | 100% | Embed code |
| `slug` | string | 100% | Same as username |

### Tag Landscape
- 97+ unique tags in a 100-room sample
- Average 4.4 tags per room
- Top tags: squirt(30%), teen(26%), lovense(24%), young(24%), bigboobs(20%), anal(19%), asian(18%)
- 9% of rooms have no tags — parse hashtags from `room_subject` as fallback

### API Limitations
- `tag` param does AND only (no OR) — all tag matching must happen in our cache layer
- No "similar rooms" or recommendation data — we compute similarity ourselves
- No real-time events — we poll via cron
- No historical data — only currently-online rooms

---

## Personalization Algorithm

### The Concept
Track what the user watches and how long, build a tag preference profile, serve more
of what they like. Same principle as TikTok's recommendation engine but for live cams.

### Behavioral Signals
| Signal | Strength | How to capture |
|---|---|---|
| Watch < 2 seconds then skip | Negative | JS timer between show and swipe |
| Watch 2–10 seconds | Neutral | JS timer |
| Watch 10–30 seconds | Positive | JS timer |
| Watch 30+ seconds | Strong positive | JS timer |
| Click "Enter Room" CTA | Strongest positive | Click event |
| Gender filter selection | Explicit preference | Filter change event |

### Three Phases

**Phase 1 — Client-Side Session Brain (build on day 1)**
- Lives in JavaScript + localStorage, zero infrastructure
- After each performer: log `{tags, gender, watchSeconds, clickedCTA}`
- After 3–5 performers: build tag preference scores
- Send top preferred tags as `prefer_tags` param to `/next` endpoint
- Backend does weighted-random from pool favoring those tags
- ~200 lines total, makes experience feel personalized immediately

**Phase 2 — Server-Side Signal Logging (build in second sprint)**
- `POST /wr-pool/v1/event` endpoint stores signals in MySQL
- Table: `wp_wr_signals (id, session_id, user_id, username, tags, watch_seconds, clicked_cta, gender, created_at)`
- Server-side `/next` reads session history for smarter weighting
- Feeds the analytics dashboard
- Survives page refreshes

**Phase 3 — Accounts + Persistent Brain (build when ready)**
- User accounts link signals to persistent profiles
- Cross-device, cross-session preferences
- Collaborative filtering when enough data exists ("users who liked X also liked Y")
- WordPress MySQL handles this fine up to hundreds of thousands of rows

### Tag Normalization (Required for Phase 1)
Raw tags are inconsistent. Need a synonym map (~30-40 groups):
```
body_large_breasts: [bigboobs, bigtits, bigbreasts, hugetits]
body_petite: [petite, skinny, slim, thin, tiny]
ethnicity_asian: [asian, japanese, korean, chinese, thai]
ethnicity_latina: [latina, latin, colombian, mexican]
```
This ensures watching a `bigtits` performer also boosts `bigboobs` preference.

### Backend Scoring (in /next endpoint)
```
score = tagOverlapScore      (how many preferred tags match)
      + popularityBonus      (num_users normalized)
      + freshnessBonus       (not shown recently)
      - skipPenalty           (tags from quickly-skipped rooms)
```
Pick from top 25% by score with some randomness (avoid being 100% predictable).

### What Makes It Work
- **Bigger pools** — need 400+ rooms per pool (not current 200) for enough variety
- **Tag normalization** — collapses 97+ raw tags into ~30-40 meaningful dimensions
- **Subject parsing** — extract hashtags from `room_subject` for tagless rooms
- **Speed** — all scoring happens in cached data, no extra API calls

---

## Backend Architecture

### Pool Plugin (Rebuild — merge best of v2.0 + v3.0)
- Fetch from Chaturbate API every 60s via WP-Cron
- 5 pools: general(400+), female(240+), male(160+), trans(140+), couple(160+)
- Quality weighting on fetch (top quartile by viewers — from v2.0)
- Retry with random offsets on underfill (from v2.0)
- Top-up from general pool if a gender pool is thin (from v2.0)
- Session-based exclusion to prevent repeats (from v3.0)
- Strict gender validation before serving (from v3.0)
- Cached in WordPress transients

### REST Endpoints
| Endpoint | Method | Purpose |
|---|---|---|
| `/wr-pool/v1/next` | GET | One performer from pool. Params: `pool`, `session`, `prefer_tags` |
| `/wr-pool/v1/prime` | GET | Force refresh all pools, return counts |
| `/wr-pool/v1/stats` | GET | Real online counts for frontend (new) |
| `/wr-pool/v1/event` | POST | Log behavioral signal (Phase 2) |
| `/wr-pool/v1/config` | GET | Dashboard config for frontend (new) |

### Hosting
Dedicated server — no restrictions on cron frequency, MySQL size, or resource usage.

---

## Admin Dashboard

### Purpose
Single control panel for the roulette site. Designed to eventually support multiple
sites (when a second roulette is launched, extract into standalone app).

### What It Controls
| Section | Settings |
|---|---|
| **Affiliate** | Campaign ID, tour ID, tracking params, embed URL pattern, CTA destinations |
| **Pools** | Sizes per gender, refresh interval, quality thresholds, min viewers |
| **UI** | Start screen on/off, swipe enabled, theme colors, logo URLs, brand name |
| **Conversion** | CTA button text, destination (room vs registration), modal content |
| **Promos** | Camera box destination URL, ad slot content, interstitial config |
| **Algorithm** | Tag weights, personalization on/off, aggressiveness, min watch time thresholds |
| **A/B Tests** | Active tests, variant definitions, traffic split percentages |
| **Content Engine** | (Future) keyword queue, generation triggers, publishing config |

### Config Delivery
All settings stored as JSON. Frontend fetches config on page load via `/wr-pool/v1/config`.
Changing a dashboard setting = instant effect on the live site, no code deploy needed.

### Multi-Site (Future)
When a second site is added, the dashboard becomes standalone and talks to each site
via API. Each site exposes `/wr-admin/v1/config` (protected by API key).

---

## Analytics & A/B Testing

### Event Tracking
Every meaningful user action fires a lightweight event to `POST /wr-pool/v1/event`:
```
{session_id, event, data, timestamp, ab_variants}
```

Events tracked:
`page_load`, `start_click`, `performer_shown`, `performer_skipped`,
`performer_watched`, `cta_click`, `swipe_next`, `swipe_back`,
`filter_change`, `camera_click`

For `performer_watched`: includes `watch_seconds`, `tags`, `gender`, `username`
For `cta_click`: includes `destination_url`, `performer_username`

Stored in MySQL table on the dedicated server. This data feeds both
the analytics dashboard AND the personalization algorithm.

### Dashboard Metrics
| Category | Metrics |
|---|---|
| **Funnel** | Page loads → start clicks → performers viewed → CTA clicks |
| **Engagement** | Avg watch time, avg performers/session, skip rate, swipe rate |
| **Content** | Which tags/genders get longest watch times, which performers drive CTA clicks |
| **A/B Tests** | Conversion rate per variant, statistical significance indicator |
| **Health** | Pool sizes, cache freshness, API errors, embed load failures |

### A/B Testing
Dead simple. A test is:
```json
{"id": "start_screen_v2", "variants": ["splash", "instant"], "split": [50, 50], "active": true}
```
On page load, JS checks localStorage for assigned variant. If none, assigns based on
split ratio and stores it. Every event includes active variant assignments. Dashboard
compares metrics between variants.

Planned A/B tests: start screen vs instant start, CTA placement, CTA destination
(room vs registration), transition speed, personalization on vs off.

---

## Test Suite

### Level 1: Backend Health Checks (automated, every 5 minutes)
- Is cron running? (`fetched_at` timestamp < 2 minutes old)
- Are all 5 pools populated with > 0 results?
- Does `/next` return valid response with `embed_src`?
- Does `/next?pool=female` return a female performer?
- Is the event endpoint accepting POSTs?
- Is the embed URL format correct?

Runs as a WP-CLI command or standalone script. Alerts on failure.

### Level 2: Frontend Unit Tests (run before each commit)
- Config loads and validates correctly
- Tag normalization maps synonyms properly
- Watch time tracker calculates durations correctly
- Session brain scores tags correctly
- Swipe gesture detection works
- CTA URL built correctly with affiliate params and room name
- A/B variant assignment is sticky (same user = same variant)
- Online counter animates smoothly without jumps

Fast JS tests, no browser required. Run via `npm test` or a test HTML page.

### Level 3: End-to-End Smoke Tests (run after deploy)
- Page loads without JS errors
- Start screen appears (or performer loads, depending on variant)
- Swiping/clicking triggers performer load
- Performer iframe has valid src URL with correct affiliate params
- CTA button exists with correct href
- Gender filter works and changes pool
- Events are sent to backend
- No console errors, no network failures

Automated via Playwright/Puppeteer, or manual checklist until app stabilizes.

### Git Workflow
Every working version gets committed. Health checks + unit tests must pass before
any changes. If something breaks, roll back to the last passing commit.

---

## SEO Content Engine (Planned Expansion)

### The Vision
Transform xcam.vip from a single-page roulette into a full content site with
thousands of indexable pages, all driving organic Google traffic back to the
roulette and the white label.

### Two Content Types

**Model Profile Pages** (`/models/{username}`)
- AI-generated bio/content (300–500 words, SEO-optimized)
- Live Chaturbate embed when model is online (using same embed system as roulette)
- "Offline" state: CTA + similar models + "get notified when online"
- Tags, categories, viewer stats from Chaturbate API
- Related models section (auto-linking)

**Blog Posts** (`/blog/{keyword-slug}`)
- AI-generated strategic articles (1,500–2,500 words)
- Target general keywords: "best latina cams", "chaturbate guide", "free tokens"
- Heavy internal linking to model pages
- Research-driven, unique content per keyword

### Intelligent Internal Linking
- **Dynamic, not static** — model pages query DB for related models on load
- **Bidirectional** — adding a new model page automatically appears in related sections of similar models
- **Blog → Model** — articles link contextually to relevant model pages
- **Category hubs** — `/latina-cams`, `/asian-cams` → auto-updating model grids
- **Varied anchor text** — AI-generated, not repetitive
- Link density: ~1 link per 100 words in blog posts, 5–8 related models per model page

### Architecture
The content engine is a **standalone pipeline** (not a WordPress plugin):
```
Keyword Queue → Research → AI Writer → Validator → Publish via WP REST API
```
Could reuse the VideoDate.VIP pipeline pattern (TypeScript + Claude API).
WordPress receives and serves the generated pages.

### How It Connects to the Roulette
- **Shared pool data** — model pages use the same cached API data for online status
- **Shared embed system** — same iframe embed code, same affiliate params
- **Shared analytics** — same event tracking on model pages
- **Roulette personalization feeds SEO priorities** — most-engaged tags = generate those model pages first
- **Model pages feed the roulette** — "model is offline → watch similar on roulette"

### What the Roulette Build Must Account for Now
1. Pool data accessible via clean API (not locked inside roulette JS)
2. Embed URL construction is a shared utility (not hardcoded)
3. Analytics events are generic enough to work on any page type
4. Dashboard has a "content engine" config section ready to expand

---

## Project Structure

```
xcamvip/
├── CLAUDE.md                    ← this file (project brain)
├── index.html                   ← main HTML shell
├── css/
│   ├── base.css                 ← reset, layout, typography
│   ├── header.css               ← transparent header, filter dropdown, online count
│   ├── video.css                ← video area, iframes, crop
│   ├── controls.css             ← NEXT button, swipe hints
│   ├── overlays.css             ← start screen, transition indicator
│   ├── modals.css               ← CTA modal, promo modals
│   ├── camera.css               ← camera promo box
│   └── theme.css                ← color variables (easy to swap)
├── js/
│   ├── config.js                ← endpoints, affiliate IDs, all constants, dashboard config
│   ├── app.js                   ← init, start screen, main lifecycle
│   ├── pool.js                  ← fetch performers, preload, dual iframe swap
│   ├── swipe.js                 ← touch/swipe gesture handling
│   ├── controls.js              ← NEXT, gender filter, dropdown logic
│   ├── camera.js                ← camera promo box + redirect
│   ├── modals.js                ← CTA modals, room entry
│   ├── online.js                ← real online count with smooth animation
│   ├── crop.js                  ← video crop/positioning
│   ├── brain.js                 ← session personalization (tag tracking, scoring)
│   ├── events.js                ← analytics event dispatching
│   └── ab.js                    ← A/B test variant assignment
├── plugins/
│   └── xcam-pool/               ← rebuilt pool plugin (best of v2 + v3)
│       ├── xcam-pool.php        ← main plugin file
│       ├── includes/
│       │   ├── class-pool-fetcher.php   ← Chaturbate API fetching + caching
│       │   ├── class-pool-matcher.php   ← weighted selection, personalization
│       │   ├── class-event-logger.php   ← analytics event storage
│       │   └── class-config-api.php     ← dashboard config REST endpoint
│       └── admin/
│           └── class-dashboard.php      ← WordPress admin dashboard page
├── tests/
│   ├── health-check.php         ← backend health checks (cron-able)
│   ├── test-frontend.html       ← JS unit tests
│   └── smoke-test.js            ← end-to-end tests (Playwright)
├── assets/
│   └── (logos, icons)
└── reference/                   ← original files for comparison only
    ├── current-code.txt
    ├── xcam-cached-pool-v3.php
    ├── xcam-rest-original.php
    ├── wr-pool-matcher-v2.php
    └── api-url.txt
```

---

## Design Principles

1. **Mobile-first** — majority of traffic is mobile
2. **Speed over polish** — fast transitions beat pretty animations
3. **No fake elements** — real data, honest UI
4. **Everything configurable** — ad slots, CTAs, colors, algorithm tuning — all in dashboard config
5. **Well-commented code** — every file, every function, clear purpose
6. **Git versioned** — commit working states, test before changing
7. **Modular** — each JS/CSS file has one job, each PHP class has one responsibility
8. **Future-proof** — pool data, embeds, analytics designed to serve both roulette and content engine

---

## What Is NOT in Scope (Yet)

- SEO content engine implementation (architecture documented above, build later)
- User accounts / login system (Phase 3 of personalization)
- Real chat functionality (roulette has no chat — that's the white label's job)
- Email collection / invite gating (removed — direct conversion only)
- Multiple site support in dashboard (start with single site, extract later)

---

## Development Workflow

1. Read CLAUDE.md at start of every session
2. Check `.claude/projects/` memory files for session-specific notes
3. Run health checks + unit tests before making changes
4. Commit to git before any breaking changes
5. Test on mobile viewport first
6. Update CLAUDE.md and memory files after significant decisions or changes
