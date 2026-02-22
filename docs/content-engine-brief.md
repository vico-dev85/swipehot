# Content Engine Build Brief

**For: Claude Code agent building the content engine**
**Date: Feb 2026**

Read `CLAUDE.md` first (the full project brain). This doc adds specifics for your task.

---

## Your Scope

Build `packages/content-engine/` — a TypeScript CLI that generates SEO content pages (static HTML) for the platform. **MVP = 20 model profile pages.**

### What you ARE building:
- CLI entry point (`src/cli/index.ts`)
- Model page generation pipeline (fetch CB data → generate bio via Claude API → validate → render HTML → write file)
- HTML template for model pages
- HTML renderer (injects content into template)
- Content validator (word count, structure)
- Sitemap generator
- Meta tag + JSON-LD schema generation
- Database helpers (keywords table, models table, pipeline_runs)

### What you are NOT building (yet):
- Blog post pipeline (Phase 3 — later)
- Category hub pages (later)
- Knowledge base / brain context (later)
- Dashboard integration (later)

### What you must NOT touch:
- `packages/frontend/` — another session is working here
- `packages/frontend/public/api/` — PHP API, don't modify
- `packages/api/` — Fastify dev server, don't modify
- Any `.php` files

---

## CRITICAL: Everything is White-Label / Multi-Domain

The same codebase runs on MULTIPLE domains with different branding. **Nothing is hardcoded — not the domain, not the brand name, not the tagline, not any copy that mentions a specific site.**

This applies to THREE layers:

### 1. URLs (technical)
All URLs (canonical, OG, sitemap, internal links, embed URLs) read from config:
```typescript
const config = {
  siteDomain: process.env.SITE_DOMAIN || 'xcam.vip',
  whitelabelDomain: process.env.WHITELABEL_DOMAIN || 'www.xcam.vip',
  affiliateCampaign: process.env.AFFILIATE_CAMPAIGN || 'roGHG',
  affiliateTour: process.env.AFFILIATE_TOUR || '9oGW',
  affiliateTrack: process.env.AFFILIATE_TRACK || 'xcamvip-roulette',
};
```

### 2. Brand name in content (critical — easy to miss)
The generated bios, meta descriptions, and HTML templates must NEVER contain a hardcoded site name like "XCam", "xcam.vip", "StrangerFlip", etc. Use a config variable:
```typescript
const config = {
  // ...
  siteName: process.env.SITE_NAME || 'XCam',
  siteTagline: process.env.SITE_TAGLINE || 'Live Cam Roulette',
};
```
- **HTML template**: `{{siteName}}` and `{{siteTagline}}` placeholders, never literal brand names
- **Claude API prompts for bio generation**: pass `siteName` as a variable in the prompt, e.g. "Write a bio for this model for a site called {{siteName}}". The AI must use the variable, not invent a site name
- **Meta tags**: `<title>MiaRose Live Cam | {{siteName}}</title>`, never `<title>MiaRose Live Cam | XCam.VIP</title>`
- **CTA buttons**: "Watch on {{siteName}}", not "Watch on XCam"
- **Footer text**: `© ${new Date().getFullYear()} ${config.siteName}`, not `© 2026 XCam`

### 3. AI-generated content (hardest to control)
When calling Claude API to generate model bios:
- The system prompt MUST instruct: "The site is called {siteName}. Only use this name when referring to the platform. Do not invent or use any other site name."
- Validate output: check that the generated text does NOT contain hardcoded strings like "xcam", "XCam.VIP" etc. — only the configured `siteName`
- If the bio mentions the site at all (which is optional), it must use the exact `siteName` from config

### Test for white-label correctness
After generating pages, grep the output HTML files for any hardcoded domain or brand:
```bash
grep -ri "xcam" packages/frontend/public/models/
```
This should return ZERO results (only config-injected values, which will vary per deployment).

---

## Monorepo Conventions

