<?php
/**
 * Live status check for listicle pages.
 * Reads the pool cache (no extra CB API calls) and returns which models are online.
 *
 * GET /api/live-check.php?usernames=user1,user2,user3
 *
 * Response: {
 *   "online": { "user1": { "viewers": 1234, "image_url": "..." }, "user3": { ... } },
 *   "offline": ["user2"],
 *   "cache_age": 45
 * }
 */

require_once __DIR__ . '/_config.php';

$requestedNames = isset($_GET['usernames']) ? explode(',', $_GET['usernames']) : [];
$requestedNames = array_map('trim', $requestedNames);
$requestedNames = array_filter($requestedNames, function($n) { return strlen($n) > 0 && strlen($n) < 100; });

if (empty($requestedNames)) {
    echo json_encode(['error' => 'Missing usernames param']);
    exit;
}

// Cap at 50 to prevent abuse
$requestedNames = array_slice($requestedNames, 0, 50);

// Read pool cache (same files _pool.php uses — no extra API calls)
$onlineSet = [];
$cacheAge = null;

foreach (['f', 'm', 't', 'c'] as $gender) {
    $cacheFile = CACHE_DIR . "/pool_{$gender}.json";
    if (!file_exists($cacheFile)) continue;

    $mtime = filemtime($cacheFile);
    $age = time() - $mtime;
    if ($cacheAge === null || $age < $cacheAge) $cacheAge = $age;

    // Skip if cache is older than 5 minutes (very stale)
    if ($age > 300) continue;

    $cached = @json_decode(file_get_contents($cacheFile), true);
    if (!$cached || !isset($cached['performers'])) continue;

    foreach ($cached['performers'] as $p) {
        $slug = strtolower($p['username'] ?? $p['slug'] ?? '');
        if (!$slug) continue;
        $onlineSet[$slug] = [
            'viewers' => $p['num_users'] ?? 0,
            'image_url' => $p['image_url'] ?? '',
            'room_subject' => $p['room_subject'] ?? '',
        ];
    }
}

// Match requested names against online set
$online = [];
$offline = [];

foreach ($requestedNames as $name) {
    $lower = strtolower($name);
    if (isset($onlineSet[$lower])) {
        $online[$name] = $onlineSet[$lower];
    } else {
        $offline[] = $name;
    }
}

echo json_encode([
    'online' => $online,
    'offline' => $offline,
    'cache_age' => $cacheAge ?? -1,
    'pool_size' => count($onlineSet),
]);
