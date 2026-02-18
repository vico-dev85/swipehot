<?php
echo "<pre>";
echo "=== Server Check ===\n";
echo "User: " . exec('whoami') . "\n";
echo "Node: " . exec('which node 2>/dev/null || echo NOT_FOUND') . "\n";
echo "Node version: " . exec('node -v 2>/dev/null || echo N/A') . "\n";
echo "NPM: " . exec('which npm 2>/dev/null || echo NOT_FOUND') . "\n";
echo "Redis: " . exec('which redis-server 2>/dev/null || echo NOT_FOUND') . "\n";
echo "Redis ping: " . exec('redis-cli ping 2>/dev/null || echo NO') . "\n";
echo "MySQL: " . exec('which mysql 2>/dev/null || echo NOT_FOUND') . "\n";
echo "Git: " . exec('which git 2>/dev/null || echo NOT_FOUND') . "\n";
echo "PM2: " . exec('which pm2 2>/dev/null || echo NOT_FOUND') . "\n";
echo "Nginx: " . exec('which nginx 2>/dev/null || echo NOT_FOUND') . "\n";
echo "PHP: " . phpversion() . "\n";
echo "OS: " . php_uname() . "\n";
echo "RAM: " . exec('free -m 2>/dev/null | grep Mem') . "\n";
echo "Disk: " . exec('df -h / 2>/dev/null | tail -1') . "\n";
echo "</pre>";
?>