- **Workspaces**: npm workspaces, root `package.json` already includes `packages/content-engine`
- **TypeScript**: ESM (`"type": "module"`), target ES2022, strict mode
- **Package naming**: `@xcamvip/content-engine` (already in placeholder package.json)
- **Shared types**: import from `@xcamvip/shared` (see `packages/shared/src/types.ts`)
- **Run with**: `npx tsx src/cli/index.ts <command>` (no build step needed for CLI)
- **Dependencies**: Add to `packages/content-engine/package.json`, install from repo root with `npm install`

Existing placeholder at `packages/content-engine/package.json`:
```json
{
  "name": "@xcamvip/content-engine",
  "version": "0.1.0",
  "private": true,
  "description": "SEO content generator — TypeScript CLI (placeholder, build later)"
}
```

No `src/` directory exists yet — create everything from scratch.

---

## Database Schema (Already Defined in CLAUDE.md)

The PHP API auto-creates tables. The content engine needs its OWN MySQL connection. Use these tables:

```sql
CREATE TABLE IF NOT EXISTS models (
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
);

CREATE TABLE IF NOT EXISTS keywords (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    type ENUM('model_name', 'general') NOT NULL,
    priority INT DEFAULT 0,
    status ENUM('pending', 'processing', 'completed', 'skipped', 'failed') DEFAULT 'pending',
    error_message TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    INDEX idx_queue (status, type, priority DESC)
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    content_type ENUM('model_page', 'blog_post') NOT NULL,
    keyword VARCHAR(255),
    success TINYINT(1) DEFAULT 0,
    quality_score INT NULL,
    error_message TEXT NULL,
    retry_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_date (content_type, created_at DESC)
);
```

Auto-create tables on first run (same pattern as the PHP API).

