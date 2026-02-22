#!/bin/bash
# swipe.hot deployment script
# Usage: ./deploy/deploy.sh [--with-content]
#
# Deploys SPA + PHP API. Add --with-content to also run content engine
# (collect models + rebuild listicle pages).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

WITH_CONTENT=false
for arg in "$@"; do
  [ "$arg" = "--with-content" ] && WITH_CONTENT=true
done

# Add local Node.js to PATH if installed
[ -d "$PROJECT_DIR/_node/bin" ] && export PATH="$PROJECT_DIR/_node/bin:$PATH"

echo "=== swipe.hot deploy ==="
echo "Project: $PROJECT_DIR"
echo "Node: $(node -v 2>/dev/null || echo 'NOT FOUND')"
echo ""

# Pull latest code
echo "--- git pull ---"
git pull --ff-only

# Install deps
echo "--- npm install ---"
npm ci --production=false

# Build frontend SPA
echo "--- build frontend ---"
npm run build:frontend

# Ensure log directory exists
mkdir -p /var/log/swipehot 2>/dev/null || sudo mkdir -p /var/log/swipehot
chown "$(whoami)" /var/log/swipehot 2>/dev/null || sudo chown "$(whoami)" /var/log/swipehot

# Content engine (optional)
if [ "$WITH_CONTENT" = true ]; then
  echo ""
  echo "--- content engine ---"
  CE_DIR="$PROJECT_DIR/packages/content-engine"
  if [ -f "$CE_DIR/.env" ]; then
    echo "Collecting models..."
    npx tsx "$CE_DIR/src/cli/index.ts" collect --count 1000
    echo "Building listicle pages..."
    npx tsx "$CE_DIR/src/cli/index.ts" build-pages
    echo "Regenerating sitemap..."
    npx tsx "$CE_DIR/src/cli/index.ts" sitemap
  else
    echo "SKIP: No .env found at $CE_DIR/.env"
    echo "Create it from .env.example and re-run with --with-content"
  fi
fi

echo ""
echo "=== Deploy complete ==="
echo "SPA:     packages/frontend/dist/"
echo "PHP API: packages/frontend/public/api/"
echo "Content: packages/frontend/public/ (models, blog, listicles)"
