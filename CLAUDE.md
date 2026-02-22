# Live Cam Roulette Platform

## What This Is

TikTok-style live cam roulette. Shows random live Chaturbate performers full-screen, muted. Users swipe through fast; when they want sound/chat/room they click through to the white label. Revenue = Chaturbate affiliate commissions.

Custom-built: TypeScript monorepo, React SPA roulette, PHP production API, static HTML content pages (SEO), PHP admin dashboard, TypeScript CLI content engine. All on nginx/FastPanel dedicated server.

**Brand: SwipeHot** — deploying to **swipe.hot**. White-label architecture — only `.env` and `_config.php` change per domain.

| Domain | Role |
|---|---|
| **swipe.hot** | Roulette app, API, content pages, dashboard |
| **www.swipe.hot** | Chaturbate white label — registration, rooms, embeds |

---

## Affiliate Config

| Key | Value |
|---|---|
| Campaign | `roGHG` |
| Tour | `9oGW` |
| Track | `swipehot-roulette` |
| Embed | `https://{whitelabelDomain}/embed/{username}/?campaign=roGHG&tour=9oGW&track={track}&disable_sound=1&embed_video_only=1&mobileRedirect=auto&sid={session_id}_{username}` |
| CTA (room) | `https://chaturbate.com/in/?tour=9oGW&campaign=roGHG&track={track}&room={username}` |

**CRITICAL:** `/embed/{username}/` = embeddable iframe src (200). `/in/` = 302 redirect — NEVER use in iframes. Always use white label domain for embeds.

---

## Chaturbate API

```
GET https://chaturbate.com/api/public/affiliates/onlinerooms/?wm=roGHG&format=json&limit=500
```

Params: `wm` (required), `client_ip`, `limit` (1-500), `offset` (0-2500+), `gender` (f/m/t/c), `tag`

Key room fields: `tags[]`, `gender`, `num_users`, `num_followers`, `is_hd`, `age`, `seconds_online`, `room_subject`, `image_url`, `display_name`, `slug`, `spoken_languages`, `country`

Limitations: `tag` param = AND only (no OR); no similar rooms API; poll-only (no events); online rooms only.

---

## Tech Stack

| Layer | Tech |
|---|---|
| **Roulette** | React SPA (Vite + TypeScript + Tailwind + Framer Motion) |
| **Production API** | PHP 7.4+ on FastPanel (files in web root, no Node needed) |
| **Dev API** | Fastify + TypeScript (port 3001, Redis/memory fallback) |
| **Database** | MySQL 8+ (events, stats, config — separate DB per domain) |
| **Cache** | File-based JSON (90s TTL in `sys_get_temp_dir()`) |
| **Dashboard** | PHP admin panel at `/admin/` |
| **Content Engine** | TypeScript CLI (AI content generation, HTML rendering) |
| **Web Server** | nginx + FastPanel, SSL via Let's Encrypt |

**Local dev:** Node.js 20+ only. No Redis or MySQL required (both have fallbacks).

---

## Monorepo Structure

