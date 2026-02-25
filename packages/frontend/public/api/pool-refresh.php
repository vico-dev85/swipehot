<?php
/**
 * Standalone pool cache refresh — keeps pool_{gender}.json fresh
 * for live-check.php even when no roulette users are active.
 *
 * Called by cron every 60 seconds:
 *   curl -s https://swipe.hot/api/pool-refresh.php?key=STATS_KEY
 *
 * This fetches from CB API for each gender and writes cache files.
 * live-check.php reads these same files — zero extra API calls from users.
 */

require_once __DIR__ . '/_config.php';

// Simple auth — reuse stats key
$key = $_GET['key'] ?? '';
if ($key !== STATS_KEY) {
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

$genders = ['f' => 500, 'm' => 200, 't' => 200, 'c' => 100];
$results = [];

foreach ($genders as $gender => $limit) {
    $cacheFile = CACHE_DIR . "/pool_{$gender}.json";

    // Skip if cache is still fresh (< 60s old)
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 60) {
        $results[$gender] = 'fresh';
        continue;
    }

    // Fetch from CB API
    $url = CB_API_URL . '?' . http_build_query([
        'wm' => AFFILIATE_CAMPAIGN,
        'format' => 'json',
        'limit' => $limit,
        'gender' => $gender,
    ]);

    $ctx = stream_context_create([
        'http' => ['timeout' => 10, 'ignore_errors' => true],
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    if (!$raw) {
        $results[$gender] = 'api_error';
        continue;
    }

    $data = @json_decode($raw, true);
    if (!$data || !isset($data['results'])) {
        $results[$gender] = 'parse_error';
        continue;
    }

    // Write cache in same format _pool.php uses
    $performers = [];
    foreach ($data['results'] as $room) {
        $performers[] = [
            'username' => $room['slug'] ?? $room['username'] ?? '',
            'slug' => $room['slug'] ?? '',
            'display_name' => $room['display_name'] ?? '',
            'num_users' => $room['num_users'] ?? 0,
            'num_followers' => $room['num_followers'] ?? 0,
            'image_url' => $room['image_url'] ?? '',
            'room_subject' => $room['room_subject'] ?? '',
            'gender' => $room['gender'] ?? $gender,
            'age' => $room['age'] ?? null,
            'tags' => $room['tags'] ?? [],
            'is_hd' => $room['is_hd'] ?? false,
            'seconds_online' => $room['seconds_online'] ?? 0,
            'country' => $room['country'] ?? '',
        ];
    }

    $cacheData = [
        'performers' => $performers,
        'fetched_at' => time(),
        'gender' => $gender,
        'count' => count($performers),
    ];

    @file_put_contents($cacheFile, json_encode($cacheData), LOCK_EX);
    $results[$gender] = count($performers) . ' models';
}

echo json_encode([
    'status' => 'ok',
    'refreshed' => $results,
    'time' => date('H:i:s'),
]);
