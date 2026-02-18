# xcam.vip — Live Cam Roulette Platform

## What This Is

A TikTok-style live cam roulette on **xcam.vip** (self-hosted, dedicated server).
Shows random live Chaturbate performers one at a time, full-screen, no blur, muted.
Users swipe through performers fast. When they want to engage (chat, sound, enter the
room, get notified) they click through to **www.xcam.vip**, a Chaturbate white label
owned by the same person. Revenue comes from Chaturbate affiliate commissions on signups.

The platform is custom-built — no WordPress, no CMS framework. A TypeScript monorepo
with Fastify API, React SPA roulette (Vite + Tailwind + Framer Motion), static HTML
content pages, React admin dashboard, and a CLI content engine. All served by nginx
on a dedicated server.

## Two Domains (Same Owner)

| Domain | What it is | Role |
|---|---|---|
| **xcam.vip** | Custom platform on dedicated server | Roulette app, API, content pages, dashboard |
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

### Core Philosophy: Retention First, Conversion Follows
The app IS the product, not just a funnel. Users should enjoy the experience enough to
come back — even if they don't click an affiliate link today. A user who spends 10 minutes
swiping and returns tomorrow is more valuable than one who clicks once and never comes back.

This means:
- **The experience must be genuinely enjoyable** — not a conversion trap
- **CTAs are present but never pushy** — visible when ready, unobtrusive when not
- **Personalization drives return visits** — "it knows what I like" = habit formation
- **Analytics tracks engagement depth** — not just affiliate CTR. Time on site, performers
  viewed, return rate, session frequency, swipe patterns all matter
- **Every session teaches the algorithm** — even non-converting sessions build the
  personalization brain, making the next visit better

Think TikTok: they don't monetize on the first swipe. They make users build a habit,
and monetization follows naturally.

### What Drives Conversion
No artificial gates. Users enjoy free, clear, live video. Conversion comes from wanting
MORE of a specific performer:
- **Sound** — streams are muted by default (embed param `disable_sound=1`)
- **Chat** — can't type in the performer's room from the roulette
- **Enter room** — full white label experience with tipping, private shows, cam2cam
- **Notifications** — "know when this performer goes live again"

The "Enter Room" CTA is always visible and prominent. Opens in a new tab.
Configurable destination: direct to performer's room OR registration page (A/B testable).

### Conversion Psychology (from UX research)
Three forces drive conversion in this format:
1. **Parasocial bonding** — live streaming creates "one-and-a-half sided" relationships
   stronger than traditional one-sided parasocial bonds. Brief roulette encounters create
   micro-connections; being rotated away triggers loss aversion ("I need to get back to her").
2. **Variable-ratio reinforcement** — identical to slot machines. Each swipe might reveal
   someone extraordinary. Unpredictable rewards trigger stronger dopamine responses.
   The roulette IS the free value; the dopamine loop keeps users engaged long enough
   for conversion triggers to work naturally.
3. **Zeigarnik Effect** — people remember uncompleted experiences 2x better. Being rotated
   away before resolution creates an open loop that clicking through resolves.

### CTA Timing Framework
Surface conversion prompts at moments of peak engagement, not on a timer:

| Session Phase | What to Show | Rationale |
|---|---|---|
| 0-30 seconds | Nothing — let user experience freely | Build value first |
| 30-60 seconds | Soft signals only (viewer count, LIVE badge) | Social proof, no ask |
| 1-2 minutes | Curiosity builders ("X just tipped") | Create curiosity |
| 2-3 minutes | First CTA: "Watch Her Live →" | User has demonstrated engagement |
| 3-5 minutes | Social pressure: "2,341 viewers" | Urgency + social proof |
| 5+ minutes | Direct: "See her full show — Free" | User is clearly invested |
| Return visit | Personalized: "Welcome back! [Model] is live" | Leverage prior engagement |

Key data: Timing prompts to peak-value moments yields 2-3x better conversion than static
placement. Reducing to a single CTA increased conversion by 266%. Personalized CTAs
convert 202% more than untargeted ones.

### CTA Copy (Ranked by Effectiveness)
1. **"Watch Her Live →"** — action-oriented, personal ("her"), implies immediacy
2. **"Enter Free"** — eliminates cost objection, low commitment
3. **"See Full Show"** — curiosity gap, implies partial version
4. **"Join 2,341 Viewers"** — social proof + action combined
5. **"Continue Watching"** — implies continuity, best for session timeout

**Avoid:** "Click Here," "Sign Up Now," "Register," "Buy Tokens," "Visit [SiteName]"
**Principle:** Frame the CTA as continuing the experience, not starting a transaction.

### Local Camera Box
The webcam PiP box does NOT show the user's camera. Instead, tapping it promotes
1-on-1 private cam sites (configurable destination URL via dashboard). The specific
sites and ad copy will be managed through the admin dashboard.

### Navigation & Gesture Specs (from UX research)
- **Mobile** (primary): Swipe up = next, swipe down = previous. Buttons also visible.
- **Desktop**: NEXT button (bottom-right corner), keyboard shortcuts possible later. Stream in 16:9 aspect ratio container, max `min(96vw, calc(90vh * 16/9), 1500px)`. All UI overlaid on stream (no external header/footer).
- **Swipe threshold:** ~20% of screen height OR velocity ~2000 px/s (fast flick)
- **Swipe animation:** 300-400ms, spring physics (stiffness: 300, damping: 30)
- **Style:** Vertical slide (old video slides out, new slides in) — NOT crossfade
- **Sub-threshold swipe:** Rubber-band snap-back with subtle haptic feedback
- **Double-tap:** Like/heart — appears at tap coordinates, 800ms spring scale animation
- **Haptic feedback:** Short vibration on swipe complete, snap-back, and double-tap like
- **UI sound effects:** Web Audio API synthesized sounds (no audio files) — soft whoosh on swipe, pop on like, click on filter change. Very quiet, subtle feedback. See `services/sounds.ts`
- **Content preloading:** Next 1-2 streams always pre-buffered while current plays

### Like/Heart Engagement Signal
Double-tap on video triggers a heart animation + feeds personalization:
- Heart appears at tap point: #FE2C55, ~80px, scale 0→1.2→0.95→1.05→1.0, 800ms
- Right-rail heart icon fills from outlined to solid #FE2C55
- First-time contextual hint: "Double-tap to like" after ~8 seconds of watching
- After first like: feedback "We'll show you more like this"
- **What it does:** Explicit positive signal for personalization — liked performer's tags
  get boosted in the scoring formula. Much stronger signal than dwell time alone.

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
| Track | `xcamvip-roulette` |
| Embed pattern | `https://www.xcam.vip/embed/{username}/?campaign=roGHG&tour=9oGW&track=xcamvip-roulette&disable_sound=1&embed_video_only=1&mobileRedirect=auto&sid={session_id}_{username}` |
| Registration | `https://www.xcam.vip/accounts/register/?track=xcamvip-roulette&room={username}&sid={session_id}_{username}` |
| Room direct (CTA) | `https://chaturbate.com/in/?tour=9oGW&campaign=roGHG&track=xcamvip-roulette&room={username}` |

