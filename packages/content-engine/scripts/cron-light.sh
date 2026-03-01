#!/bin/bash
# Light cron cycle — runs every 30 minutes
# Quick status refresh: collect online models (no screenshots/bios) + rebuild pages
#
# Crontab entry:
#   */30 * * * * /home/deploy/swipehot/packages/content-engine/scripts/cron-light.sh >> /var/log/swipehot-light.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$(dirname "$PKG_DIR")")"
DIST_DIR="$REPO_ROOT/packages/frontend/dist"
PUBLIC_DIR="$REPO_ROOT/packages/frontend/public"

# Add local Node.js to PATH (installed via install-node.php)
export PATH="$REPO_ROOT/_node/bin:$PATH"

cd "$PKG_DIR"

echo "----------------------------------------"
echo "[LIGHT] $(date '+%Y-%m-%d %H:%M:%S')"
echo "----------------------------------------"

# 1. Quick collect — update online status and viewer counts (no screenshots, no bios)
echo "[LIGHT] Step 1: Quick collect (fill-categories, no screenshots/bios)"
npx tsx src/cli/index.ts collect --fill-categories --count 500

# 2. Rebuild all 25 listicle pages with fresh scores
echo "[LIGHT] Step 2: Rebuild listicle pages"
npx tsx src/cli/index.ts build-pages

# 3. Copy rebuilt pages to dist/ (where nginx serves from)
echo "[LIGHT] Step 3: Sync pages to dist/"
cp -r "$PUBLIC_DIR/"*-cams "$DIST_DIR/"
cp -r "$PUBLIC_DIR/categories" "$DIST_DIR/"

echo "[LIGHT] Done at $(date '+%Y-%m-%d %H:%M:%S')"
