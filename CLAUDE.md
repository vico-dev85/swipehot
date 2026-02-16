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

## SEO Content Engine — Technical Specification

### Vision
Transform xcam.vip from a single-page roulette into a full content site with
thousands of indexable pages, all driving organic Google traffic back to the
roulette and the white label.

### Two Content Types

**Model Profile Pages** (`/models/{username}`)
- AI-generated bio/content (300–500 words, SEO-optimized)
- Live Chaturbate embed when model is online (using same embed system as roulette)
- "Offline" state: CTA + similar models + "get notified when online"
- Tags, categories, viewer stats from Chaturbate API
- Related models section (auto-linking, dynamic)

**Blog Posts** (`/blog/{keyword-slug}`)
- AI-generated strategic articles (1,500–2,500 words)
- Target general keywords: "best latina cams", "chaturbate guide", "free tokens"
- Heavy internal linking to model pages
- Research-driven: analyze competing articles before writing

### Database Schema (WordPress MySQL)

```sql
-- Model profile pages (generated content + metadata)
CREATE TABLE wp_xcam_models (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(100) UNIQUE NOT NULL,
    chaturbate_username VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    bio TEXT,
    categories JSON,          -- ["latina", "interactive", "toys"]
    tags JSON,                -- ["bigboobs", "lovense", "squirt"]
    status ENUM('pending', 'active', 'inactive', 'removed') DEFAULT 'pending',
    is_currently_online TINYINT(1) DEFAULT 0,
    last_online_at DATETIME NULL,
    num_followers INT DEFAULT 0,
    wordpress_post_id BIGINT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_categories ((CAST(categories AS CHAR(500)))),
    INDEX idx_online (is_currently_online)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Keywords to process (both model names and general SEO keywords)
CREATE TABLE wp_xcam_keywords (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    type ENUM('model_name', 'general') NOT NULL,
    priority INT DEFAULT 0,               -- higher = process first
    status ENUM('pending', 'processing', 'completed', 'skipped', 'failed') DEFAULT 'pending',
    error_message TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    INDEX idx_queue (status, type, priority DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Generated blog posts
CREATE TABLE wp_xcam_blog_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    keyword_id BIGINT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    content LONGTEXT,
    linked_models JSON,                   -- ["miarose", "sophiasmith", "bella"]
    word_count INT DEFAULT 0,
    internal_link_count INT DEFAULT 0,
    wordpress_post_id BIGINT NULL,
    status ENUM('draft', 'published', 'failed') DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (keyword_id) REFERENCES wp_xcam_keywords(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Knowledge base entries (the "brain" — platform info, SEO rules, templates)
CREATE TABLE wp_xcam_knowledge_base (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    category ENUM('platform_features', 'seo_strategy', 'content_templates', 'model_page_guide', 'blog_post_guide'),
    tags JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pipeline run logs (every generation attempt)
CREATE TABLE wp_xcam_pipeline_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    content_type ENUM('model_page', 'blog_post') NOT NULL,
    keyword VARCHAR(255),
    success TINYINT(1) DEFAULT 0,
    quality_score INT NULL,               -- 0-100
    error_message TEXT NULL,
    retry_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_date (content_type, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Note: the roulette's `wp_wr_signals` table (defined in Analytics section) is separate
but feeds into content prioritization — most-engaged tags = generate those model pages first.

### CLI Commands

The content engine is a standalone TypeScript pipeline (not a WordPress plugin).
Could reuse the VideoDate.VIP pipeline pattern (TypeScript + Claude API).

```bash
# --- Setup & Seeding ---

# Initialize knowledge base with platform info, templates, SEO rules
npx tsx src/cli/index.ts seed-brain --site xcam

# Import model name keywords from CSV (priority by follower count if available)
npx tsx src/cli/index.ts seed-keywords --file models.csv --type model_name

# Import general SEO keywords
npx tsx src/cli/index.ts seed-keywords --file general-keywords.csv --type general

