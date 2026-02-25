# Full Content Deployment Guide — swipe.hot

**Goal:** Get 22 living listicle pages + blog + sitemap live for organic traffic.

**Time estimate:** ~30-45 minutes for the full setup.

**What you'll have when done:**
- 22 category hub pages (asian-cams, teen-cams, etc.) — ~390K combined monthly search volume
- Auto-refreshing every 30 minutes with live model data
- Sitemap submitted to Google
- Blog autopilot generating 2 posts/day (optional, needs AI key)

---

## Pre-Flight Checklist

Before starting, make sure you have:

- [ ] SSH access to the server (`/home/deploy/swipehot`)
- [ ] Roulette app already working at `https://swipe.hot`
- [ ] PHP API working at `https://swipe.hot/api/pool-next.php?session_id=test&gender=f`
- [ ] MySQL credentials (user: `xcamvip_usr`, pass: `Mydatap123`, db: `xcamvip`)
- [ ] (Optional) ArliAI API key — only needed for blog posts and model page bios

---

## PHASE 1: Server Prep

### Step 1: SSH into the server

```bash
ssh deploy@<your-server-ip>
cd /home/deploy/swipehot
```

Verify you're in the right place:
```bash
ls packages/content-engine/src/cli/index.ts
# Should show the file — if not, you're in the wrong directory
```

---

### Step 2: Git pull (preserve server config)

The server has a `_config.php` with real credentials. Stash it before pulling:

```bash
cd /home/deploy/swipehot

# Save server-specific files
git stash

# Pull latest code
git pull origin master

# Restore server-specific files
git stash pop
```

**If stash pop has conflicts:**
```bash
# Keep the server version of _config.php
git checkout --theirs packages/frontend/public/api/_config.php
git add packages/frontend/public/api/_config.php
git stash drop
```

Verify the pull worked:
```bash
ls packages/content-engine/src/cli/index.ts
# Should exist
ls packages/content-engine/templates/
# Should show: listicle-page.html, model-page.html, blog-post.html
```

---

### Step 3: Check Node.js

```bash
node -v
```

**If it shows `v20.x.x`** — skip to Step 4.

**If "command not found"** — check if it's installed locally:
```bash
ls _node/bin/node
```

If that exists, add to PATH:
```bash
export PATH="/home/deploy/swipehot/_node/bin:$PATH"
node -v  # Should now show v20.x.x
```

Make it permanent:
```bash
echo 'export PATH="/home/deploy/swipehot/_node/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**If Node.js is not installed at all:**
```bash
cd /home/deploy/swipehot
curl -sL https://nodejs.org/dist/v20.18.1/node-v20.18.1-linux-x64.tar.gz | tar -xz
mv node-v20.18.1-linux-x64 _node
export PATH="/home/deploy/swipehot/_node/bin:$PATH"
echo 'export PATH="/home/deploy/swipehot/_node/bin:$PATH"' >> ~/.bashrc
node -v  # v20.18.1
```

---

### Step 4: Install dependencies

```bash
cd /home/deploy/swipehot
npm install
```

This installs all workspace packages including the content engine. Takes ~1-2 minutes.

**Verify it worked:**
```bash
cd /home/deploy/swipehot/packages/content-engine
npx tsx src/cli/index.ts --help
```

**Expected output:** List of commands (collect, generate, build-pages, status, etc.)

**If you get errors:**
- `tsx: command not found` → run `npm install` again from repo root
- Permission errors → check you own the files: `ls -la node_modules/`

---

## PHASE 2: Content Engine Setup

### Step 5: Create the `.env` file

```bash
cd /home/deploy/swipehot/packages/content-engine
cp .env.example .env
nano .env
```

**Set these exact values:**
```env
# Brand
SITE_NAME=SwipeHot
SITE_TAGLINE=Live Cam Roulette
SITE_DOMAIN=swipe.hot
WHITELABEL_DOMAIN=cams.swipe.hot

# Affiliate
AFFILIATE_CAMPAIGN=roGHG
AFFILIATE_TOUR=9oGW
AFFILIATE_TRACK=swipehot-roulette

# Database — MUST match _config.php on server
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=xcamvip_usr
MYSQL_PASS=Mydatap123
MYSQL_DB=xcamvip

