<?php
/**
 * Shared configuration for swipe.hot PHP API
 * Upload this to: [webroot]/api/_config.php
 */

// Chaturbate API
define('CB_API_URL', 'https://chaturbate.com/api/public/affiliates/onlinerooms/');

// Affiliate config
define('AFFILIATE_CAMPAIGN', 'roGHG');
define('AFFILIATE_TOUR', '9oGW');
define('AFFILIATE_TRACK', 'swipehot-roulette');

// White label domain for embeds (Chaturbate white label on cams.swipe.hot)
define('WHITELABEL_DOMAIN', 'cams.swipe.hot');

// Cache directory (must be writable by PHP)
define('CACHE_DIR', sys_get_temp_dir() . '/swipehot_cache');

// Cache TTL in seconds
define('POOL_CACHE_TTL', 90);

// MySQL config (using xcam.vip database for testing)
define('MYSQL_HOST', 'localhost');
define('MYSQL_PORT', 3306);
define('MYSQL_USER', 'xcamvip_usr');
define('MYSQL_PASS', 'Mydatap123');
define('MYSQL_DB', 'xcamvip');

// Stats API key
define('STATS_KEY', 'TkJ45PVqOaJGwYCt');

// Admin dashboard password
define('ADMIN_PASS', 'Xcam2024!');

// CORS — restrict to our domain
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://swipe.hot', 'https://www.swipe.hot', 'http://swipe.hot'];
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
