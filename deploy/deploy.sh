#!/bin/bash
# xcam.vip deployment script
# Usage: ./deploy/deploy.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=== xcam.vip deploy ==="
echo "Project: $PROJECT_DIR"
echo ""

# Pull latest code
echo "--- git pull ---"
git pull --ff-only

# Install deps
echo "--- npm ci ---"
npm ci --production=false

# Build all packages (shared → api → frontend)
echo "--- build:prod ---"
npm run build:prod

# Ensure log directory exists
sudo mkdir -p /var/log/xcamvip
sudo chown "$(whoami)" /var/log/xcamvip

# Restart API via PM2
echo "--- PM2 restart ---"
if pm2 describe xcamvip-api > /dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo ""
echo "=== Deploy complete ==="
pm2 status xcamvip-api