**IMPORTANT:** The API's `iframe_embed` field contains `/in/` URLs which are **302 redirects** — they do NOT work as iframe `src`. Always use `/embed/{username}/` for embeds. Use `/in/` only for CTA click-through links. Embeds use the white label domain (`www.xcam.vip`) — no Chaturbate watermark, resistant to ad blockers.

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

## Production PHP API

The live site uses a lightweight PHP API layer (no Node.js process needed). PHP files live in `packages/frontend/public/api/` and deploy to each domain's web root.

### PHP API Files
| File | Purpose |
|---|---|
| `_config.php` | Shared config — affiliate IDs, MySQL creds, CORS, cache dir. **Domain-specific — only file to edit per domain.** |
| `_db.php` | MySQL connection helper (PDO) + auto-creates tables on first request |
| `_pool.php` | Pool fetching from CB API, file caching (90s TTL), tag normalization, quality scoring, seen-set, personalized selection |
| `pool-next.php` | `GET /api/pool-next.php` — returns next unseen performer with personalized ranking |
| `events.php` | `POST /api/events.php` — logs analytics events to MySQL, upserts daily_visitors |
| `stats.php` | `GET /api/stats.php?key=xxx` — returns analytics summary (views, clicks, CTR, daily) |
| `postback.php` | `GET /api/postback.php` — receives Chaturbate conversion postbacks |
| `config.php` | `GET /api/config.php` — returns public frontend config (CTA text, A/B tests) |

### Key Production Details
- **Seen-set**: File-based per session (500 cap, trims to 400, 2-hour TTL)
- **Pool exhaustion**: When all performers seen, force-deletes cache and re-fetches from CB API
- **Synthetic tags**: Age buckets (age_18_22, age_23_30, age_31_40, age_41_plus) and country codes (country_co, etc.) injected alongside content tags
- **Selection algorithm**: 30% random exploration, 70% blended scoring (alpha * personal + (1-alpha) * popularity), weighted random from top 25%
- **Multi-domain**: Each domain gets its own `_config.php` with separate DB, cache dir, track ID. Same code otherwise. See `docs/multi-domain-setup.md`

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend (roulette)** | React SPA (Vite + TypeScript + Tailwind + Framer Motion) | Lovable prototype had working spring physics, roulette is behind age gate so SEO irrelevant |
| **Production API** | PHP 7.4+ (direct on FastPanel) | Simple deployment — PHP files in web root, no Node process needed |
| **Dev API** | Node.js + Fastify (TypeScript) | Local dev server with Redis/memory fallback |
| **Database** | MySQL | Events, stats, config — separate DB per domain |
| **Cache** | File-based (PHP `sys_get_temp_dir()`) | Pool data cached as JSON files with 90s TTL |
| **Process Manager** | PM2 | Auto-restart for Fastify dev server |
| **Web Server** | nginx + FastPanel | Serves static files, PHP via php-fpm, SSL |
| **Dashboard** | React SPA (Vite + TypeScript) | Lightweight admin panel, talks to API, behind auth |
| **Content Engine** | TypeScript CLI (same monorepo) | Generates content via Claude API, renders HTML, shares types with API |

