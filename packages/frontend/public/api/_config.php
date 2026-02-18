<?php
/**
 * Shared configuration for xcam.vip PHP API
 * Edit these values for your setup.
 */

// Chaturbate API
define('CB_API_URL', 'https://chaturbate.com/api/public/affiliates/onlinerooms/');

// Affiliate config
define('AFFILIATE_CAMPAIGN', 'roGHG');
define('AFFILIATE_TOUR', '9oGW');
define('AFFILIATE_TRACK', 'xcamvip-roulette');

// White label domain for CTA links
define('WHITELABEL_DOMAIN', 'www.xcam.vip');

// Cache directory (must be writable by PHP)
define('CACHE_DIR', sys_get_temp_dir() . '/xcam_cache');

// Cache TTL in seconds
define('POOL_CACHE_TTL', 90); // 90 seconds

// MySQL config (for event logging)
define('MYSQL_HOST', 'localhost');
define('MYSQL_PORT', 3306);
define('MYSQL_USER', 'xcamvip_usr');
define('MYSQL_PASS', 'Mydatap123');  // <-- SET THIS
define('MYSQL_DB', 'xcamvip');

// Stats API key (simple auth for /api/stats.php)
define('STATS_KEY', 'TkJ45PVqOaJGwYCt');  // <-- SET THIS to a random string

// Admin dashboard password — CHANGE THIS
define('ADMIN_PASS', 'Xcam2024!');

// CORS — restrict to our domain
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://xcam.vip', 'https://www.xcam.vip'];
if (in_array($origin, $allowed)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: https://xcam.vip');
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
