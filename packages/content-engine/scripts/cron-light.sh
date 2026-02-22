#!/bin/bash
# Light cron cycle — runs every 30 minutes
# Quick status refresh: collect online models (no screenshots/bios) + rebuild pages
#
# Crontab entry:
#   */30 * * * * /path/to/swipehot/packages/content-engine/scripts/cron-light.sh >> /var/log/swipehot-light.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$(dirname "$PKG_DIR")")"

# Add local Node.js to PATH (installed via install-node.php)
export PATH="$REPO_ROOT/_node/bin:$PATH"

cd "$PKG_DIR"

echo "----------------------------------------"
echo "[LIGHT] $(date '+%Y-%m-%d %H:%M:%S')"
echo "----------------------------------------"

# 1. Quick collect — update online status and viewer counts (no screenshots, no bios)
echo "[LIGHT] Step 1: Quick collect (1000 models, no screenshots/bios)"
npx tsx src/cli/index.ts collect --count 1000

# 2. Rebuild all 22 listicle pages with fresh scores
echo "[LIGHT] Step 2: Rebuild listicle pages"
npx tsx src/cli/index.ts build-pages

echo "[LIGHT] Done at $(date '+%Y-%m-%d %H:%M:%S')"