### Server Requirements (Production)
- PHP 7.4+ with curl, pdo_mysql extensions
- MySQL 8+
- nginx + FastPanel (or cPanel)
- SSL certificate (Let's Encrypt)

### Server Requirements (Local Dev)
- Node.js 20+ LTS
- No Redis or MySQL required (both have fallbacks)

---

## Monorepo Structure

```
xcamvip/
├── CLAUDE.md                       ← this file (project brain)
├── package.json                    ← npm workspaces root
├── tsconfig.base.json              ← shared TypeScript config
│
├── packages/
│   ├── frontend/                   ← roulette app (React SPA — Vite + TypeScript + Tailwind)
│   │   ├── package.json
│   │   ├── vite.config.ts          ← React-SWC, @ alias, /api proxy
│   │   ├── tailwind.config.ts      ← design tokens, animations
│   │   ├── tsconfig.json
│   │   ├── index.html              ← SPA entry with meta tags
│   │   └── src/
│   │       ├── main.tsx             ← React root render
│   │       ├── App.tsx              ← Renders <Index />
│   │       ├── index.css            ← CSS variables, glass, grain, gradients
│   │       ├── pages/
│   │       │   └── Index.tsx        ← Screen state machine (age-gate → splash → roulette)
│   │       ├── components/
│   │       │   ├── AgeGate.tsx      ← 18+ verification gate
│   │       │   ├── StartScreen.tsx  ← Splash with live count + CTA
│   │       │   ├── RouletteView.tsx ← Main roulette (API-connected, preloading, gestures)
│   │       │   ├── TopBar.tsx       ← Gender filter pills + live viewer count
│   │       │   ├── ActionStack.tsx  ← TikTok-style right-rail actions
│   │       │   ├── GenderFilterSheet.tsx ← Bottom sheet filter (swipe to dismiss)
│   │       │   ├── PerformerProfile.tsx  ← Right panel (swipe to dismiss)
│   │       │   └── ThumbnailOverlay.tsx ← Performer image while iframe loads
│   │       ├── services/
│   │       │   ├── api.ts           ← fetchNextPerformer, fetchPoolStats, fetchConfig
│   │       │   ├── session.ts       ← Session ID (32-char hex), visitor ID, session rotation
│   │       │   ├── iframe-manager.ts ← Dual iframe system (preload, crossfade, center-crop, memory cleanup)
│   │       │   ├── brain.ts         ← Client-side personalization (30-dim tag vector, age/country synthetic tags, localStorage)
│   │       │   ├── tracker.ts       ← EventTracker (batch queue, flushes every 30s or on unload)
│   │       │   ├── sounds.ts        ← UI sound effects (Web Audio API — swipe whoosh, like pop, filter click)
│   │       │   ├── ab.ts            ← A/B test variant assignment + significance calculator
│   │       │   └── cta-timing.ts    ← Engagement-based CTA progression (6 phases)
│   │       └── lib/
│   │           └── utils.ts         ← cn() utility (clsx + tailwind-merge)
│   │
│   ├── api/                        ← backend server (Fastify + TypeScript)
│   │   ├── src/
│   │   │   ├── server.ts           ← Fastify app init, plugin registration
│   │   │   ├── routes/
│   │   │   │   ├── pool.ts         ← GET /api/pool/next, /api/pool/stats
│   │   │   │   ├── events.ts       ← POST /api/events
│   │   │   │   ├── health.ts       ← GET /api/health
│   │   │   │   ├── config.ts       ← GET /api/config (CTA text, feature flags, A/B defs)
│   │   │   │   └── admin.ts        ← /api/admin/* (dashboard endpoints, auth required)
│   │   │   ├── services/
│   │   │   │   ├── pool-fetcher.ts ← Chaturbate API polling + Redis caching (tag normalization, quality scoring)
│   │   │   │   ├── pool-matcher.ts ← Weighted selection with personalization (alpha blending, 30% exploration)
│   │   │   │   ├── session.ts      ← Session exclusion (Redis SADD/SISMEMBER), validation
│   │   │   │   ├── event-logger.ts ← Batch INSERT to MySQL events table (memory fallback)
│   │   │   │   └── cron.ts         ← node-cron job definitions (pool refresh every 60s)
│   │   │   ├── db.ts               ← MySQL connection pool (optional — graceful degradation)
│   │   │   ├── redis.ts            ← Redis connection with MemoryStore fallback for local dev
│   │   │   └── middleware/
│   │   │       └── auth.ts         ← dashboard JWT authentication
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── dashboard/                  ← admin CMS (React + Vite + TypeScript)
│   │   ├── src/
│   │   │   ├── pages/              ← config, analytics, pools, A/B tests, content engine
│   │   │   └── components/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── content-engine/             ← SEO content generator + HTML renderer (TypeScript CLI)
│   │   ├── src/
│   │   │   ├── cli/index.ts        ← CLI entry point (seed, generate, check-status, etc.)
│   │   │   ├── generators/
│   │   │   │   ├── model-page.ts   ← model page generation pipeline
│   │   │   │   └── blog-post.ts    ← blog post generation pipeline
│   │   │   ├── renderer/
│   │   │   │   └── html.ts         ← renders content to static HTML files
│   │   │   ├── validators/
│   │   │   │   └── content.ts      ← quality checks (word count, uniqueness, structure)
│   │   │   └── seo/
│   │   │       ├── sitemap.ts      ← sitemap.xml generator
│   │   │       ├── schema.ts       ← JSON-LD schema markup per page type
│   │   │       └── meta.ts         ← meta tag generation (title, description, OG, twitter)
│   │   ├── templates/
│   │   │   ├── model-page.html     ← HTML template for model pages
│   │   │   ├── blog-post.html      ← HTML template for blog posts
│   │   │   └── category-hub.html   ← HTML template for category pages
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                     ← shared types, DB models, utilities
│       ├── src/
│       │   ├── types.ts            ← TypeScript interfaces (Performer, Config, Event, etc.)
│       │   ├── db.ts               ← MySQL connection + query helpers
│       │   ├── redis.ts            ← Redis connection + cache helpers
│       │   ├── embed.ts            ← embed URL construction (shared between roulette + content)
│       │   └── tags.ts             ← tag normalization map
│       ├── package.json
│       └── tsconfig.json
│
├── public/                         ← nginx document root
│   ├── (frontend files copied/symlinked here)
│   ├── models/                     ← pre-rendered model page HTML files
│   │   └── miarose/index.html
│   ├── blog/                       ← pre-rendered blog post HTML files
│   ├── sitemap.xml                 ← auto-generated
│   └── robots.txt
│
├── database/
│   └── migrations/                 ← SQL migration files (versioned)
│
├── docs/
│   ├── brain-personalization.md    ← how the personalization brain works
│   └── multi-domain-setup.md      ← step-by-step guide for deploying on new domains
│
├── reference/                      ← original files for comparison only
│   ├── current-code.txt
│   ├── xcam-cached-pool.php
│   ├── xcam-rest.php
│   ├── wr-pool-matcher.php
│   └── api-url.txt
│
├── assistant/                      ← planning docs and notes
│
└── tests/
    ├── health-check.ts             ← backend health checks (cron-able)
    ├── frontend/                   ← JS unit tests
    └── e2e/                        ← Playwright end-to-end tests
```

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
- Send top preferred tags as `prefer_tags` param to `/api/pool/next`
- Backend does weighted-random from cached pool favoring those tags
- ~200 lines total, makes experience feel personalized immediately

**Phase 2 — Server-Side Signal Logging (build in second sprint)**
- `POST /api/events` stores signals in MySQL `events` table
- Server-side `/api/pool/next` reads session history for smarter weighting
- Feeds the analytics dashboard
- Survives page refreshes

**Phase 3 — Accounts + Persistent Brain (build when ready)**
- User accounts link signals to persistent profiles
- Cross-device, cross-session preferences
- Collaborative filtering when enough data exists ("users who liked X also liked Y")
- MySQL handles this fine up to hundreds of thousands of rows

### Tag Normalization
Raw tags are inconsistent. Synonym map (~30 groups) in `_pool.php` `$TAG_SYNONYMS` and `brain.ts`:
```
bigboobs: [bigboobs, bigtits, bigbreasts, hugetits, busty]
asian: [asian, japanese, korean, chinese, thai, filipina]
latina: [latina, latin, colombian, mexican, brazilian, spanish]
```
This ensures watching a `bigtits` performer also boosts `bigboobs` preference.

### Synthetic Tags (Age & Country)
Both client brain and server pool add synthetic tags from structured data:
- **Age buckets**: `age_18_22`, `age_23_30`, `age_31_40`, `age_41_plus` (only valid ages 18-69)
- **Country codes**: `country_co`, `country_ro`, `country_us`, etc. (only known 2-letter ISO codes)
- Weighted at 0.7x normal tag weight (implicit signals, not explicit content tags)
- Validated against known-good values (rejects fake ages like 99, joke locations like "my room")

### Backend Scoring (in `_pool.php` `selectPerformer()`)
```
blended = alpha * personalScore + (1 - alpha) * popularityScore
```
- `personalScore`: tag overlap with user's `prefer_tags` (position-weighted)
- `popularityScore`: `quality_score` normalized to 0-100 (log10 viewers + HD bonus + freshness)
- `alpha`: starts at 0, ramps to 0.85 over 20 swipes
- 30% exploration: random pick from full unseen pool (prevents filter bubble)
- 70% exploitation: weighted random from top 25% by blended score

### What Makes It Work
- **Bigger pools** — need 400+ rooms per pool for enough variety
- **Tag normalization** — collapses 97+ raw tags into ~30-40 meaningful dimensions
- **Subject parsing** — extract hashtags from `room_subject` for tagless rooms
- **Speed** — all scoring happens in Redis-cached data, no extra API calls

---

## Backend API Architecture

### Production: PHP API (FastPanel)
PHP files in `packages/frontend/public/api/` served directly by nginx + php-fpm. No Node.js process needed in production.

- Fetches from Chaturbate API on-demand with file cache (90s TTL)
- 5 gender pools: all, f, m, t, c (500/500/200/200/200 limit)
- Quality scoring: log10(viewers) * 25 + HD bonus + freshness bonus
- Session exclusion via file-based seen-sets (500 cap, 2-hour TTL)
- Personalized selection: blended scoring with 30% exploration
- Pool exhaustion recovery: force-delete cache + re-fetch if all seen
- MySQL for events/stats, file cache for pools/sessions

### Production API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/pool-next.php` | GET | Next unseen performer. Params: `session_id`, `gender`, `prefer_tags`, `alpha` |
| `/api/events.php` | POST | Log analytics events + upsert daily_visitors |
| `/api/stats.php` | GET | Analytics summary (requires `key` param) |
| `/api/postback.php` | GET | Chaturbate conversion postback receiver |
| `/api/config.php` | GET | Public frontend config (CTA text, A/B tests) |

### Development: Fastify + Redis (Local)
Node.js API server in `packages/api/` for local development with Redis/memory fallback.

**Admin routes (dashboard, future):**
| Route | Method | Purpose |
|---|---|---|
| `/api/admin/config` | GET/PUT | Read/update all dashboard settings |
| `/api/admin/pools` | GET | Pool health: sizes, cache age, last fetch errors |
| `/api/admin/analytics` | GET | Dashboard metrics: funnel, engagement, content performance |
| `/api/admin/ab-tests` | GET/POST/PUT | Manage A/B test definitions |
| `/api/admin/content/*` | various | Content engine management (keywords, models, posts) |
| `/api/admin/auth/login` | POST | Dashboard login (returns JWT) |

### nginx Configuration
```
server {
    listen 443 ssl;
    server_name xcam.vip;

    # Roulette SPA
    location / {
        root /path/to/public;
        try_files $uri $uri/ /index.html;
    }

    # Pre-rendered content pages (model pages, blog posts)
    location /models/ {
        root /path/to/public;
        try_files $uri $uri/index.html =404;
    }
    location /blog/ {
        root /path/to/public;
        try_files $uri $uri/index.html =404;
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
    }

    # Dashboard SPA
    location /admin/ {
        root /path/to/dashboard/dist;
        try_files $uri /admin/index.html;
    }

    # SEO files
    location = /sitemap.xml { root /path/to/public; }
    location = /robots.txt { root /path/to/public; }
}
```

---

## Database Schema

All tables in a single MySQL database. No `wp_` prefix — clean names.

### Roulette Tables

```sql
-- Dashboard configuration (key-value with JSON values)
CREATE TABLE config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value JSON NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Analytics events (every user action)
CREATE TABLE events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    user_id BIGINT NULL,
    event_type VARCHAR(50) NOT NULL,
    data JSON,
    ab_variants JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_type_date (event_type, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A/B test definitions
CREATE TABLE ab_tests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    test_id VARCHAR(50) UNIQUE NOT NULL,
    variants JSON NOT NULL,
    split JSON NOT NULL,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dashboard admin accounts
CREATE TABLE admins (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Content Engine Tables

```sql
-- Generated model profile pages
CREATE TABLE models (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(100) UNIQUE NOT NULL,
    chaturbate_username VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    bio TEXT,
    categories JSON,
    tags JSON,
    status ENUM('pending', 'active', 'inactive', 'removed') DEFAULT 'pending',
    is_currently_online TINYINT(1) DEFAULT 0,
    last_online_at DATETIME NULL,
    num_followers INT DEFAULT 0,
    html_file_path VARCHAR(500) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_online (is_currently_online)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Keyword queue (model names + general SEO keywords)
CREATE TABLE keywords (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    type ENUM('model_name', 'general') NOT NULL,
    priority INT DEFAULT 0,
    status ENUM('pending', 'processing', 'completed', 'skipped', 'failed') DEFAULT 'pending',
    error_message TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    INDEX idx_queue (status, type, priority DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Generated blog posts
CREATE TABLE blog_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    keyword_id BIGINT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    content LONGTEXT,
    linked_models JSON,
    word_count INT DEFAULT 0,
    internal_link_count INT DEFAULT 0,
    html_file_path VARCHAR(500) NULL,
    status ENUM('draft', 'published', 'failed') DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Knowledge base (AI brain context for content generation)
CREATE TABLE knowledge_base (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    category ENUM('platform_features', 'seo_strategy', 'content_templates', 'model_page_guide', 'blog_post_guide'),
    tags JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pipeline run logs (every generation attempt)
CREATE TABLE pipeline_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    content_type ENUM('model_page', 'blog_post') NOT NULL,
    keyword VARCHAR(255),
    success TINYINT(1) DEFAULT 0,
    quality_score INT NULL,
    error_message TEXT NULL,
    retry_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_date (content_type, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Note: Pool data lives in Redis (not MySQL) — it's transient cache refreshed every 60s.
Session exclusion lists also live in Redis with TTL.

---

## Admin Dashboard

### Purpose
Custom admin panel for the roulette platform. Built as a React SPA served at `/admin/`.
Protected by JWT auth. Designed to eventually support multiple sites.

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
| **Content Engine** | Keyword queue, generation triggers, publishing config |
| **Health** | Pool status, cache freshness, cron status, API error rates |

### Config Delivery
All settings stored as JSON rows in `config` table. Frontend fetches public subset on
page load via `GET /api/config`. Changing a dashboard setting = instant effect on the
live site, no code deploy needed.

### Multi-Site (Future)
When a second site is added, the dashboard becomes standalone and talks to each site
via API. Each site exposes `/api/admin/config` (protected by API key).

---

## Analytics & A/B Testing

### Event Tracking
Every meaningful user action fires a lightweight event to `POST /api/events`:
```json
{"session_id": "...", "event_type": "...", "data": {...}, "ab_variants": {...}}
```

Events tracked:
`page_load`, `start_click`, `performer_shown`, `performer_skipped`,
`performer_watched`, `cta_click`, `swipe_next`, `swipe_back`,
`filter_change`, `camera_click`, `performer_liked`, `share`

For `performer_watched`: includes `watch_seconds`, `tags`, `gender`, `username`
For `cta_click`: includes `destination_url`, `performer_username`
For `performer_liked`: includes `performer_username`, `tags`, `watch_seconds_before_like`

Stored in MySQL `events` table. Feeds both the analytics dashboard AND personalization.

### Engagement Signal Strength (for personalization weighting)

| Signal | Strength | How Measured |
|---|---|---|
| Watch < 2s then skip | Negative | JS timer |
| Watch 2-10s | Neutral | JS timer |
| Watch 10-30s | Positive | JS timer |
| Watch 30+ seconds | Strong positive | JS timer |
| Double-tap like | Strong positive | Tap event |
| Click "Enter Room" CTA | Strongest positive | Click event |
| Gender filter selection | Explicit preference | Filter change |
| Swipe velocity | Engagement proxy | Fast = browsing, slow = considering |
| Return visit to same model | Retention signal | Session comparison |
| Swipe back (go to previous) | Positive (wanted to return) | Swipe event |

### Dashboard Metrics
| Category | Metrics |
|---|---|
| **Funnel** | Page loads → start clicks → performers viewed → CTA clicks |
| **Engagement** | Avg watch time, avg performers/session, skip rate, swipe rate |
| **Content** | Which tags/genders get longest watch times, which performers drive CTA clicks |
| **A/B Tests** | Conversion rate per variant, statistical significance indicator |
| **Health** | Pool sizes, cache freshness, cron timing, API errors, embed load failures |

### A/B Testing
Tests are managed via the admin dashboard (`/admin/`). Tests stored in MySQL `ab_tests` table, loaded by `config.php`, assigned client-side via `ab.ts` (localStorage), included in all analytics events.

**Active Tests (6 total, all wired in frontend):**

| Test | Variants | What It Changes | Where in Code |
|---|---|---|---|
| `start_screen` | `control`, `instant` | Skip splash → straight to roulette | `Index.tsx` |
| `cta_copy` | `watch_live`, `go_live`, `chat_now` | CTA button text | `RouletteView.tsx` |
| `cta_delay` | `fast`, `normal`, `slow` | CTA appears at 15s / 30s / 60s | `RouletteView.tsx` + `cta-timing.ts` |
| `gender_default` | `all`, `female` | Default gender filter | `RouletteView.tsx` |
| `overlay_timeout` | `fast`, `normal`, `slow` | UI auto-hide at 3s / 5s / 8s | `RouletteView.tsx` |
| `swipe_hint` | `control`, `hidden` | Show "Swipe up" hint or not | `RouletteView.tsx` |

**Results:** Dashboard shows per-variant conversion rates, two-proportion Z-test significance, and plain-English recommendations ("Switch to X — it's +34% better with 97% confidence").

---

## SEO Infrastructure

Content pages (model profiles, blog posts, category hubs) are pre-rendered to static
HTML files by the content engine. nginx serves them directly — fastest possible TTFB,
perfectly crawlable by Google, no JS rendering required.

This is **better for SEO than WordPress** — no server-side PHP processing per request,
no caching plugins needed. The HTML is already static by design.

### URL Structure
```
/                          → roulette SPA (index.html)
/models/miarose            → pre-rendered HTML (public/models/miarose/index.html)
/blog/best-latina-cams     → pre-rendered HTML (public/blog/best-latina-cams/index.html)
/latina-cams               → pre-rendered HTML (public/latina-cams/index.html)
/sitemap.xml               → auto-generated by content engine
/robots.txt                → static file
/admin/                    → dashboard SPA (noindex, blocked by robots.txt)
/api/                      → Fastify backend (blocked by robots.txt)
```

### Sitemap Generation
Auto-generated by content engine after every publish/unpublish:
- All active model pages with `lastmod` dates
- All published blog posts
- All category hub pages
- Roulette homepage
- Regenerated on every content change, served as static XML

### Meta Tags (per page template)
Every content page includes:
```html
<title>MiaRose Live Cam - Watch Free | XCam.VIP</title>
<meta name="description" content="Watch MiaRose stream live...">
<meta property="og:title" content="MiaRose Live Cam">
<meta property="og:description" content="Watch MiaRose stream live...">
<meta property="og:image" content="https://xcam.vip/images/models/miarose.jpg">
<meta property="og:url" content="https://xcam.vip/models/miarose">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://xcam.vip/models/miarose">
```
Generated by `packages/content-engine/src/seo/meta.ts` per page type.

### Schema Markup (JSON-LD)
Embedded in every content page:
- **Model pages**: ProfilePage schema with name, description, image
- **Blog posts**: Article schema with headline, author, datePublished, image
- **Category hubs**: CollectionPage schema
- **All pages**: BreadcrumbList schema for navigation structure

### robots.txt
```
User-agent: *
Allow: /
Allow: /models/
Allow: /blog/
Disallow: /admin/
Disallow: /api/
Sitemap: https://xcam.vip/sitemap.xml
```

### Content Page Performance
- Static HTML = instant TTFB (nginx serves directly)
- Chaturbate embed lazy-loaded (not in initial HTML render)
- Images: WebP format, responsive srcset, lazy loading
- Content pages have their own minimal CSS (not the full roulette bundle)
- Target: < 2 second full page load on mobile

---

## SEO Content Engine — Technical Specification

### Vision
Transform xcam.vip from a single-page roulette into a full content site with
thousands of indexable pages, all driving organic Google traffic back to the
roulette and the white label.

### Two Content Types

**Model Profile Pages** (`/models/{username}`)
- AI-generated bio/content (300–500 words, SEO-optimized)
- Live Chaturbate embed when model is online (same embed system as roulette)
- "Offline" state: CTA + similar models + "watch similar on roulette"
- Tags, categories, viewer stats from Chaturbate API
- Related models section (dynamic — re-rendered when new models added)

**Blog Posts** (`/blog/{keyword-slug}`)
- AI-generated strategic articles (1,500–2,500 words)
- Target general keywords: "best latina cams", "chaturbate guide", "free tokens"
- Heavy internal linking to model pages
- Research-driven: analyze competing articles before writing

**Category Hub Pages** (`/{category}-cams`)
- Auto-generated grids of all active models in a category
- `/latina-cams`, `/asian-cams`, `/teen-cams`, etc.
- Re-rendered when models are added/removed

### How Content Gets Served (Pre-rendered HTML)
```
Content engine generates "miarose" →
  1. Generates content via Claude API
  2. Validates quality (word count, uniqueness, structure)
  3. Stores metadata in MySQL (models table)
  4. Renders complete HTML file using template
     → public/models/miarose/index.html
  5. Includes: meta tags, schema markup, canonical URL, full content
  6. Updates sitemap.xml
  7. nginx serves it as static HTML — zero overhead
```

When data changes (model goes inactive, new related models added), the engine
re-renders just the affected HTML files. No server-side rendering per request.

### CLI Commands
```bash
# --- Setup ---
npx tsx src/cli/index.ts seed-brain --site xcam
npx tsx src/cli/index.ts seed-keywords --file models.csv --type model_name
npx tsx src/cli/index.ts seed-keywords --file general-keywords.csv --type general

# --- Generate ---
npx tsx src/cli/index.ts generate --type model_page --count 20
npx tsx src/cli/index.ts generate --type blog_post --count 5
npx tsx src/cli/index.ts generate --type model_page --keyword miarose

# --- Monitor ---
npx tsx src/cli/index.ts check-status --all
npx tsx src/cli/index.ts list-keywords --status pending
npx tsx src/cli/index.ts list-models --status active

# --- Maintain ---
npx tsx src/cli/index.ts update-links
npx tsx src/cli/index.ts regenerate-sitemap
```

### Model Page Pipeline
```
1. KEYWORD SELECTION     → pull next pending model_name keyword (highest priority)
2. MODEL VALIDATION      → verify model exists on Chaturbate, pull public data
3. BRAIN CONTEXT         → query knowledge_base for templates, SEO rules, tone
4. CONTENT GENERATION    → Claude API: 400-500 word unique bio with SEO keywords
5. VALIDATION            → word count, heading structure, uniqueness < 30% match, meta desc
6. RELATED MODELS        → query models table for 5-8 with overlapping categories
7. RENDER HTML           → apply template, inject meta tags, schema markup, content
8. WRITE FILE            → save to public/models/{slug}/index.html
9. UPDATE DB + SITEMAP   → mark keyword completed, update sitemap.xml
```

### Blog Post Pipeline
```
1. KEYWORD SELECTION     → pull next pending general keyword
2. WEB RESEARCH          → analyze top 3 competing articles (word count, structure, gaps)
3. BRAIN CONTEXT         → platform knowledge + available model pages to link to
4. STRATEGIC PLANNING    → Claude API generates JSON outline (sections, models to feature)
5. CONTENT GENERATION    → Claude API writes full article following the plan
6. LINK INJECTION        → convert model mentions to internal links, varied anchor text
7. VALIDATION            → 1,500+ words, 10+ internal links, unique content
8. RENDER HTML           → apply template, inject meta, schema, content
9. WRITE FILE            → save to public/blog/{slug}/index.html
10. UPDATE DB + SITEMAP
```

### Internal Linking System

**Blog Posts (static):** Links baked into HTML at generation time. Permanent.

**Model Pages (re-rendered):** "Similar Models" section generated from DB query at
render time. When new models are added, affected pages get re-rendered to include them.
Bidirectional: adding MiaRose → she appears on SophiaSmith's page and vice versa.

**Category Hubs (re-rendered):** Auto-update as models are added/removed.

**Link Density Rules:**
- Blog posts: ~1 link per 100 words
- Model pages: 5–8 related model links
- Varied anchor text (AI-generated, not repetitive)
- Never link to inactive/removed models

### Content Quality Standards

**Model Pages:** 300–600 words, < 30% similarity to others, H1 + 2 H2s minimum,
model name 3–5 times naturally, meta description 120–160 chars.

**Blog Posts:** 1,500+ words, 10+ internal links, proper heading hierarchy,
unique angle vs competition.

**Auto-reject:** If validation fails → retry with improved prompt (max 2).
If still fails → mark 'failed', flag for manual review. Track success rates.

### SEO Risk Management

**Gradual Indexing (critical):**
```
Week 1:  20 model pages → submit to Search Console → monitor
Week 2:  50 more if no issues
Week 3:  100 if indexing healthy
Week 4:  Monitor for penalties, thin content warnings
Month 2: Begin blog posts (10 initially)
Month 3: Scale based on results
```

**Thin Content Prevention:** Min 300 words enforced, unique angle per page, varied structure.

**Duplicate Prevention:** Similarity check before publish, reject > 30% match.

**Over-Optimization Prevention:** Keyword density caps, natural link placement, varied anchors.

### How It Connects to the Roulette
- **Shared pool data** — model pages check online status via same Redis cache
- **Shared embed system** — same iframe embed code from `packages/shared/src/embed.ts`
- **Shared analytics** — same event tracking on model pages via `POST /api/events`
- **Roulette feeds SEO priorities** — most-engaged tags from events = generate those model pages first
- **Model pages feed the roulette** — "model is offline → watch similar on roulette"
- **Category hubs link to roulette** — "Can't decide? Try our random cam roulette"

### Implementation Phases

**Phase 1 — MVP (Week 1-2):** 20 model pages to validate indexing and ranking.

**Phase 2 — Scale (Week 3-4):** Quality validation, dynamic related models, 100 more pages.

**Phase 3 — Blog Content (Month 2):** Web research, blog generator, link injection, category hubs.

**Phase 4 — Automate (Month 3+):** Auto keyword research, auto quality approval, agentic pipeline.

---

## Test Suite

### Level 1: Backend Health Checks (automated, every 5 minutes via cron)
- Is the API server responding?
- Is Redis connected and pool data fresh? (`fetched_at` < 2 minutes old)
- Are all 5 pools populated with > 0 results?
- Does `/api/pool/next` return valid response with `embed_src`?
- Does `/api/pool/next?pool=female` return a female performer?
- Is the events endpoint accepting POSTs?
- Is the embed URL format correct?

Runs as a TypeScript script. Alerts on failure (email, webhook, or log).

### Level 2: Frontend Unit Tests (run before each commit)
- Config loads and validates correctly
- Tag normalization maps synonyms properly
- Watch time tracker calculates durations correctly
- Session brain scores tags correctly
- Swipe gesture detection works
- CTA URL built correctly with affiliate params and room name
- A/B variant assignment is sticky (same user = same variant)
- Online counter animates smoothly without jumps

Fast JS tests, run via `npm test`.

### Level 3: End-to-End Smoke Tests (run after deploy)
- Page loads without JS errors
- Start screen appears (or performer loads, depending on variant)
- Swiping/clicking triggers performer load
- Performer iframe has valid src URL with correct affiliate params
- CTA button exists with correct href
- Gender filter works and changes pool
- Events are sent to backend
- No console errors, no network failures

Automated via Playwright.

---

## Lessons from the Original Code (Re-Review)

### Patterns to Keep (Proven Good)
- **Dual iframe cross-fade**: Two iframes stacked, one preloaded while other plays, 0.6s opacity
  transition on swap. Eliminates blank-screen flash. The CSS is only 12 lines. Keep exactly.
- **Start-screen priming**: First performer loads into hidden iframe WHILE splash screen is visible.
  When user taps "Chat now!", `swapIframes()` fires instantly. Zero perceived latency at first impression.
- **Settled guard pattern**: `preloadInBackground()` uses a `settled` boolean so only one of
  onLoad/onError/timeout resolves the promise. Prevents race conditions. Keep this pattern.
- **100ms preload timer**: Comment says "12 seconds" but actual value is 100ms — next performer
  starts loading almost immediately. This is correct for TikTok-fast UX. Keep the behavior.
- **Overflow-crop for iframes**: `.live-wrap { overflow: hidden }` + JS-calculated canvas width =
  `object-fit: cover` equivalent for iframes. Only 4 lines of CSS + one JS calculation. Elegant.
- **Show/hide visibility pattern**: `opacity: 0; visibility: hidden; transition: opacity 0.4s, visibility 0s 0.4s`
  — correct way to animate overlays while removing from pointer events and accessibility tree.
- **Click-blocker overlay**: Invisible div over iframes prevents users clicking into the Chaturbate
  embed (which would navigate away without affiliate tracking). Critical for revenue. Keep, but
  make it double as the CTA click target.
- **Safe area insets**: `@supports (padding: max(0px))` with `env(safe-area-inset-*)` for notched
  iPhones. Small but important for mobile-first.
- **Tabular numerals**: `font-variant-numeric: tabular-nums` on the online counter prevents layout
  shift when digits change.
- **Header grid**: `grid-template-columns: 1fr auto 1fr` centers the online count regardless of
  filter button width.
- **CSS sibling combinators for state**: `.end-chat-overlay.show ~ .local-cam { opacity: 0 }` hides
  elements via CSS when overlays show, no JS needed. DOM was structured to enable this.
- **Session exclusion server-side only**: Frontend sends session ID, backend tracks exclusions.
  Can't trust the client. Port to Redis `SADD`/`SISMEMBER`/`EXPIRE`.

### Patterns to Avoid (Proven Bad)
- **No retry logic anywhere**: One fetch attempt, then hardcoded fallback URL. Our rebuild: retry
  once after 1s, then show "having trouble" message.
- **Synchronous emergency refetch**: Both plugins block user requests for 8-32s if cache is empty.
  Our rebuild: background cron is the ONLY thing that fetches from Chaturbate. If cache is empty,
  return 503. Never block user requests on upstream calls.
- **Fake online counter**: Random 22k-25k with drift. The animation technique (cubic ease-out via
  requestAnimationFrame) is good — keep the animation, feed it real data.
- **Double event binding**: Two code blocks bind click handlers to the same buttons. Every click
  fires twice. Analytics would double-count. Single binding in our rebuild.
- **Append-only CSS**: Same selectors declared 3-5 times with escalating `!important`. ~2,500 lines
  that could be ~600. Our rebuild: one declaration per selector, CSS custom properties, zero `!important`.
- **Desktop-first breakpoints**: All `max-width` queries. Our rebuild: mobile-first with `min-width`.
- **Z-index chaos**: Values from -1 to 5000 with arbitrary gaps. Our rebuild: clean scale
  (1-10 content, 100 header, 200 overlays, 500 modals, 1000 start screen).
- **Expensive animations running always**: `box-shadow` and `filter: drop-shadow()` animations
  cause repaints every frame. 200%×200% pseudo-element rotating behind start screen.
  Our rebuild: only animate `transform` and `opacity` (GPU-composited).
- **`pickEmbed` Swiss-army parser**: Handles 10+ response shapes because the API format was
  untrusted. Since we control the API response shape in our Fastify backend, simplify to 5 lines.
- **Session ID never rotates**: Exclusion list grows unbounded during long sessions. Our rebuild:
  rotate session ID after 100 performers or 30 minutes (whichever first).

### Plugin Merge Strategy (v2.0 + v3.0 → Fastify/Redis)
**From v2.0 (wr-pool-matcher):**
- Larger pools (400/240/160/140/160 vs v3.0's 200/150/100/80/100)
- Multi-attempt fetch with random offsets 50-2500 (up to 4 attempts per pool)
- General-to-specific top-up (borrow matching-gender from general pool)
- Quality-weighted top-quartile selection (sort by viewers, pick from top 25%)
- HTTP status code checking (v3.0 doesn't check)
- Custom User-Agent header

**From v3.0 (xcam-cached-pool):**
- Session exclusion via stored lists (port to Redis Sets)
- Minimum viewer threshold (num_users >= 1, raise to 5+)
- OOP class structure (maps to ES modules)
- Centralized response formatting

**New in Fastify rebuild:**
- Rate limiting on all endpoints (`@fastify/rate-limit`)
- Background-only refresh (never block user requests on upstream calls)
- Redis-native atomic operations (SADD, SISMEMBER, SET with EX)
- Parallelized upstream fetches (`Promise.all()` for speed)
- Proper health/metrics endpoint (cache age, pool sizes, error counts)
- Input validation via Fastify JSON schemas
- CORS configuration
- Staleness detection (compare `fetched_at` vs now, surface to clients)
- Session ID validation (length limit, character whitelist)

### Security Fixes Required
- Rate limit all API endpoints (original had zero rate limiting)
- Validate session ID parameter (original accepted any string, enabling storage DoS)
- Never expose raw pool data publicly (v2.0's `/list` and `/_diag` leaked everything)
- Check HTTP status codes on upstream responses (v3.0 didn't)
- Move affiliate constants to environment variables (not hardcoded)
- Add CORS headers (original relied on WordPress defaults)

---

## Performance Targets (from UX research)

| Metric | Target | Why |
|---|---|---|
| Time to first stream playing | < 2 seconds | 53% of mobile users leave if > 3s |
| Swipe-to-next-stream latency | < 1 second perceived | Pre-buffer next 1-2 streams |
| Initial page weight | < 500KB | Defer non-critical JS |
| LCP (Largest Contentful Paint) | < 2.5 seconds | Google Core Web Vitals threshold |
| Swipe animation | 300-400ms spring | TikTok-standard snappiness |
| Animation frame rate | 60fps minimum | Only animate transform + opacity |
| Overlay auto-hide | 5 seconds inactivity | Don't cover live video |
| Content page load (model/blog) | < 2 seconds | Pre-rendered static HTML via nginx |

Key benchmarks: Each additional second of load time drops conversion by 4.42%.
Bounce probability: +32% at 3s, +90% at 5s, +123% at 10s. A 0.1s improvement in
mobile speed reduces bounce by 8.3%. Sites loading < 2s see 9% average bounce rate.

Mobile traffic in this vertical: ~95%+ (Pornhub reports 96% mobile).

## Design Principles

1. **Mobile-first** — 95%+ of traffic is mobile, design for phones first
2. **Speed over polish** — fast transitions beat pretty animations
3. **No fake elements** — real data, honest UI
4. **Everything configurable** — ad slots, CTAs, colors, algorithm tuning — all in dashboard
5. **Well-commented code** — every file, every function, clear purpose
6. **Git versioned** — commit working states, test before changing
7. **Modular** — each JS/CSS file has one job, each service has one responsibility
8. **SEO-native** — content pages are pre-rendered HTML with full meta/schema from day one
9. **Future-proof** — shared types, embed utilities, analytics designed for both roulette and content engine
10. **Retention-first** — design for repeat visits, not just single-session conversion
11. **Single CTA per screen** — never show competing CTAs simultaneously (+266% conversion)
12. **Behavioral timing** — surface prompts at peak engagement, not on timers

---

## Research & Design Workflow

### Research Process
Research prompts live in `researches/todo/`, results in `researches/results/`.
Claude Code writes prompts → Victor runs them through ChatGPT/Claude web → results pasted back.

**Round 1 (Design Phase — COMPLETED):**
- 01: TikTok-style video UX (psychology, gestures, transitions)
- 02: Adult entertainment UX & conversion patterns
- 03: Similar projects & visual inspiration
- Synthesis: `researches/results/research-synthesis.md` (635 lines — the design playbook)

**Round 2 (Build Phase):**
- 04: Personalization & recommendation systems — **COMPLETE** (`researches/results/04-personalization-recommendation.md`)
- 05: Iframe/embed performance on mobile — **COMPLETE** (`researches/results/5th.md`)
- 06: Analytics event design & A/B testing — **COMPLETE** (`researches/results/analytics-research.md`)

### Lovable Visual Design
Lovable AI generates the visual UI foundation from detailed specs. We build the real
frontend on top of its design language — extracting CSS variables, component patterns,
and layout decisions.

**Prompt 1** (`lovable/01-roulette-app.md`): Age gate, start screen, roulette overlay
with all overlays (top bar, right-side actions, bottom info, CTA), gender filter bottom
sheet, performer quick profile panel, responsive design, micro-interactions. **BUILT.**

**Prompt 2** (`lovable/02-content-pages.md`): Model profile page, blog post page, blog
listing/category hub, shared navigation (navbar + footer), brand cohesion. **In progress.**

**After Lovable delivers:** Review output → extract design system (CSS variables, component
patterns) → verify against research specs → build real frontend using the visual language.
Small adjustments done in code here; fundamental direction changes go back to Lovable.

### Design System Reference (from Research Synthesis)
Full design tokens are in `researches/results/research-synthesis.md`. Key values:

**Color palette:** `#000000` base, `#FE2C55` primary accent (TikTok hot pink), `#00F0FF`
secondary (electric cyan), `#FFD740` gold, `#BB86FC` purple, `#00F891` success/online.
60-30-10 rule: 60% dark background, 30% surface colors, 10% accent.

**Typography:** Inter font. Username 15-17px bold, description 13-14px regular, CTA 15-16px
bold ALL-CAPS, tags 11px medium ALL-CAPS. Text shadow on all overlay text.
`font-variant-numeric: tabular-nums` on all counters.

**Icons:** Outlined default, filled on active. 32-36px visual size, 48px touch target.
Phosphor Icons or Lucide.

**Shapes:** Overlay cards 20-24px squircle, buttons 12-14px, CTAs full pill, avatars circle.

**Glassmorphism:** `rgba(0,0,0,0.6)` background + `backdrop-filter: blur(20px)` +
`1px solid rgba(255,255,255,0.08)` border.

**All colors stored as CSS custom properties** for future dashboard control.

---

## What Is NOT in Scope (Yet)

- SEO content engine implementation (architecture documented above, build after roulette)
- User accounts / login system (Phase 3 of personalization)
- Real chat functionality (roulette has no chat — that's the white label's job)
- Email collection / invite gating (removed — direct conversion only)
- Multiple site support in dashboard (start with single site, extract later)

### Future: Agentic Automation (Phase 4+)
Full brainstorm in `assistant/agentic-approach-brainstorm.txt`. Not building any of this
until the core platform has real users and real data. Summary of what's worth building later:

**High value, build first (after platform is live):**
- **Pool health monitor** — adaptive refresh rates, circuit breaker, anomaly detection,
  alert only on critical failures. (Note: basic retry/fallback is already in the backend
  build plan — this extends it with intelligence.)
- **User behavior analysis** — auto-generate weekly engagement reports from analytics data,
  A/B test significance calculations, identify high-value user segments
- **Content quality agent** — auto-score generated articles (word count, uniqueness, SEO,
  readability), auto-approve >85, flag <70 for regeneration, learn from what ranks

**Medium value, build second:**
- **Personalization tuning** — A/B test scoring formulas, auto-adjust weights based on
  engagement metrics, roll back if engagement drops
- **SEO performance monitor** — track rankings, detect drops early, identify quick wins
  (page 2 → page 1), weekly health summary
- **Model status monitor** — daily check all models active/inactive, update pages, discover
  trending models, archive stale ones

**Build much later or never:**
- Orchestrator/meta-agent — don't build until you have agents worth orchestrating
- Documentation agent — low value, manual is fine at this scale
- Full CI/CD agent — GitHub Actions is simpler and proven

**Key principles:** Start simple (one agent at a time), measure ROI before building,
Victor must be able to pause/override any agent, agents failing must never break core system.

---

## Build Order

1. ~~**Backend API scaffold**~~ ✓ — Fastify server, pool fetcher, Redis cache, session exclusion, routes
2. ~~**Research Round 1 + Lovable design specs**~~ ✓ — 3 researches + synthesis + 2 Lovable prompts
3. ~~**Lovable visual design**~~ ✓ — Prompt 1 built, output in `lovable/velvet-stream-main/`
4. ~~**Research Round 2**~~ ✓ — All 3 researches complete (04, 05, 06)
5. ~~**Phase 0: Move Lovable into monorepo**~~ ✓ — React SPA in `packages/frontend/` (Vite + Tailwind)
6. ~~**Phase 1: Fix Lovable gaps**~~ ✓ — Swipe threshold, overlay auto-hide, double-tap hint, panel dismissals, green dot, legal links
7. ~~**Phase 2: Wire frontend to real API**~~ ✓ — Service layer, API-connected roulette, real online count, gender filter, CTA links, config route
8. ~~**Phase 3: Real video**~~ ✓ — Dual iframe system (iframe-manager.ts), preloading, opacity crossfade, thumbnail overlay, click-blocker, iOS/Android detection, visibilitychange cleanup
9. ~~**Phase 4: Analytics**~~ ✓ — 15 event types, batch EventTracker (flushes every 30s), MySQL batch INSERT persistence with memory fallback, watch timer
10. ~~**Phase 5: Personalization**~~ ✓ — Client-side brain (brain.ts), tag preference vector, exponential decay, alpha ramping, boredom detection, backend pool-matcher with blended scoring, first-like feedback toast
11. ~~**Phase 6: Deployment**~~ ✓ — PM2 ecosystem.config.cjs, nginx.conf, deploy.sh, CORS restriction, JSON production logging
12. ~~**Phase 7: A/B testing**~~ ✓ — Variant assignment (localStorage), two-proportion Z-test significance calculator, 2 running tests (start_screen, cta_copy), config-driven
13. ~~**Phase 8: CTA timing**~~ ✓ — Engagement-based CTA progression (6 phases: hidden→soft→curiosity→first→pressure→direct), dynamic gender-aware copy, session timer
14. ~~**Phase 9: Tests**~~ ✓ — 17 unit tests (cta-timing, pool-matcher), health check script, vitest setup
15. ~~**Dashboard MVP**~~ ✓ — PHP admin panel at `/admin/`, session auth, analytics overview (KPI cards, funnel, devices, session depth), A/B test management (create/start/pause/complete/delete from browser), per-variant significance with plain-English recommendations, top performers, conversions, 6 A/B tests wired up (start_screen, cta_copy, cta_delay, gender_default, overlay_timeout, swipe_hint), auto-refresh 60s
16. **Content engine** — Model pages, blog posts, static HTML generation

---

## Local Development

### Prerequisites
- Node.js 20+ LTS
- No Redis or MySQL required (both have in-memory fallbacks)

### Quick Start
```bash
# Install dependencies (from repo root)
npm install

# Terminal 1: Start API server (port 3001)
cd packages/api
npm run dev
# → Fetches 1000+ real performers from Chaturbate on startup
# → Falls back to MemoryStore if no Redis installed

# Terminal 2: Start frontend dev server (port 5173)
cd packages/frontend
npm run dev
# → Vite proxies /api/* to localhost:3001
```

### Environment
API reads from `packages/api/.env` (already created for local dev):
```
PORT=3001
CB_API_URL=https://chaturbate.com/api/public/affiliates/onlinerooms/
CB_API_TOKEN=          # Not needed — public API uses wm param
AFFILIATE_CAMPAIGN=roGHG
AFFILIATE_TOUR=9oGW
AFFILIATE_TRACK=xcamvip-roulette
REDIS_URL=redis://localhost:6379
MYSQL_HOST=localhost
MYSQL_PASSWORD=        # Empty = MySQL disabled, events buffer in memory
```

### Key URLs (Local Dev)
- Frontend: `http://localhost:5173`
- API health: `http://localhost:3001/api/health`
- Pool stats: `http://localhost:3001/api/pool/stats`
- Embed test page: `http://localhost:5173/test-embed.html`

### Key URLs (Production — xcam.vip)
- Site: `https://xcam.vip`
- Pool next: `https://xcam.vip/api/pool-next.php?session_id=xxx&gender=f`
- Stats: `https://xcam.vip/api/stats.php?key=STATS_KEY`
- Embed test: `https://xcam.vip/test-embed.html`

### Multi-Domain Deployment
The same codebase runs on multiple domains. Each domain gets its own `_config.php` (affiliate track, DB creds, CORS, whitelabel domain) and separate MySQL database. See `docs/multi-domain-setup.md` for complete setup instructions.

---

## Development Workflow

1. Read CLAUDE.md at start of every session
2. Check `.claude/projects/` memory files for session-specific notes
3. Run health checks + tests before making changes
4. Commit to git before any breaking changes
5. Test on mobile viewport first
6. Update CLAUDE.md and memory files after significant decisions or changes
