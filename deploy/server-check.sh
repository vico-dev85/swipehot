#!/bin/bash
WEBROOT="/home/deploy/swipehot"
OUT="$WEBROOT/check.txt"
echo "=== Server Check $(date) ===" > $OUT
echo "User: $(whoami)" >> $OUT
echo "Home: $HOME" >> $OUT
echo "OS: $(cat /etc/os-release 2>/dev/null | head -2)" >> $OUT
echo "Node: $(which node 2>/dev/null || echo 'NOT FOUND')" >> $OUT
echo "Node version: $(node -v 2>/dev/null || echo 'N/A')" >> $OUT
echo "NPM: $(which npm 2>/dev/null || echo 'NOT FOUND')" >> $OUT
echo "Redis: $(which redis-server 2>/dev/null || echo 'NOT FOUND')" >> $OUT
echo "Redis running: $(redis-cli ping 2>/dev/null || echo 'NO')" >> $OUT
echo "MySQL: $(which mysql 2>/dev/null || echo 'NOT FOUND')" >> $OUT
echo "Git: $(which git 2>/dev/null || echo 'NOT FOUND')" >> $OUT
echo "PM2: $(which pm2 2>/dev/null || echo 'NOT FOUND')" >> $OUT
echo "Nginx: $(which nginx 2>/dev/null || echo 'NOT FOUND')" >> $OUT
echo "Disk: $(df -h / 2>/dev/null | tail -1)" >> $OUT
echo "RAM: $(free -m 2>/dev/null | grep Mem)" >> $OUT
echo "=== Done ===" >> $OUT
