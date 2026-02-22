# Deploy Living Listicles on swipe.hot

Step-by-step guide to get the 22 category hub pages live.

**Prerequisites:** swipe.hot is live with roulette app + PHP API working.

---

## Step 1: Install Node.js on server

Node.js is needed for the content engine CLI (not for serving pages — those are static HTML).

**Option A: Via PHP helper** (if no SSH yet)
```
Visit: https://swipe.hot/deploy/install-node.php
```
Installs Node.js v20 to `/home/deploy/swipehot/_node/`.

**Option B: Via SSH**
```bash
cd /home/deploy/swipehot
curl -sL https://nodejs.org/dist/v20.18.1/node-v20.18.1-linux-x64.tar.gz | tar -xz
mv node-v20.18.1-linux-x64 _node
export PATH="/home/deploy/swipehot/_node/bin:$PATH"
node -v  # Should show v20.18.1
```

Add to `~/.bashrc`:
```bash
export PATH="/home/deploy/swipehot/_node/bin:$PATH"
```

---

## Step 2: Install content engine dependencies

```bash
cd /home/deploy/swipehot
npm install   # Installs all workspaces including content-engine
```

Verify:
```bash
npx tsx packages/content-engine/src/cli/index.ts --help
```

---

## Step 3: Create content engine .env

```bash
cp packages/content-engine/.env.example packages/content-engine/.env
nano packages/content-engine/.env
```

**Required values to set:**
```env
SITE_NAME=SwipeHot
SITE_DOMAIN=swipe.hot
WHITELABEL_DOMAIN=cams.swipe.hot

MYSQL_HOST=localhost
MYSQL_USER=xcamvip_usr       # Same as _config.php
MYSQL_PASS=Mydatap123        # Same as _config.php
MYSQL_DB=xcamvip             # Same as _config.php

AI_PROVIDER=arli
ARLI_API_KEY=<your-arli-key>
```

The MySQL credentials must match what's in `packages/frontend/public/api/_config.php` on the server. The content engine tables (`models`, `keywords`, `user_votes`, `pipeline_runs`, `daily_snapshots`, `page_builds`) auto-create on first run.

---

## Step 4: First data collection

```bash
cd /home/deploy/swipehot/packages/content-engine

# Small test first
npx tsx src/cli/index.ts collect --count 100
npx tsx src/cli/index.ts status

# Full collection
npx tsx src/cli/index.ts collect --count 1500
```

This fetches live model data from the Chaturbate API and populates the DB. Takes ~2-3 minutes for 1500 models.

---

## Step 5: Build one test page

```bash
npx tsx src/cli/index.ts build-pages --category asian-cams
```

This writes: `packages/frontend/public/asian-cams/index.html`

Visit `https://swipe.hot/asian-cams/` to verify.

**Expected:** Ranked list of models with thumbnails, vote buttons, play buttons, and "Watch Live" CTAs pointing to `cams.swipe.hot`.

---

## Step 6: Build all 22 pages

```bash
npx tsx src/cli/index.ts build-pages
```

All 22 category pages will be built:
```
asian-cams, teen-cams, ebony-cams, indian-cams, european-cams,
big-ass-cams, mature-cams, lesbian-cams, bdsm-cams, redhead-cams,
squirt-cams, busty-cams, blonde-cams, feet-cams, brunette-cams,
bbw-cams, couple-cams, anal-cams, gay-cams, trans-cams,
latina-cams, petite-cams
```

---

## Step 7: Update nginx config

The nginx needs a location block for `/{category}-cams/` paths. Add this **before** the SPA catch-all:

```nginx
# Category hubs (living listicles)
location ~ ^/([a-z-]+)-cams(/.*)?$ {
    root /home/deploy/swipehot/packages/frontend/public;
    try_files $uri $uri/ /$1-cams/index.html =404;
    expires 30m;
}
```

Also ensure model pages and blog posts are served:
```nginx
location /models/ {
    alias /home/deploy/swipehot/packages/frontend/public/models/;
    try_files $uri $uri.html $uri/index.html =404;
    expires 1h;
}

location /blog/ {
    alias /home/deploy/swipehot/packages/frontend/public/blog/;
    try_files $uri $uri.html $uri/index.html =404;
    expires 1h;
}
```

Test and reload:
```bash
nginx -t && nginx -s reload
```

See `deploy/nginx.conf` for the full reference config.

---

## Step 8: Generate sitemap

```bash
npx tsx src/cli/index.ts sitemap
```

Writes `packages/frontend/public/sitemap.xml` with all content page URLs.

---

## Step 9: Set up cron jobs

```bash
# Create log directory
sudo mkdir -p /var/log/swipehot
sudo chown $(whoami) /var/log/swipehot

# Run the setup script
bash packages/content-engine/scripts/setup-cron.sh
```

This adds 3 cron entries:
| Schedule | Script | What it does |
|---|---|---|
| Every 30 min | `cron-light.sh` | Collect 1000 models + rebuild all 22 listicle pages |
| Daily 2 AM | `cron-heavy.sh` | Collect 1500 + screenshots + bios + rebuild + sitemap |
| Daily 4 AM | `cron-blog.sh` | Generate 2 blog posts + rebuild internal links + sitemap |

Verify: `crontab -l`

---

## Step 10: Verify everything works

1. **Listicle pages:** Visit `https://swipe.hot/asian-cams/` — ranked model cards
2. **Vote button:** Click upvote — should persist (check `/api/vote.php` returns 200)
3. **Play button:** Click play on a model card — should load `cams.swipe.hot` embed
4. **Watch Live CTA:** Click — should open `chaturbate.com/in/?...` affiliate link
5. **Auto-refresh:** Wait 30 min, reload — data should be updated
6. **Cron logs:** `tail -f /var/log/swipehot-light.log`

---

## Troubleshooting

**"No models found for this category"**
- Run `collect` first — DB needs model data before `build-pages` works
- Check `status` command for DB health

**nginx returns 404 for category pages**
- Verify the `location ~ ^/([a-z-]+)-cams` block is **before** the `location /` SPA block
- Check `root` path matches actual file locations
- Run `nginx -t` to check config syntax

**Cron not running**
- Check PATH: cron scripts auto-prepend `_node/bin` to PATH
- Check `.env` exists in content-engine directory
- Check logs: `tail /var/log/swipehot-light.log`

**Vote button returns 500**
- Check MySQL credentials in `_config.php` on server
- Check `user_votes` table exists (auto-created by `_db.php`)
