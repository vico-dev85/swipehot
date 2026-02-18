<?php
/**
 * GET /api/pool-next.php?session_id=xxx&gender=all&prefer_tags=latina,asian&alpha=0.5
 * Returns next unseen performer with personalized selection.
 */
require_once __DIR__ . '/_pool.php';

$sessionId = $_GET['session_id'] ?? '';
$gender = $_GET['gender'] ?? 'all';
$preferTagsRaw = $_GET['prefer_tags'] ?? '';
$alpha = min(0.85, max(0, (float)($_GET['alpha'] ?? 0)));

// Validate session ID (32-char hex)
if (!$sessionId || !preg_match('/^[a-f0-9]{16,64}$/i', $sessionId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing session_id']);
    exit;
}

// Parse preferred tags
$preferTags = $preferTagsRaw ? array_map('trim', explode(',', strtolower($preferTagsRaw))) : [];

// Get cached pool
$pool = getPool($gender);
if (empty($pool)) {
    http_response_code(503);
    echo json_encode(['error' => 'Pool empty — data not yet available, try again in a moment']);
    exit;
}

// Get seen set
$seen = getSeenSet($sessionId);

// Select performer
$match = selectPerformer($pool, $seen, $preferTags, $alpha);

// If all seen, force fresh pool fetch and try again
if (!$match) {
    // Invalidate cache by deleting cache file, then re-fetch
    $cacheFile = CACHE_DIR . '/pool_' . $gender . '.json';
    @unlink($cacheFile);
    $freshPool = getPool($gender);
    if (!empty($freshPool)) {
        $match = selectPerformer($freshPool, $seen, $preferTags, $alpha);
    }
    // Still nothing? Pick random from fresh pool
    if (!$match) {
        $pool = !empty($freshPool) ? $freshPool : $pool;
        $match = $pool[array_rand($pool)];
    }
}

// Mark as seen
markSeen($sessionId, $match['username']);

// Build response (matches PerformerResponse interface)
echo json_encode([
    'username' => $match['username'],
    'display_name' => $match['display_name'],
    'gender' => $match['gender'],
    'age' => $match['age'],
    'num_users' => $match['num_users'],
    'country' => $match['country'] ?? '',
    'spoken_languages' => $match['spoken_languages'] ?? '',
    'tags' => $match['normalized_tags'],
    'image_url' => $match['image_url'],
    'embed_url' => buildEmbedUrl($match, $sessionId),
    'room_url' => buildRoomUrl($match, $sessionId),
    'room_subject' => $match['room_subject'],
    'is_hd' => $match['is_hd'],
]);
