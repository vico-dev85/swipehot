#!/bin/bash
# Heavy cron cycle — runs daily at 2:00 AM server time
# Full data collection: screenshots, mini-bios, daily snapshots
#
# Crontab entry:
#   0 2 * * * /path/to/xcamvip/packages/content-engine/scripts/cron-heavy.sh >> /var/log/xcamvip-heavy.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PKG_DIR"

echo "========================================"
echo "[HEAVY] $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# 1. Collect 1500 models with screenshots and mini-bios
echo "[HEAVY] Step 1: Collect models + screenshots + bios"
npx tsx src/cli/index.ts collect \
  --count 1500 \
  --screenshots \
  --bios \
  --bio-batch 100

# 2. Build all 22 listicle pages
echo "[HEAVY] Step 2: Build all listicle pages"
npx tsx src/cli/index.ts build-pages

# 3. Re-inject internal links in blog posts (picks up new listicle/blog pages)
echo "[HEAVY] Step 3: Rebuild blog post internal links"
npx tsx src/cli/index.ts rebuild-blog-links || echo "[HEAVY] Blog link rebuild skipped (no posts yet)"

# 4. Regenerate sitemap
echo "[HEAVY] Step 4: Regenerate sitemap"
npx tsx src/cli/index.ts sitemap

echo "[HEAVY] Done at $(date '+%Y-%m-%d %H:%M:%S')"