# AI Provider (only needed for blog posts / model bios)
# For listicles only, you can leave these as-is
AI_PROVIDER=arli
ARLI_API_KEY=your-arli-key-here
```

Save and exit (`Ctrl+X`, `Y`, `Enter` in nano).

**Important notes:**
- MySQL credentials must match `packages/frontend/public/api/_config.php` on the server
- The database tables auto-create on first run (models, keywords, user_votes, etc.)
- AI key is NOT needed for listicles — only for blog posts and model bios
- If you don't have an ArliAI key yet, leave it as placeholder — listicles will still work

---

### Step 6: Test the database connection

```bash
cd /home/deploy/swipehot/packages/content-engine
npx tsx src/cli/index.ts status
```

**Expected output:** Shows database connection status and table counts (all zeros is fine — we haven't collected data yet).

**If "Connection refused" or "Access denied":**
- Double-check MySQL credentials match `_config.php`
- Verify MySQL is running: `systemctl status mysql` or `systemctl status mariadb`
- Try connecting manually: `mysql -u xcamvip_usr -pMydatap123 xcamvip -e "SELECT 1"`

---

## PHASE 3: Collect Data & Build Pages

### Step 7: First small test collection

```bash
cd /home/deploy/swipehot/packages/content-engine

# Collect 100 models as a test (takes ~30 seconds)
npx tsx src/cli/index.ts collect --count 100
```

**Expected output:**
```
Fetching online rooms from Chaturbate API...
Fetched 100 performers
Stored 100 models in database
Collection complete: 100 new, 0 updated
```

**Verify data is in the DB:**
```bash
npx tsx src/cli/index.ts status
```
Should now show model count > 0.

---

### Step 8: Build one test page

```bash
npx tsx src/cli/index.ts build-pages --category asian-cams
```

**Expected output:**
```
Building asian-cams...
  Found XX models matching category
  Wrote packages/frontend/public/asian-cams/index.html
Built 1 page
```

**Verify the file exists:**
```bash
ls -la /home/deploy/swipehot/packages/frontend/public/asian-cams/index.html
# Should show the file with size > 10KB
```

---

### Step 9: Update nginx to serve content pages

Check your current nginx config:
```bash
# Find the current config file (could be any of these)
ls /etc/nginx/conf.d/swipehot*.conf 2>/dev/null
ls /etc/nginx/sites-enabled/swipe* 2>/dev/null
cat /etc/nginx/conf.d/*.conf 2>/dev/null | head -5
```

Edit the config (replace `<config-file>` with the actual path):
```bash
sudo nano <config-file>
```

**Add these location blocks BEFORE the `location /` SPA catch-all:**

```nginx
    # ============================================
    # CONTENT PAGES (add these before SPA catch-all)
    # ============================================

    # Category hubs (living listicles) — 22 pages
    location ~ ^/([a-z-]+)-cams(/.*)?$ {
        root /home/deploy/swipehot/packages/frontend/public;
        try_files $uri $uri/ /$1-cams/index.html =404;
        expires 30m;
    }

    # Model profile pages
    location /models/ {
        alias /home/deploy/swipehot/packages/frontend/public/models/;
        try_files $uri $uri.html $uri/index.html =404;
        expires 1h;
    }

    # Blog posts
    location /blog/ {
        alias /home/deploy/swipehot/packages/frontend/public/blog/;
        try_files $uri $uri.html $uri/index.html =404;
        expires 1h;
    }

    # Sitemap + robots
    location = /sitemap.xml {
        root /home/deploy/swipehot/packages/frontend/public;
    }
    location = /robots.txt {
        root /home/deploy/swipehot/packages/frontend/public;
    }
```

**Critical: Order matters!** The location blocks must be in this order:
1. `/api/` (PHP API)
2. `/admin/` (Dashboard)
3. `^/([a-z-]+)-cams` (Listicles) <-- NEW
4. `/models/` <-- NEW
5. `/blog/` <-- NEW
6. `/sitemap.xml` and `/robots.txt` <-- NEW
7. `/` (SPA catch-all — MUST be LAST)

**Test and reload:**
```bash
sudo nginx -t
# Must show "syntax is ok" and "test is successful"

sudo nginx -s reload
# OR: sudo systemctl reload nginx
```

**Test the page in browser:**
```
https://swipe.hot/asian-cams/
```

You should see a ranked list of live cam models with thumbnails, vote buttons, and "Watch Live" CTAs.

**If you get 404:**
- Check the category-cams location block is BEFORE the SPA catch-all
- Check the `root` path is correct
- Run `nginx -t` for syntax errors
- Check file exists: `ls /home/deploy/swipehot/packages/frontend/public/asian-cams/index.html`

---

### Step 10: Full data collection

Now that the test page works, do a bigger collection:

```bash
cd /home/deploy/swipehot/packages/content-engine

# Full collection — 1500 models (takes ~2-3 minutes)
npx tsx src/cli/index.ts collect --count 1500
```

---

### Step 11: Build all 22 category pages

```bash
npx tsx src/cli/index.ts build-pages
```

**Expected output:**
```
Building asian-cams... XX models
Building teen-cams... XX models
Building ebony-cams... XX models
... (22 categories)
Built 22 pages
```

**Verify all pages were created:**
```bash
ls /home/deploy/swipehot/packages/frontend/public/*-cams/index.html | wc -l
# Should show 22
```

**Quick spot-check a few pages:**
```
https://swipe.hot/asian-cams/
https://swipe.hot/teen-cams/
https://swipe.hot/ebony-cams/
https://swipe.hot/mature-cams/
```

Each page should show:
- Ranked model cards with live thumbnails
- Vote (upvote) buttons
- "Watch Live" buttons linking to Chaturbate affiliate URLs
- Category description text
- Related category links at the bottom
- Proper meta tags (view page source → check `<title>` and `<meta>`)

---

## PHASE 4: SEO Infrastructure

### Step 12: Generate sitemap

```bash
cd /home/deploy/swipehot/packages/content-engine
npx tsx src/cli/index.ts sitemap
```

**Verify:**
```bash
cat /home/deploy/swipehot/packages/frontend/public/sitemap.xml | head -20
```

Should show XML with `<url>` entries for each category page.

**Test in browser:**
```
https://swipe.hot/sitemap.xml
```

---

### Step 13: Create robots.txt

Check if it already exists:
```bash
cat /home/deploy/swipehot/packages/frontend/public/robots.txt
```

If it doesn't exist or needs updating, create it:
```bash
cat > /home/deploy/swipehot/packages/frontend/public/robots.txt << 'EOF'
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://swipe.hot/sitemap.xml
EOF
```

**Test:** `https://swipe.hot/robots.txt`

---

### Step 14: Submit to Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://swipe.hot`
3. Verify ownership (DNS TXT record or HTML file method)
4. Submit sitemap: `https://swipe.hot/sitemap.xml`
5. Request indexing for high-priority pages:
   - `https://swipe.hot/teen-cams/` (36K monthly searches)
   - `https://swipe.hot/indian-cams/` (24K)
   - `https://swipe.hot/ebony-cams/` (23K)
   - `https://swipe.hot/european-cams/` (19K)
   - `https://swipe.hot/big-ass-cams/` (11K)

---

## PHASE 5: Automation (Cron Jobs)

### Step 15: Create log directory

```bash
sudo mkdir -p /var/log/swipehot
sudo chown $(whoami) /var/log/swipehot
```

---

### Step 16: Set up cron jobs

**Option A: Use the setup script**
```bash
cd /home/deploy/swipehot
bash packages/content-engine/scripts/setup-cron.sh
# Answer "y" when prompted
```

**Option B: Manual setup** (if the script doesn't work)
```bash
crontab -e
```

Add these lines at the bottom:
```cron
# swipehot content engine — light cycle (every 30 min)
*/30 * * * * /home/deploy/swipehot/packages/content-engine/scripts/cron-light.sh >> /var/log/swipehot/light.log 2>&1

