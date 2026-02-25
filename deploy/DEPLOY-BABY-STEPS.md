# Get Listicles Live — Baby Steps Edition

No AI. No blog. No cron. Just get pages on the internet.
You can add everything else later. Today = just see pages live.

---

## Step 1: SSH in

```bash
ssh deploy@YOUR_SERVER_IP
```

Then:
```bash
cd /home/deploy/swipehot
```

**Checkpoint:** You see your project files. Type `ls` — you should see `packages/`, `CLAUDE.md`, etc.

---

## Step 2: Pull latest code

```bash
git stash
git pull origin master
git stash pop
```

If it says "no stash entries" on the last command, that's fine. Ignore it.

**Checkpoint:** `ls packages/content-engine/src/cli/index.ts` shows the file.

---

## Step 3: Make sure Node.js works

```bash
export PATH="/home/deploy/swipehot/_node/bin:$PATH"
node -v
```

Should say `v20.something`. If "command not found":

```bash
curl -sL https://nodejs.org/dist/v20.18.1/node-v20.18.1-linux-x64.tar.gz | tar -xz
mv node-v20.18.1-linux-x64 _node
export PATH="/home/deploy/swipehot/_node/bin:$PATH"
echo 'export PATH="/home/deploy/swipehot/_node/bin:$PATH"' >> ~/.bashrc
node -v
```

**Checkpoint:** `node -v` prints v20.x.x

---

## Step 4: Install dependencies

```bash
npm install
```

Wait 1-2 minutes. Ignore warnings.

**Checkpoint:** Run this — it should print a help menu:
```bash
cd packages/content-engine && npx tsx src/cli/index.ts --help
```

---

## Step 5: Create .env

```bash
cat > .env << 'EOF'
SITE_NAME=SwipeHot
SITE_TAGLINE=Live Cam Roulette
SITE_DOMAIN=swipe.hot
WHITELABEL_DOMAIN=cams.swipe.hot
AFFILIATE_CAMPAIGN=roGHG
AFFILIATE_TOUR=9oGW
AFFILIATE_TRACK=swipehot-roulette
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=xcamvip_usr
MYSQL_PASS=Mydatap123
MYSQL_DB=xcamvip
AI_PROVIDER=arli
ARLI_API_KEY=skip-for-now
EOF
```

That's it. One paste. Done.

**Checkpoint:** `cat .env` — should show all the values above.

---

## Step 6: Collect model data

```bash
npx tsx src/cli/index.ts collect --count 500
```

Takes about 1 minute. It's pulling live models from Chaturbate API into your database.

**Checkpoint:** Run `npx tsx src/cli/index.ts status` — should show models > 0.

---

## Step 7: Build the pages

```bash
npx tsx src/cli/index.ts build-pages
```

Takes ~30 seconds. Generates 22 HTML files.

**Checkpoint:**
```bash
ls ../frontend/public/*-cams/index.html | wc -l
```
Should say `22`.

---

## Step 8: Update nginx

Find your config:
```bash
ls /etc/nginx/conf.d/*.conf
```

Edit it (use the filename you found):
```bash
sudo nano /etc/nginx/conf.d/YOUR_CONFIG.conf
```

Find the line that says `location /` with `try_files $uri $uri/ /index.html` (the SPA catch-all — usually near the bottom).

**Add this block RIGHT ABOVE that `location /` block:**

```nginx
    # Category hubs
    location ~ ^/([a-z-]+)-cams(/.*)?$ {
        root /home/deploy/swipehot/packages/frontend/public;
        try_files $uri $uri/ /$1-cams/index.html =404;
        expires 30m;
    }
```

Save (Ctrl+X, Y, Enter).

Test and reload:
```bash
sudo nginx -t && sudo nginx -s reload
```

**Checkpoint:** Open in your browser:
```
https://swipe.hot/asian-cams/
```

You should see a page with ranked cam models.

---

## YOU'RE LIVE

That's it. 22 pages are now on the internet. Go check a few:

- https://swipe.hot/asian-cams/
- https://swipe.hot/teen-cams/
- https://swipe.hot/ebony-cams/
- https://swipe.hot/mature-cams/

The roulette at https://swipe.hot/ still works as before.

---

## Later (not today)

When you're ready, these are the "improve it" layers:

| When | What | Command |
|---|---|---|
| Tomorrow | Set up 30-min auto-refresh | `bash scripts/setup-cron.sh` |
| Tomorrow | Generate sitemap for Google | `npx tsx src/cli/index.ts sitemap` |
| This week | Add AI bios to model cards | Get ArliAI key, update .env, run `collect --count 1500 --bios` |
| This week | Start blog autopilot | `npx tsx src/cli/index.ts generate-blog --slug is-chaturbate-safe` |
| Next week | Submit to Google Search Console | Add property, submit sitemap URL |

None of that matters today. Today = pages live. Done.
