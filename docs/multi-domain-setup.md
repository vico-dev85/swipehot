# Multi-Domain Deployment Guide

## Overview

Deploy the same xcam.vip codebase on multiple domains. Each domain gets its own config, database, and affiliate tracking — but shares the same code. Takes ~10 minutes per new domain.

---

## Prerequisites

- A server with PHP 7.4+ and MySQL (FastPanel, cPanel, etc.)
- Domain pointed to the server (DNS A record)
- SSL certificate (Let's Encrypt / FastPanel auto-SSL)
- Chaturbate affiliate account (you can use the same account for all domains)

---

## Step-by-Step: Adding a New Domain

### 1. Create a Database

In FastPanel (or phpMyAdmin):

```
Database name: newdomain_db
Database user: newdomain_usr
Password: (generate a strong one)
Grant user full access to the database
```

Tables are auto-created on first request — no manual SQL needed.

### 2. Copy the dist/ Folder

Copy the entire `packages/frontend/dist/` folder to your new domain's web root.

```
/var/www/newdomain.com/
├── index.html
├── test-embed.html
├── logo.png
├── assets/
│   ├── index-XXXX.css
│   └── index-XXXX.js
└── api/
    ├── _config.php      ← EDIT THIS
    ├── _db.php
    ├── _pool.php
    ├── pool-next.php
    ├── events.php
    ├── stats.php
    ├── postback.php
    └── config.php
```

### 3. Edit _config.php

This is the ONLY file you need to change. Open `api/_config.php` and update:

```php
<?php
// ============================================
// EDIT THESE VALUES FOR YOUR NEW DOMAIN
// ============================================

// Chaturbate API (same for all domains)
define('CB_API_URL', 'https://chaturbate.com/api/public/affiliates/onlinerooms/');

// Affiliate config — get these from your Chaturbate affiliate dashboard
// You can use the SAME campaign for all domains, or create separate ones
// to track which domain generates revenue
define('AFFILIATE_CAMPAIGN', 'roGHG');     // Your campaign ID
define('AFFILIATE_TOUR', '9oGW');          // Your tour ID
define('AFFILIATE_TRACK', 'newdomain');    // UNIQUE per domain — this is how you
                                           // identify which domain sent the traffic
                                           // in Chaturbate's reporting

// White label domain — register this in Chaturbate affiliate panel
// Go to: Affiliate dashboard → White Labels → Add domain
define('WHITELABEL_DOMAIN', 'www.newdomain.com');

// Cache directory (must be writable by PHP)
define('CACHE_DIR', sys_get_temp_dir() . '/newdomain_cache');

// Cache TTL in seconds
define('POOL_CACHE_TTL', 90);

// MySQL config — SEPARATE DATABASE per domain
define('MYSQL_HOST', 'localhost');
define('MYSQL_PORT', 3306);
define('MYSQL_USER', 'newdomain_usr');     // Database user you created
define('MYSQL_PASS', 'YourStrongPass');    // Database password
define('MYSQL_DB', 'newdomain_db');        // Database name you created

// Stats API key — UNIQUE per domain (generate random string)
// Use this to access: https://newdomain.com/api/stats.php?key=THIS_VALUE
define('STATS_KEY', 'generate-a-random-32-char-string');

// CORS — your new domain
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://newdomain.com', 'https://www.newdomain.com'];
if (in_array($origin, $allowed)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: https://newdomain.com');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Ensure cache directory exists
if (!is_dir(CACHE_DIR)) {
    @mkdir(CACHE_DIR, 0755, true);
}
```

### 4. Edit index.html

Update the meta tags in `index.html`:

```html
<title>NewDomain.com — Free Live Cam Roulette</title>
<meta name="description" content="Your description here">
<meta property="og:title" content="NewDomain.com — Free Live Cam Roulette">
<meta property="og:url" content="https://newdomain.com">
```

If you have Google Analytics, update the GA measurement ID too.

### 5. Replace logo.png

Replace `logo.png` in the web root with your new domain's logo. Same dimensions — the TopBar expects a small horizontal logo (~24px height).

### 6. Register White Label in Chaturbate

1. Log into Chaturbate affiliate dashboard
2. Go to **White Labels** section
3. Add `www.newdomain.com` as a new white label
4. Wait for approval (usually instant for existing affiliates)

Without this step, embeds from `www.newdomain.com/embed/` won't work.

### 7. Set Postback URL

In Chaturbate affiliate dashboard → **Postback URLs**:

```
https://newdomain.com/api/postback.php?sid={SID}&type={TYPE}&amount={AMOUNT}
```

Note: You can have multiple postback URLs — one per domain. Chaturbate sends postbacks to ALL configured URLs. The `sid` parameter contains the domain's track ID so postbacks route correctly.

### 8. Verify Everything Works

Run these checks in order:

```
1. Visit https://newdomain.com
   → Should show age gate

2. Pass age gate, click Start
   → Should show performer with live video

3. Check API:
   https://newdomain.com/api/pool-next.php?session_id=test1234567890abcdef&gender=f
   → Should return JSON with performer data
   → embed_url should use www.newdomain.com/embed/...

4. Check stats:
   https://newdomain.com/api/stats.php?key=YOUR_STATS_KEY
   → Should return JSON (may show zeros initially)

5. Check embed test:
   https://newdomain.com/test-embed.html
   → Fetch an online performer and verify video plays
```

---

## Config Reference: What Each Value Does

| Config | What it does | Same or unique per domain? |
|--------|-------------|---------------------------|
| `CB_API_URL` | Chaturbate API endpoint | Same for all |
| `AFFILIATE_CAMPAIGN` | Your affiliate campaign ID | Same (or unique for separate tracking) |
| `AFFILIATE_TOUR` | Your affiliate tour ID | Same |
| `AFFILIATE_TRACK` | Track ID in Chaturbate reports | **UNIQUE** — identifies which domain |
| `WHITELABEL_DOMAIN` | Domain for embed URLs | **UNIQUE** — the new domain |
| `CACHE_DIR` | Temp file storage path | **UNIQUE** — avoid collision |
| `MYSQL_*` | Database connection | **UNIQUE** — separate DB per domain |
| `STATS_KEY` | Auth for stats endpoint | **UNIQUE** — separate access |
| CORS `$allowed` | Allowed request origins | **UNIQUE** — the new domain |

---

## Updating Code Across Domains

When you update the codebase and rebuild:

```
1. Make changes in packages/frontend/
2. Run: npx vite build (in packages/frontend/)
3. Copy dist/ to each domain's web root
4. DO NOT overwrite _config.php — that's domain-specific
```

**Important:** After copying dist/, restore each domain's `_config.php` from backup, or copy the updated dist/ excluding `api/_config.php`:

```bash
# On Linux/Mac — copy everything except _config.php
rsync -av --exclude='api/_config.php' dist/ /var/www/newdomain.com/

# Or manually: copy dist/, then restore _config.php from backup
```

On Windows with FastPanel file manager: upload all files, then re-upload the domain-specific `_config.php` last.

---

## Optional: Multiple Affiliate Campaigns

If you want to track revenue per domain separately in Chaturbate's dashboard:

1. Create a new campaign in Chaturbate affiliate panel for each domain
2. Each campaign gets its own `AFFILIATE_CAMPAIGN` ID
3. Set each domain's `_config.php` with its campaign ID

This lets you see in Chaturbate's reports: "newdomain.com earned $X, otherdomain.com earned $Y"

If you don't need this granularity, use the same campaign everywhere and rely on `AFFILIATE_TRACK` (which is always unique per domain) for identification.

---

## Troubleshooting

### Black screen / no video
- White label not approved in Chaturbate dashboard
- Check embed URL format: `https://www.newdomain.com/embed/username/`
- Test with `test-embed.html`

### API returns errors
- Check `_config.php` MySQL credentials
- Check database user has access to the database
- Check PHP error logs: `tail -f /var/log/php-fpm/error.log`

### Stats show zeros
- Events need time to accumulate (try a few swipes first)
- Check events.php directly: `curl -X POST https://newdomain.com/api/events.php`
- Check if JSONL fallback is being used (MySQL might be failing)

### Postbacks not arriving
- Verify postback URL in Chaturbate dashboard
- Check `api/postback.php` is accessible: `curl https://newdomain.com/api/postback.php`
- Postbacks can take minutes to arrive after a conversion

### Cache issues
- `CACHE_DIR` must be writable by PHP
- Check: `ls -la /tmp/newdomain_cache/`
- If pool files are very old, delete them to force refresh

---

## Domain Checklist

Use this for each new domain:

- [ ] Database created (name, user, password)
- [ ] dist/ folder uploaded to web root
- [ ] `_config.php` edited with domain-specific values
- [ ] `index.html` meta tags updated
- [ ] `logo.png` replaced
- [ ] White label registered in Chaturbate
- [ ] Postback URL set in Chaturbate
- [ ] SSL certificate active
- [ ] Age gate works
- [ ] Live video plays
- [ ] Stats endpoint returns data
- [ ] test-embed.html shows video