MySQL connection: read from env vars (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASS`, `MYSQL_DB`) with sensible defaults for local dev. Use `mysql2` package.

---

## Model Page Pipeline (MVP)

```
1. KEYWORD SELECTION     → pull next pending model_name from keywords table
2. MODEL VALIDATION      → call CB API to verify model exists + get live data
3. CONTENT GENERATION    → call Claude API to write 400-500 word unique bio
4. VALIDATION            → word count (300-600), heading structure, meta desc length
5. RELATED MODELS        → query models table for 5-8 with overlapping tags
6. RENDER HTML           → apply template + inject meta tags + schema markup
7. WRITE FILE            → save to packages/frontend/public/models/{slug}/index.html
8. UPDATE DB + SITEMAP   → mark keyword completed, update models table, regenerate sitemap.xml
```

### Output location
Static HTML goes to: `packages/frontend/public/models/{slug}/index.html`
Sitemap goes to: `packages/frontend/public/sitemap.xml`

These are in the frontend's public dir because nginx serves them directly in production.

### Chaturbate API for model data
Same API the pool uses — no auth token needed:
```
GET https://chaturbate.com/api/public/affiliates/onlinerooms/?wm=roGHG&format=json&limit=500
```
Search the response for the model's username. If not found (offline), still generate the page but mark `is_currently_online = false`.

### Claude API for content generation
Use `@anthropic-ai/sdk` package. Model: `claude-haiku-4-5-20251001` (cheap + fast, good enough for bios).

Prompt should generate:
- 400-500 word bio (unique, SEO-friendly, NOT explicit/pornographic — keep it suggestive but tasteful)
- Meta description (120-160 chars)
- 3-5 category tags for internal linking

### Embed URL in model pages
When model is online, show a Chaturbate embed:
```
https://{whitelabelDomain}/embed/{username}/?campaign=roGHG&tour=9oGW&track={track}&disable_sound=1&embed_video_only=1&mobileRedirect=auto
```
When offline, show thumbnail + "Watch similar on roulette" CTA linking to `/`.

---

## HTML Template Requirements

- **Standalone HTML** — does NOT use React. Pure static HTML + minimal CSS.
- **Mobile-first responsive** — same 95%+ mobile audience as the roulette
- **Dark theme** — black background (#000), pink accent (#FE2C55), consistent with roulette
- **Fast** — no JS frameworks, minimal CSS, lazy-load the embed iframe
- **SEO elements**: `<title>`, `<meta name="description">`, `<link rel="canonical">`, Open Graph tags, Twitter card, JSON-LD schema (ProfilePage + BreadcrumbList)
- **Structure**: H1 (model name), embed/thumbnail area, bio content with H2s, tags, related models grid, CTA to roulette, simple footer with legal links
- **Legal footer links**: `/legal/terms.html`, `/legal/privacy.html`, `/legal/2257.html` (these exist already)

---

## Keyword Data Files

Keyword lists live in `packages/content-engine/data/`:
- `model-names.csv` — performer usernames (one per line or comma-separated)
- `general-keywords.csv` — SEO keywords for blog posts (later, not MVP)

The `seed-keywords` CLI command should accept either `--names` inline OR `--file` pointing to a CSV.

## CLI Commands (MVP)

```bash
# Seed keywords from a file
npx tsx src/cli/index.ts seed-keywords --type model_name --file data/model-names.csv

# Seed keywords inline
npx tsx src/cli/index.ts seed-keywords --type model_name --names "miarose,sophiasmith,..."

# Seed from current CB API (grab top N by viewers)
npx tsx src/cli/index.ts seed-from-api --count 50

# Generate model pages
npx tsx src/cli/index.ts generate --type model_page --count 20

# Generate a specific model
npx tsx src/cli/index.ts generate --type model_page --keyword miarose

# Check status
npx tsx src/cli/index.ts status

# Regenerate sitemap
npx tsx src/cli/index.ts sitemap
```

---

## File Structure to Create

```
packages/content-engine/
├── package.json              ← update existing placeholder
├── tsconfig.json
├── .env.example              ← env var documentation
├── src/
│   ├── cli/
│   │   └── index.ts          ← CLI entry point (commander.js)
│   ├── config.ts             ← centralized config from env vars
│   ├── db.ts                 ← MySQL connection + auto-create tables
│   ├── generators/
│   │   └── model-page.ts     ← model page generation pipeline
│   ├── renderer/
│   │   └── html.ts           ← template rendering (string interpolation, not a framework)
│   ├── validators/
│   │   └── content.ts        ← quality checks
│   ├── seo/
│   │   ├── sitemap.ts        ← sitemap.xml generator
│   │   ├── schema.ts         ← JSON-LD markup
│   │   └── meta.ts           ← meta tag generation
│   └── services/
│       ├── chaturbate.ts     ← CB API client (fetch model data)
│       └── claude.ts         ← Claude API client (generate content)
└── templates/
    └── model-page.html       ← HTML template with {{placeholders}}
```

---

## Key Dependencies to Add

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "commander": "^12.0.0",
    "mysql2": "^3.9.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

---

## Quality Standards

- **Model bios**: 300-600 words, unique angle per model, model name appears 3-5 times naturally, NOT pornographic (suggestive is fine), at least 2 H2 subheadings
- **Meta descriptions**: 120-160 characters, include model name, include a call to action
- **Reject and retry**: if validation fails, retry with improved prompt (max 2 attempts), then mark as failed
- **No duplicate content**: before writing, check existing bios for similarity (simple word overlap check is fine for MVP)

---

## Testing Approach

After building, test with:
1. `seed-from-api --count 5` → verify keywords appear in DB
2. `generate --type model_page --count 2` → verify HTML files written to disk
3. Open the HTML file in a browser → verify it renders correctly
4. Check meta tags and JSON-LD with browser dev tools
5. Verify sitemap.xml is valid XML

---

## Environment Variables

```
# Brand (REQUIRED — no defaults that leak a specific brand into content)
SITE_NAME=XCam
SITE_TAGLINE=Live Cam Roulette
SITE_DOMAIN=xcam.vip
WHITELABEL_DOMAIN=www.xcam.vip

# Affiliate
AFFILIATE_CAMPAIGN=roGHG
AFFILIATE_TOUR=9oGW
AFFILIATE_TRACK=xcamvip-roulette

# Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=xcamvip_usr
MYSQL_PASS=
MYSQL_DB=xcamvip

# Content generation (REQUIRED)
ANTHROPIC_API_KEY=sk-ant-...
```

The CLI should fail with a clear message if `ANTHROPIC_API_KEY`, `SITE_NAME`, or `SITE_DOMAIN` are missing. These have no safe defaults — running without them would produce broken or brand-leaked content.