# swipehot content engine — heavy cycle (daily 2 AM)
0 2 * * * /home/deploy/swipehot/packages/content-engine/scripts/cron-heavy.sh >> /var/log/swipehot/heavy.log 2>&1

# swipehot content engine — blog autopilot (daily 4 AM)
0 4 * * * /home/deploy/swipehot/packages/content-engine/scripts/cron-blog.sh >> /var/log/swipehot/blog.log 2>&1
```

**Make scripts executable:**
```bash
chmod +x /home/deploy/swipehot/packages/content-engine/scripts/cron-light.sh
chmod +x /home/deploy/swipehot/packages/content-engine/scripts/cron-heavy.sh
chmod +x /home/deploy/swipehot/packages/content-engine/scripts/cron-blog.sh
```

**Verify cron is installed:**
```bash
crontab -l
# Should show the 3 entries above
```

---

### Step 17: Test cron manually

Don't wait 30 minutes — run the light cycle now:
```bash
bash /home/deploy/swipehot/packages/content-engine/scripts/cron-light.sh
```

**Expected:** Collects 1000 models + rebuilds all 22 pages. Takes ~3-5 minutes.

Check the log:
```bash
tail -20 /var/log/swipehot/light.log
```

---

## PHASE 6: Verification Checklist

Run through each of these:

### Pages load correctly
- [ ] `https://swipe.hot/asian-cams/` — shows ranked models
- [ ] `https://swipe.hot/teen-cams/` — shows ranked models
- [ ] `https://swipe.hot/gay-cams/` — shows ranked models (different gender)
- [ ] `https://swipe.hot/sitemap.xml` — shows XML with URLs
- [ ] `https://swipe.hot/robots.txt` — shows allow/disallow rules

### Interactive features work
- [ ] Click vote/upvote button → counter increments (check network tab: POST to `/api/vote.php` returns 200)
- [ ] Click "Watch Live" → opens Chaturbate affiliate link with correct campaign params
- [ ] Click play button on model card → loads embed from `cams.swipe.hot`

