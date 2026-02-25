<?php
/**
 * LiveJasmin / AWEmpire API proxy — fetches live performers via Model Feed API.
 * Server-side to protect accessKey.
 *
 * GET /api/livejasmin-pool.php?category=girl&count=50
 * GET /api/livejasmin-pool.php?category=girl&count=50&session_id=xxx
 * GET /api/livejasmin-pool.php?category=girl&count=50&extended=1
 * GET /api/livejasmin-pool.php?category=girl&count=50&status_filter=free_chat
 * Returns JSON array of performers.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// --- AWEmpire credentials ---
$psId = 'vicoawe';
$accessKey = '1085f0ec55c13d0eaa41510a7ce5ee07';

// --- Params ---
$category = $_GET['category'] ?? 'girl';
$count = min((int)($_GET['count'] ?? 100), 500);
$sessionId = $_GET['session_id'] ?? '';
$extended = (bool)($_GET['extended'] ?? 0);
$statusFilter = $_GET['status_filter'] ?? ''; // free_chat, member_chat, or empty for all online
$imageSizes = $_GET['image_sizes'] ?? '320x180,896x504';

// Map our gender codes to LiveJasmin categories
$genderToCat = [
    'f' => 'girl',
    'm' => 'boy',
    't' => 'transgender',
    'c' => 'couple',
    'all' => 'girl', // default
];
// Allow both category names and gender codes
if (isset($genderToCat[$category])) {
    $category = $genderToCat[$category];
}

// Valid categories
$validCats = ['boy','couple','fetish','gay','girl','group','hot flirt','lesbian','mature','soul mate','transgender'];
if (!in_array($category, $validCats)) {
    $category = 'girl';
}

// --- Cache ---
$cacheDir = sys_get_temp_dir() . '/livejasmin-cache';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
$cacheKey = md5("lj_{$category}_{$count}_{$extended}_{$imageSizes}");
$cacheFile = "$cacheDir/$cacheKey.json";
$cacheTTL = 60; // seconds

$performers = null;
$totalCount = 0;
$fromCache = false;

if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTTL) {
    $cached = json_decode(file_get_contents($cacheFile), true);
    if ($cached) {
        $performers = $cached['performers'];
        $totalCount = $cached['total'];
        $fromCache = true;
    }
}

if ($performers === null) {
    // --- Fetch from AWEmpire Model Feed API ---
    $fetchCount = min($count * 2, 1000); // fetch extra for filtering

    $apiUrl = 'https://atwmcd.com/api/model/feed?' . http_build_query([
        'psId' => $psId,
        'accessKey' => $accessKey,
        'category' => $category,
        'limit' => $fetchCount,
        'responseFormat' => 'json',
        'imageSizes' => $imageSizes,
        'imageType' => 'erotic',
        'siteId' => 'jsm',
        'psProgram' => 'revs',
        'extendedDetails' => $extended ? 1 : 0,
    ]);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'SwipeHot/1.0');
    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($curlError) {
        http_response_code(502);
        echo json_encode(['error' => 'AWEmpire API error: ' . $curlError]);
        exit;
    }

    $data = json_decode($response, true);
    if (!$data || ($data['status'] ?? '') !== 'OK') {
        http_response_code(502);
        echo json_encode([
            'error' => 'AWEmpire API returned error',
            'status' => $data['status'] ?? 'unknown',
            'errorCode' => $data['errorCode'] ?? -1,
            'http_code' => $httpCode,
        ]);
        exit;
    }

    $models = $data['data']['models'] ?? [];
    $totalCount = count($models);
    $performers = [];

    foreach ($models as $m) {
        $status = $m['status'] ?? 'offline';

        // Skip offline
        if ($status === 'offline') continue;

        // Optional status filter
        if ($statusFilter && $status !== $statusFilter) continue;

        $performerId = $m['performerId'] ?? '';
        if (!$performerId) continue;

        // Build profile image URLs
        $images = [];
        if (isset($m['profilePictureUrl'])) {
            $images = $m['profilePictureUrl'];
        }

        // Extract person details
        $person = $m['persons'][0] ?? [];
        $sex = $person['sex'] ?? '';
        $age = (int)($person['age'] ?? 0);
        $body = $person['body'] ?? [];

        // Extended details
        $details = $m['details'] ?? [];
        $rating = (float)($details['modelRating'] ?? 0);
        $willingnesses = $details['willingnesses'] ?? [];

        $perf = [
            'id' => $performerId,
            'name' => $performerId,
            'status' => $status,
            'category' => $m['category'] ?? $category,
            'ethnicity' => $m['ethnicity'] ?? '',
            'country' => $m['country'] ?? '',
            'banned_countries' => $m['bannedCountries'] ?? [],
            'sex' => $sex,
            'age' => $age,
            'rating' => $rating,
            'chat_room_url' => $m['chatRoomUrl'] ?? '',
            'images' => $images,
            'willingnesses' => $willingnesses,
        ];

        // Extended fields
        if ($extended) {
            $perf['charge_amount'] = $details['chargeAmount'] ?? '';
            $perf['stream_quality'] = (int)($details['streamQuality'] ?? 0);
            $perf['biography'] = $details['about']['biography'] ?? '';
            $perf['languages'] = $details['languages'] ?? [];
            $perf['appearances'] = $details['appearances'] ?? [];
            $perf['sexual_preference'] = $person['sexualPreference'] ?? '';
            $perf['build'] = $body['build'] ?? '';
            $perf['hair_length'] = $body['hairLength'] ?? '';
            $perf['hair_color'] = $body['hairColor'] ?? '';
            $perf['eye_color'] = $body['eyeColor'] ?? '';
            $perf['breast_size'] = $body['breastSize'] ?? '';
        }

        $performers[] = $perf;
    }

    // Cache results
    @file_put_contents($cacheFile, json_encode([
        'performers' => $performers,
        'total' => $totalCount,
        'cached_at' => time(),
    ]));
}

// --- Country ban filtering using client IP ---
$clientIp = '';
if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
    $clientIp = $_SERVER['HTTP_CLIENT_IP'];
} elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $clientIp = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
} else {
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? '';
}

$bannedFiltered = 0;
if ($clientIp && $clientIp !== '127.0.0.1' && $clientIp !== '::1') {
    // Try GeoIP if available
    $clientCountry = '';
    if (function_exists('geoip_country_code_by_name')) {
        $clientCountry = @geoip_country_code_by_name($clientIp);
        if ($clientCountry === 'US' && function_exists('geoip_record_by_name')) {
            $record = @geoip_record_by_name($clientIp);
            if ($record && !empty($record['region'])) {
                $clientCountry = 'US:' . $record['region'];
            }
        }
    }

    if ($clientCountry) {
        $filtered = [];
        foreach ($performers as $p) {
            if (!in_array($clientCountry, $p['banned_countries'])) {
                $filtered[] = $p;
            } else {
                $bannedFiltered++;
            }
        }
        $performers = $filtered;
    }
}

// --- Seen-set: filter out already-seen performers ---
$seenFiltered = 0;
if ($sessionId) {
    $seenDir = sys_get_temp_dir() . '/livejasmin-seen';
    if (!is_dir($seenDir)) @mkdir($seenDir, 0755, true);
    $seenFile = "$seenDir/" . preg_replace('/[^a-zA-Z0-9_-]/', '', $sessionId) . '.json';

    $seen = [];
    if (file_exists($seenFile)) {
        $seenData = json_decode(file_get_contents($seenFile), true);
        if ($seenData && (time() - ($seenData['ts'] ?? 0)) < 7200) {
            $seen = $seenData['names'] ?? [];
        }
    }

    $seenSet = array_flip($seen);
    $unseen = [];
    foreach ($performers as $p) {
        if (!isset($seenSet[$p['name']])) {
            $unseen[] = $p;
            $seen[] = $p['name'];
        } else {
            $seenFiltered++;
        }
    }

    if (count($seen) > 500) {
        $seen = array_slice($seen, -400);
    }

    @file_put_contents($seenFile, json_encode(['ts' => time(), 'names' => $seen]));
    $performers = $unseen;
}

// Trim to requested count
$performers = array_slice($performers, 0, $count);

echo json_encode([
    'total' => $totalCount,
    'count' => count($performers),
    'from_cache' => $fromCache,
    'seen_filtered' => $seenFiltered,
    'banned_filtered' => $bannedFiltered,
    'client_ip' => $clientIp,
    'performers' => $performers,
]);