```
xcamvip/
├── CLAUDE.md
├── packages/
│   ├── frontend/                   ← React SPA roulette + static content
│   │   ├── src/
│   │   │   ├── pages/Index.tsx     ← Screen state machine (age-gate → splash → roulette)
│   │   │   ├── components/
│   │   │   │   ├── RouletteView.tsx ← Main roulette (API, preloading, gestures, A/B tests)
│   │   │   │   ├── TopBar.tsx      ← Gender filter + viewer count
│   │   │   │   ├── ActionStack.tsx ← Right-rail TikTok actions
│   │   │   │   └── ...            ← AgeGate, StartScreen, GenderFilterSheet, etc.
│   │   │   └── services/
│   │   │       ├── api.ts          ← fetchNextPerformer, fetchPoolStats, fetchConfig
│   │   │       ├── iframe-manager.ts ← Dual iframe preload/crossfade system
│   │   │       ├── brain.ts        ← Client personalization (30-dim tag vector, gender weights)
│   │   │       ├── tracker.ts      ← EventTracker (batch queue, 30s flush)
│   │   │       ├── ab.ts           ← A/B variant assignment + significance
│   │   │       ├── cta-timing.ts   ← 6-phase engagement-based CTA progression
│   │   │       ├── sounds.ts       ← Web Audio API UI sounds
│   │   │       └── session.ts      ← Session/visitor ID management
│   │   └── public/
│   │       ├── api/                ← Production PHP API
│   │       │   ├── _config.php     ← Domain-specific config (only file to edit per domain)
│   │       │   ├── _db.php         ← MySQL PDO + auto-create tables
│   │       │   ├── _pool.php       ← CB API fetch, caching, scoring, personalized selection
│   │       │   ├── pool-next.php   ← GET next unseen performer
│   │       │   ├── events.php      ← POST analytics events
│   │       │   ├── stats.php       ← GET analytics summary
│   │       │   ├── config.php      ← GET public frontend config
│   │       │   ├── vote.php        ← POST listicle upvotes
│   │       │   └── postback.php    ← CB conversion postback receiver
│   │       ├── admin/              ← Dashboard PHP files
│   │       ├── models/             ← Pre-rendered model page HTML
│   │       └── blog/               ← Pre-rendered blog post HTML
│   │
│   ├── content-engine/             ← SEO content generator (TypeScript CLI)
│   │   ├── src/
│   │   │   ├── cli/index.ts        ← 11 CLI commands (see Content Engine section)
│   │   │   ├── config.ts           ← Multi-provider AI config (ArliAI/Claude/OpenAI)
│   │   │   ├── db.ts               ← MySQL + 6 auto-created tables
│   │   │   ├── categories.ts       ← 22 category definitions + tag matching
│   │   │   ├── generators/model-page.ts  ← Model page pipeline (9 steps)
│   │   │   ├── generators/blog-post.ts   ← Blog pipeline (10 steps, retry logic)
│   │   │   ├── builders/listicle-builder.ts ← Category hub page builder
│   │   │   ├── services/chaturbate.ts    ← CB API client, screenshot download
│   │   │   ├── services/claude.ts        ← AI generation (12 angles, 3 providers)
│   │   │   ├── services/scoring.ts       ← Listicle ranking (viewers + votes + freshness)
│   │   │   ├── renderer/{html,blog,listicle}.ts ← Template renderers
│   │   │   ├── validators/{content,blog-content}.ts ← Quality checks
│   │   │   ├── seo/{meta,schema,sitemap}.ts ← SEO infrastructure
│   │   │   └── blog/{blog-types,blog-prompts,link-injector}.ts
│   │   ├── templates/              ← model-page.html, blog-post.html, listicle-page.html
│   │   ├── scripts/                ← cron-light.sh, cron-heavy.sh, process-keywords.py
│   │   └── data/                   ← raw/ (316 keyword files) + processed/ (tiered CSVs)
│   │
│   ├── api/                        ← Fastify dev server (local dev only)
│   └── shared/                     ← Shared types, DB, Redis, embed utils, tag normalization
│
├── docs/                           ← brain-personalization.md, multi-domain-setup.md
├── reference/                      ← Original PHP code for comparison
├── assistant/                      ← Planning docs, notes, research context
└── researches/                     ← 12 completed research papers (todo/ + results/)
```

---

## Production PHP API

Files in `packages/frontend/public/api/`, served directly by nginx + php-fpm.

| Route | Method | Purpose |
|---|---|---|
| `/api/pool-next.php` | GET | Next unseen performer. Params: `session_id`, `gender`, `prefer_tags`, `alpha`, `gender_weights` |
| `/api/events.php` | POST | Log analytics events + upsert daily_visitors |
| `/api/stats.php` | GET | Analytics summary (requires `key` param) |
| `/api/config.php` | GET | Public frontend config (CTA text, A/B tests) |
| `/api/vote.php` | POST | Listicle upvotes (model_username, category_slug, visitor_token) |
| `/api/postback.php` | GET | Chaturbate conversion postback receiver |

**Key details:**
- Seen-set: file-based per session (500 cap → trims to 400, 2h TTL)
- Pool exhaustion: force-deletes cache + re-fetches from CB API
- Synthetic tags: `age_18_22`/`age_23_30`/`age_31_40`/`age_41_plus` + `country_xx`
- Selection: 30% random exploration, 70% blended scoring (alpha * personal + (1-alpha) * popularity), weighted random from top 25%
- Gender weights: parsed from `gender_weights=f:0.8,m:0.05,t:0.1,c:0.05`, multiplied into blended score
- Multi-domain: each domain gets own `_config.php` + separate MySQL DB. See `docs/multi-domain-setup.md`

---

## Personalization Algorithm

**Client brain** (`brain.ts`): 30-dimension tag preference vector in localStorage. After each performer, logs `{tags, gender, watchSeconds, clickedCTA}`. Sends top tags as `prefer_tags` + gender weights to backend.