### SEO is correct (view page source)
- [ ] `<title>` contains category name and site name
- [ ] `<meta name="description">` is set
- [ ] `<link rel="canonical">` points to correct URL
- [ ] JSON-LD structured data block exists (`<script type="application/ld+json">`)
- [ ] Open Graph tags set (`og:title`, `og:description`, `og:image`)

### Roulette still works
- [ ] `https://swipe.hot/` — roulette loads normally (SPA catch-all still works)
- [ ] Swipe through a few performers — no regression

### Cron is running
- [ ] `crontab -l` shows 3 entries
- [ ] Wait 30 min, then check: `tail -5 /var/log/swipehot/light.log`
- [ ] Reload a listicle page — model data should be refreshed

---

## PHASE 7 (Optional): Blog Posts

Blog posts need an AI API key. Listicles don't.

### If you have an ArliAI key:

1. Update `.env`:
```bash
nano /home/deploy/swipehot/packages/content-engine/.env
# Set: ARLI_API_KEY=your-actual-key
```

2. Generate a single test blog post:
```bash
cd /home/deploy/swipehot/packages/content-engine
npx tsx src/cli/index.ts generate-blog --slug is-chaturbate-safe
```

3. If it works, the cron-blog.sh will auto-generate 2 posts/day at 4 AM.

### If you want to use Claude instead:
```env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Blog post priority queue (by traffic potential):
1. `chaturbate-token-calculator` (ALREADY BUILT)
2. `is-chaturbate-safe` — safety/trust guide
3. `chaturbate-payout-guide` — creator earnings
4. `free-chaturbate-tokens` — freebie seekers
5. `chaturbate-review` — main review page

---

## Quick Reference: Useful Commands

```bash
# Always run from content-engine directory
cd /home/deploy/swipehot/packages/content-engine

# Check system health
npx tsx src/cli/index.ts status

# Rebuild a single category
npx tsx src/cli/index.ts build-pages --category asian-cams

# Rebuild ALL categories
npx tsx src/cli/index.ts build-pages

# Fresh data collection
npx tsx src/cli/index.ts collect --count 1500

# Collection with screenshots + bios (heavy, needs AI key for bios)
npx tsx src/cli/index.ts collect --count 1500 --screenshots --bios

# Regenerate sitemap
npx tsx src/cli/index.ts sitemap

# Check cron logs
tail -f /var/log/swipehot/light.log
tail -f /var/log/swipehot/heavy.log
tail -f /var/log/swipehot/blog.log

# Nuclear option: re-collect + rebuild everything
npx tsx src/cli/index.ts collect --count 1500 && npx tsx src/cli/index.ts build-pages && npx tsx src/cli/index.ts sitemap
```

---

## Troubleshooting

### "No models found for this category"
- The DB is empty. Run `collect --count 1500` first.
- Some niche categories need more data — try `collect --count 2500`.

### nginx 404 on category pages
- The `location ~ ^/([a-z-]+)-cams` block must be BEFORE `location /` (SPA catch-all).
- Check `root` path: `ls /home/deploy/swipehot/packages/frontend/public/asian-cams/index.html`
- Run `sudo nginx -t` for syntax errors.

### "tsx: command not found" in cron
- Cron doesn't load `.bashrc`. The cron scripts auto-add `_node/bin` to PATH.
- Verify: `head -10 /home/deploy/swipehot/packages/content-engine/scripts/cron-light.sh`
- Check `_node/bin/npx` exists: `ls /home/deploy/swipehot/_node/bin/npx`

### MySQL "Connection refused"
- Check MySQL is running: `systemctl status mysql`
- Verify credentials: `mysql -u xcamvip_usr -pMydatap123 xcamvip -e "SHOW TABLES"`
- Check `.env` values match `_config.php`

### Vote button returns 500
- Check MySQL credentials in `_config.php`
- The `user_votes` table auto-creates — if it's missing, any API call to `_db.php` will recreate it
- Check PHP error log: `tail /var/log/php-fpm/error.log` or `tail /var/log/nginx/error.log`

### Pages look stale after 30 minutes
- Check cron is running: `crontab -l`
- Check log output: `tail -20 /var/log/swipehot/light.log`
- Run manually: `bash /home/deploy/swipehot/packages/content-engine/scripts/cron-light.sh`

### Blog generation fails
- AI key is required. Check `.env` has a valid key for your chosen provider.
- ArliAI is cheapest (~$0.006/page). Claude is highest quality (~$0.02/page).
- Check what went wrong: `npx tsx src/cli/index.ts status` — shows failed pipeline runs.

### Roulette SPA stopped working
- The SPA catch-all (`location /`) must be the LAST location block in nginx.
- If you accidentally put a content block after it, the SPA will intercept content URLs.
- Full reference config: `deploy/nginx.conf`
