#!/bin/bash
# Blog autopilot — runs daily at 4:00 AM server time (after heavy cron at 2 AM)
# Generates 2 blog posts per day from the priority queue.
# Self-correcting: if validation fails, feeds issues back to AI for revision.
# Stops automatically when the queue is empty.
#
# Crontab entry:
#   0 4 * * * /path/to/xcamvip/packages/content-engine/scripts/cron-blog.sh >> /var/log/xcamvip-blog.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PKG_DIR"

POSTS_PER_RUN=2

echo "========================================"
echo "[BLOG] $(date '+%Y-%m-%d %H:%M:%S')"
echo "[BLOG] Autopilot: generating up to $POSTS_PER_RUN posts"
echo "========================================"

# Generate blog posts (batch handles dedup, priority, and sitemap regen)
npx tsx src/cli/index.ts generate-blog-batch --count "$POSTS_PER_RUN"

# Rebuild internal links across all published posts (new posts = new link targets)
echo "[BLOG] Rebuilding internal links across all published posts..."
npx tsx src/cli/index.ts rebuild-blog-links || echo "[BLOG] Link rebuild skipped (no posts yet)"

# Regenerate sitemap with new blog URLs
echo "[BLOG] Regenerating sitemap..."
npx tsx src/cli/index.ts sitemap

echo "[BLOG] Done at $(date '+%Y-%m-%d %H:%M:%S')"