# --- Content Generation ---

# Generate next N model pages (highest priority pending keywords)
npx tsx src/cli/index.ts generate --type model_page --count 20

# Generate next N blog posts
npx tsx src/cli/index.ts generate --type blog_post --count 5

# Generate one specific model page
npx tsx src/cli/index.ts generate --type model_page --keyword miarose

# --- Monitoring ---

# Check online status for all active models (run daily via cron)
npx tsx src/cli/index.ts check-status --all

# List keyword queue
npx tsx src/cli/index.ts list-keywords --status pending --type model_name

# List published content
npx tsx src/cli/index.ts list-models --status active
npx tsx src/cli/index.ts list-posts --status published

# Rebuild internal links across all published content
npx tsx src/cli/index.ts update-links
```

### Model Page Generation Pipeline

```
Step 1: KEYWORD SELECTION
  Pull next model_name from wp_xcam_keywords
  WHERE status='pending' AND type='model_name'
  ORDER BY priority DESC
  Mark as 'processing'

Step 2: MODEL VALIDATION
  Check if model exists on Chaturbate (via pool API or direct CB API)
  Pull public data: categories, tags, follower count, online status
  If model doesn't exist or is permanently gone → mark keyword 'skipped'

Step 3: BRAIN CONTEXT
  Query wp_xcam_knowledge_base for entries matching:
  ['platform_features', 'model_page_guide', 'seo_strategy']
  This gives the AI writer context about tone, structure, SEO rules

Step 4: CONTENT GENERATION (Claude API)
  System prompt includes: model data, brain context, SEO guidelines
  Generate 400-500 words covering:
  - Engaging bio with personality
  - What makes her shows unique
  - Streaming style / specialties
  - Why viewers enjoy her content
  Must feel natural, not templated or spammy

Step 5: VALIDATION
  - Word count: 300–600 (reject outside range)
  - Has proper H1 + at least 2 H2s
  - Model name appears 3–5 times naturally (not stuffed)
  - Meta description: 120–160 characters
  - Uniqueness: < 30% similarity to any existing model page
  - If fails: retry with improved prompt (max 2 retries)
  - If still fails: mark 'failed', flag for manual review

Step 6: RELATED MODELS
  Query wp_xcam_models for 5-8 models with overlapping categories
  WHERE status='active' AND model_name != current
  ORDER by overlap count DESC, num_followers DESC

Step 7: PUBLISH TO WORDPRESS
  POST /wp-json/wp/v2/model_pages (custom post type)
  Include: title, content HTML, meta fields (model_name, categories, related_models)
  Status: publish

Step 8: UPDATE DATABASE
  Insert/update wp_xcam_models with all metadata
  Update wp_xcam_keywords status='completed'
  Log in wp_xcam_pipeline_runs with quality_score
```

### Blog Post Generation Pipeline

```
Step 1: KEYWORD SELECTION
  Pull from wp_xcam_keywords WHERE type='general' AND status='pending'

Step 2: WEB RESEARCH (recommended)
  Search Google for the keyword
  Analyze top 3 competing articles: word count, headings, topics covered, gaps
  Identify what we can do better or differently

Step 3: BRAIN CONTEXT
  Platform knowledge + SEO rules + list of available model pages to link to

Step 4: STRATEGIC PLANNING (Claude API — separate call)
  AI generates a JSON plan before writing:
  {
    "title": "Top 10 Latina Cam Models on Chaturbate 2026",
    "word_count_target": 2000,
    "sections": ["Introduction", "What Makes a Great...", "Top 10 List", "How to Choose", "Conclusion"],
    "models_to_feature": ["miarose", "sophia", "bella", ...],
    "internal_link_target": 12
  }

Step 5: CONTENT GENERATION (Claude API — main call)
  Write full article following the plan
  Natural language, unique insights, not just a list

