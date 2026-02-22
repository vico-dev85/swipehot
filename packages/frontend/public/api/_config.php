<?php
/**
 * Shared configuration for PHP API
 * Edit these values for your setup / domain.
 */

// Chaturbate API
define('CB_API_URL', 'https://chaturbate.com/api/public/affiliates/onlinerooms/');

// Affiliate config
define('AFFILIATE_CAMPAIGN', 'roGHG');
define('AFFILIATE_TOUR', '9oGW');
define('AFFILIATE_TRACK', 'swipehot-roulette');

// White label domain for CTA links
define('WHITELABEL_DOMAIN', 'cams.swipe.hot');

// Cache directory (must be writable by PHP)
define('CACHE_DIR', sys_get_temp_dir() . '/swipehot_cache');

// Cache TTL in seconds
define('POOL_CACHE_TTL', 90); // 90 seconds

// MySQL config (for event logging)
define('MYSQL_HOST', 'localhost');
define('MYSQL_PORT', 3306);
define('MYSQL_USER', 'swipehot_usr');
define('MYSQL_PASS', '');  // <-- SET THIS
define('MYSQL_DB', 'swipehot');

// Stats API key (simple auth for /api/stats.php)
define('STATS_KEY', 'TkJ45PVqOaJGwYCt');  // <-- SET THIS to a random string

// Admin dashboard password — CHANGE THIS
define('ADMIN_PASS', 'changeme');

// CORS — restrict to our domain
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://swipe.hot', 'https://www.swipe.hot'];
if (in_array($origin, $allowed)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: https://swipe.hot');
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
