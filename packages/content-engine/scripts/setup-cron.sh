#!/bin/bash
# Setup crontab entries for the content engine
# Run this once on the server after deployment
#
# Usage:
#   bash packages/content-engine/scripts/setup-cron.sh [engine_dir]
#
# Example:
#   bash packages/content-engine/scripts/setup-cron.sh /var/www/xcamvip/packages/content-engine

set -euo pipefail

ENGINE_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

echo "Setting up cron for content engine at: $ENGINE_DIR"
echo ""

# Check that the scripts exist
if [ ! -f "$ENGINE_DIR/scripts/cron-heavy.sh" ] || [ ! -f "$ENGINE_DIR/scripts/cron-light.sh" ] || [ ! -f "$ENGINE_DIR/scripts/cron-blog.sh" ]; then
  echo "ERROR: Cron scripts not found in $ENGINE_DIR/scripts/"
  exit 1
fi

# Make scripts executable
chmod +x "$ENGINE_DIR/scripts/cron-heavy.sh"
chmod +x "$ENGINE_DIR/scripts/cron-light.sh"
chmod +x "$ENGINE_DIR/scripts/cron-blog.sh"

# Show what will be added
echo "The following crontab entries will be added:"
echo ""
echo "  # xcamvip content engine — heavy cycle (daily 2 AM)"
echo "  0 2 * * * $ENGINE_DIR/scripts/cron-heavy.sh >> /var/log/xcamvip-heavy.log 2>&1"
echo ""
echo "  # xcamvip content engine — light cycle (every 30 min)"
echo "  */30 * * * * $ENGINE_DIR/scripts/cron-light.sh >> /var/log/xcamvip-light.log 2>&1"
echo ""
echo "  # xcamvip content engine — blog autopilot (daily 4 AM)"
echo "  0 4 * * * $ENGINE_DIR/scripts/cron-blog.sh >> /var/log/xcamvip-blog.log 2>&1"
echo ""

# Check if already installed
if crontab -l 2>/dev/null | grep -q "xcamvip content engine"; then
  echo "WARNING: xcamvip cron entries already exist. Remove them first if you want to reinstall."
  echo "Run: crontab -e"
  exit 0
fi

echo "Add these to your crontab? (y/n)"
read -r CONFIRM

if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
  (crontab -l 2>/dev/null || true; echo ""; echo "# xcamvip content engine — heavy cycle (daily 2 AM)"; echo "0 2 * * * $ENGINE_DIR/scripts/cron-heavy.sh >> /var/log/xcamvip-heavy.log 2>&1"; echo ""; echo "# xcamvip content engine — light cycle (every 30 min)"; echo "*/30 * * * * $ENGINE_DIR/scripts/cron-light.sh >> /var/log/xcamvip-light.log 2>&1"; echo ""; echo "# xcamvip content engine — blog autopilot (daily 4 AM)"; echo "0 4 * * * $ENGINE_DIR/scripts/cron-blog.sh >> /var/log/xcamvip-blog.log 2>&1") | crontab -
  echo "Done! Cron entries added."
  echo "Verify with: crontab -l"
else
  echo "Skipped. Add manually with: crontab -e"
fi