Step 6: INTERNAL LINK INJECTION
  Identify model mentions in text
  Convert to links: <a href="/models/miarose">Watch MiaRose live</a>
  Vary anchor text: model name, "see her room", "popular latina model", etc.
  Cap: ~1 link per 100 words

Step 7: VALIDATION
  - 1,500+ words
  - 10+ internal links to model pages
  - Proper heading hierarchy (H1 → H2 → H3)
  - Unique content (not rehash of existing posts)
  - If fails: retry or flag for review

Step 8: PUBLISH + UPDATE DB
  POST /wp-json/wp/v2/posts with category and tag IDs
  Log in wp_xcam_pipeline_runs
```

### WordPress Integration

**Custom Post Type for Model Pages:**
Register `model_page` post type in a WordPress plugin with:
- Public, REST API enabled (`show_in_rest = true`)
- Rewrite slug: `models` → URLs become `/models/miarose`
- Supports: title, editor, custom-fields, thumbnail
- Custom meta fields: `model_name`, `chaturbate_username`, `categories`, `related_models`

**Authentication:**
Content engine publishes via WP REST API using JWT authentication.
- Install JWT Authentication plugin on WordPress
- Create a service account for the content engine
- Store token in `.env`: `WORDPRESS_JWT_TOKEN=...`
- All publish requests include `Authorization: Bearer {token}`

**Model Online Status:**
Model pages check online status via the roulette's existing pool API:
- `GET /wp-json/wr-pool/v1/list?pool=general` — search cached rooms by username
- If found in cache → online, show live embed
- If not found → offline, show "Watch Similar Models" CTA linking to roulette
- No additional Chaturbate API calls needed

**Daily Inactive Check (cron job):**
- Query all wp_xcam_models WHERE status='active'
- Cross-reference with pool data
- If not seen online for 30+ days: mark status='inactive', set WP post to draft
- Keep page URL reserved (may come back online)

### Internal Linking System

**Hybrid approach: static links in blog posts, dynamic links on model pages.**

**Blog Posts (static):**
- Links are baked into HTML at generation time
- "Top 10 Latina Models" permanently links to those 10 model pages
- Won't auto-update, but these are evergreen articles that get periodic refreshes

**Model Pages (dynamic):**
- "Similar Models" section queries DB on page load
- PHP template queries wp_xcam_models for overlapping categories
- As new models are added, existing pages automatically show them
- Bidirectional: adding MiaRose → she appears on SophiaSmith's page and vice versa

**Category Hub Pages** (auto-generated):
- `/latina-cams`, `/asian-cams`, `/teen-cams`, etc.
- Query: all active models with matching category, ordered by followers
- Auto-update as models are added/removed

**Link Density Rules:**
- Blog posts: ~1 internal link per 100 words (2,000 word post ≈ 15-20 links)
- Model pages: 5–8 related model links in sidebar/bottom section
- Anchor text must vary (AI-generated, not repetitive "click here")
- Never link to inactive/removed models

### Content Quality Standards

**Model Page Requirements:**
- 300–600 words (sweet spot: 400–500)
- Unique content: < 30% similarity to other model pages
- Proper HTML: H1 (model name), at least 2 H2s, paragraphs
- Model name appears 3–5 times naturally
- Categories and tags mentioned in content
- Meta description: 120–160 characters
- No keyword stuffing, no spammy language

**Blog Post Requirements:**
- 1,500+ words (target: 2,000)
- 10+ internal links to model pages
- Proper heading hierarchy
- Unique angle vs competing articles
- Comparison tables where applicable
- Natural keyword usage throughout

**Auto-Reject + Retry:**
If validation fails → regenerate with improved prompt (max 2 retries).
If still fails → mark as 'failed' in pipeline_runs, flag for manual review.
Track success rates per content type in pipeline_runs table.

### SEO Risk Management

**Thin Content Prevention:**
- Minimum 300 words per model page (enforced by validator)
- Each page has a unique angle, not just template fill-in
- Vary writing style and structure across pages
- Include unique sections per model: specialties, streaming style, viewer experience

**Duplicate Content Prevention:**
- Similarity check before publishing (compare against all existing pages)
- Reject if > 30% match with any existing page
- Use different sentence structures and vocabulary per category
- Blog posts must have unique research/insights, not just rehashed lists

**Over-Optimization Prevention:**
- Model name max 5 times per 400 words
- Internal links feel natural, contextual — not forced
- Varied anchor text (AI generates options, not repeated phrases)
- Link density cap enforced by validator

**Gradual Indexing Strategy (critical):**
Do NOT generate 1,000 pages and submit all at once.
```
Week 1:  Generate 20 model pages → submit to Search Console → monitor
Week 2:  If no issues, generate 50 more
Week 3:  Scale to 100 if indexing healthy
Week 4:  Monitor for penalties, thin content warnings
Month 2: Begin blog posts (10 initially)
Month 3: Scale based on results — if ranking well, accelerate
```
Monitor Google Search Console weekly for: indexing errors, manual actions,
coverage drops, thin content warnings.

**Quality Signals to Maintain:**
- Page load < 2 seconds (even with live embed)
- Mobile-optimized (same responsive approach as roulette)
- Valid HTML, proper schema markup
- Real user engagement (time on page from live embeds)

### Implementation Phases

**Phase 1 — MVP: Validate the Concept (Week 1-2)**
Goal: Prove model pages can get indexed and drive traffic.
- [ ] Create MySQL tables
- [ ] Build basic CLI: seed-keywords, generate (model_page only), list
- [ ] Model page generator with Claude API
- [ ] WordPress custom post type + publishing integration
- [ ] Simple related models (manual list initially)
- [ ] Import 50 model keywords, generate 20 pages, publish
- [ ] Submit to Search Console
- Success: 5+ pages indexed within 2 weeks, no penalties

**Phase 2 — Scale Model Pages (Week 3-4)**
Goal: Prove it scales without quality degradation.
- [ ] Quality validation system (uniqueness check, word count, structure)
- [ ] Dynamic related models query (auto-linking)
- [ ] Online/offline status on model pages
- [ ] Daily status check cron job
- [ ] Generate 100 more model pages
- Success: 50+ indexed, 10+ ranking top 50 for model names

**Phase 3 — Blog Content (Month 2)**
Goal: Capture general keywords with long-form content.
- [ ] Web research layer (analyze competing articles)
- [ ] Blog post generator with strategic planning step
- [ ] Internal link injection system
- [ ] Category hub pages
- [ ] Generate 10 blog posts linking to 100+ model pages
- Success: Blog posts indexed, organic traffic increases 20%+

**Phase 4 — Optimize & Automate (Month 3+)**
Goal: Reduce manual work, run on autopilot.
- [ ] Auto-quality approval for high-scoring content
- [ ] Automated keyword research (trending models, seasonal topics)
- [ ] Link optimization agent (identify weak clusters, rebalance)
- [ ] Scale to 500+ model pages, 50+ blog posts
- [ ] Potential: fully agentic orchestrator that manages the pipeline autonomously

### How the Content Engine Connects to the Roulette

- **Shared pool data** — model pages use the same cached API data for online status
- **Shared embed system** — same iframe embed code, same affiliate params
- **Shared analytics** — same event tracking on model pages
- **Roulette feeds SEO priorities** — most-engaged tags from wp_wr_signals = generate those model pages first
- **Model pages feed the roulette** — "model is offline → watch similar on roulette"
- **Category hubs link to roulette** — "Can't decide? Try our random cam roulette"

### What the Roulette Build Must Account for Now
1. Pool data accessible via clean REST API (not locked inside roulette JS)
2. Embed URL construction is a shared utility function (not hardcoded)
3. Analytics events are generic enough to work on any page type
4. Dashboard has a "content engine" config section ready to expand
5. WordPress has the custom post type plugin ready even before content engine ships

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