**Backend scoring** (`_pool.php`):
```
blended = alpha * personalScore + (1 - alpha) * popularityScore
```
- Alpha: 0 → 0.85 over 20 swipes
- 30% exploration (random from full unseen pool) prevents filter bubble
- 70% exploitation: weighted random from top 25% by blended score

**Tag normalization:** ~30 synonym groups in `_pool.php` and `brain.ts` (e.g., `bigboobs: [bigtits, bigbreasts, hugetits, busty]`).

**Synthetic tags:** Age buckets + country codes, weighted 0.7x (validated: ages 18-69, known ISO codes only).

**Gender weights:** Per-gender engagement rate minus skip penalty, 5% floor, unseen = 0.1. Sent when filter = "all".

**Boredom detection:** >70% skip rate in last 10 → increases exploration ratio.

---

## A/B Tests (6 active, all wired)

| Test | Variants | Controls |
|---|---|---|
| `start_screen` | control, instant | Skip splash → straight to roulette |
| `cta_copy` | watch_live, go_live, chat_now | CTA button text |
| `cta_delay` | fast(0.5x), normal(1x), slow(2x) | CTA appearance timing multiplier |
| `gender_default` | all, female | Initial gender filter |
| `overlay_timeout` | fast(3s), normal(5s), slow(8s) | UI auto-hide speed |
| `swipe_hint` | visible, hidden | Swipe hint visibility |

Managed via dashboard → MySQL `ab_tests` table → `config.php` → frontend `ab.ts` (localStorage sticky). Dashboard shows Z-test significance + plain-English recommendations.

---

## Database Schema

**Roulette tables** (auto-created by `_db.php`): `config`, `events`, `ab_tests`, `admins`, `daily_visitors`

**Content engine tables** (auto-created by content-engine `db.ts`): `models`, `keywords`, `pipeline_runs`, `user_votes`, `daily_snapshots`, `page_builds`

Tables auto-create on first request. See `_db.php` and `packages/content-engine/src/db.ts` for full schemas.

---

## Content Engine

### CLI Commands
```bash
# From packages/content-engine/
npx tsx src/cli/index.ts <command>

# Data collection
collect --count 1000 [--screenshots] [--bios]    # Fetch online models, store CB data
seed-from-api --count 500                         # Seed keyword queue from CB API
seed-keywords --file x.csv --type model_name      # Bulk-load keywords

# Content generation
generate --type model_page --count 20             # Generate model pages
generate-blog --slug is-chaturbate-safe           # Generate single blog post
generate-blog-batch --count 5 --provider arli     # Batch blog generation
rebuild-blog-links                                # Re-inject internal links after new pages

# Page building
build-pages [--category asian-cams]               # Build all 22 listicle pages (or one)

# Maintenance
status                                            # Pipeline health dashboard
sitemap                                           # Regenerate sitemap.xml
test-one [--provider claude]                      # Quick test (no DB needed)
```

### AI Providers
| Provider | Model | Cost/page | Use for |
|---|---|---|---|
| ArliAI (default) | Mistral-Small-24B-RPMax | ~$0.006 | NSFW content, bulk |
| Claude | claude-sonnet-4-20250514 | ~$0.02 | Safe content, quality |
| OpenAI | gpt-4o-mini | ~$0.005 | Budget alternative |

### 22 Living Listicle Pages
Category hubs that regenerate every 30 min with fresh model data + community votes:
`asian-cams`(6.6K), `teen-cams`(36K), `ebony-cams`(23K), `indian-cams`(24K), `european-cams`(19K), `big-ass-cams`(11K), `mature-cams`(8.9K), `lesbian-cams`(8.4K), `bdsm-cams`(7.1K), `redhead-cams`(6.9K), `squirt-cams`(6.3K), `busty-cams`(6.1K), `blonde-cams`(5.4K), `feet-cams`(4.5K), `brunette-cams`(4.1K), `bbw-cams`(3.2K), `couple-cams`(2.7K), `anal-cams`(2.4K), `gay-cams`(2.4K), `trans-cams`(1.9K), `latina-cams`(1.6K), `petite-cams`(0.7K)

Combined: ~390K+ monthly search volume. Each hub: scored models, voting UI, schema markup, related links.

### 15 Blog Posts (queue in `blog-types.ts`)
High-ROI guides: token calculator (BUILT), is-chaturbate-safe, payout guide, free tokens, chaturbate review, plus comparison reviews, how-to guides, earnings guides.

### Cron Scripts
- `cron-light.sh` (every 30 min): collect 1000 models + rebuild listicles
- `cron-heavy.sh` (daily 2 AM): collect 1500 + screenshots + bios + rebuild + sitemap

### Content Quality
- Model pages: 300-600 words, <30% similarity, 12 rotating bio angles, 50+ slop phrases filtered
- Blog posts: 1,500+ words, 10+ internal links, FAQ section, proper heading hierarchy
- Auto-reject + retry (max 2), then mark failed for manual review

### White-Label Architecture
All content domain-agnostic via env vars: `SITE_NAME`, `SITE_DOMAIN`, `WHITELABEL_DOMAIN`. Templates use `{{siteName}}` placeholders. AI prompts include site name variable.

---

## SEO Architecture

**URL structure:**
```
/                    → Roulette SPA
/models/{username}   → Pre-rendered model page HTML
/blog/{slug}         → Pre-rendered blog post HTML
/{category}-cams     → Living listicle page (category hub)
/sitemap.xml         → Auto-generated
/admin/              → Dashboard (noindex, robots.txt blocked)
```

Every content page has: meta tags (title, description, OG, Twitter, canonical), JSON-LD schema (ProfilePage/Article/CollectionPage + BreadcrumbList), responsive design, lazy-loaded embeds.

**Strategic priority:** Guides first (authority) → category hubs (pillars) → model pages (spokes). Each keyword = exactly ONE canonical URL (anti-cannibalization).

---

## nginx Config

```nginx
server {
    listen 443 ssl;
    server_name swipe.hot;

    location / { root /path/to/public; try_files $uri $uri/ /index.html; }
    location /models/ { root /path/to/public; try_files $uri $uri/index.html =404; }
    location /blog/ { root /path/to/public; try_files $uri $uri/index.html =404; }
    location ~ ^/([a-z-]+)-cams(/.*)?$ { root /path/to/public; try_files $uri $uri/ /$1-cams/index.html =404; }
    location /admin/ { root /path/to/public; try_files $uri /admin/index.html; }
    location = /sitemap.xml { root /path/to/public; }
    location = /robots.txt { root /path/to/public; }
}
```

---

## Design System

**Colors:** `#000000` base, `#FE2C55` primary (TikTok pink), `#00F0FF` cyan, `#FFD740` gold, `#00F891` online green. 60-30-10 rule. All CSS custom properties.

**Typography:** Inter. Tabular nums on counters. Text shadow on overlays.

**Glassmorphism:** `rgba(0,0,0,0.6)` + `backdrop-filter: blur(20px)` + `1px solid rgba(255,255,255,0.08)`.

**Z-index scale:** 1-10 content, 100 header, 200 overlays, 500 modals, 1000 start screen.

**Animation:** Only `transform` + `opacity` (GPU-composited). Spring physics: stiffness 300, damping 30, 300-400ms.

---

## Key Technical Patterns

**Dual iframe system:** Two permanent iframes, never create/destroy. Recycle via `about:blank` + rAF. `opacity:0` for hiding. Preload next while current plays → instant swipe transitions.

**Click-blocker overlay:** Invisible div over iframes prevents navigation away from affiliate tracking.

**Overflow-crop:** `overflow: hidden` + JS-calculated canvas width = `object-fit: cover` for iframes.

**Session rotation:** Rotate session ID after 100 performers or 30 minutes.

**CTA timing:** 6 phases (hidden → soft → curiosity → first CTA → pressure → direct), behavioral not timer-based. Single CTA per screen (+266% conversion vs competing CTAs).

---

## Local Development

```bash
npm install                          # From repo root
# Terminal 1: API (port 3001)
cd packages/api && npm run dev       # Falls back to MemoryStore if no Redis
# Terminal 2: Frontend (port 5173)
cd packages/frontend && npm run dev  # Vite proxies /api/* to localhost:3001
```

**Content engine:** Needs `.env` with MySQL creds + AI provider key. See `packages/content-engine/.env.example`.

---

## Build Status — ALL CODE COMPLETE

Phases 0-9 (roulette app) ✓ | Dashboard MVP ✓ | Content engine (listicles + blog + model pages) ✓ | 56K keywords processed ✓ | 12 research papers ✓ | Token calculator page ✓

**Next: Deploy to swipe.hot** — point DNS to server, set up .env + _config.php, install Node.js, run `collect` + `build-pages`, configure nginx, set up cron. See `memory/content-engine-plan.md` for full checklist.
