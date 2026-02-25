<?php
/**
 * Streamate API proxy — fetches live performers via SMLive XML API.
 * Validates each performer is actually in public free chat via manifest server.
 * Server-side only (Streamate blocks CORS from client).
 *
 * GET /api/streamate-pool.php?gender=f&count=50
 * GET /api/streamate-pool.php?gender=f&count=50&verify=1  (slower but no black screens)
 * GET /api/streamate-pool.php?gender=f&count=50&session_id=xxx  (seen-set tracking)
 * Returns JSON array of performers.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$gender = $_GET['gender'] ?? 'f';
$count = min((int)($_GET['count'] ?? 50), 500);
$page = max((int)($_GET['page'] ?? 1), 1);
$verify = (bool)($_GET['verify'] ?? 0);
$sessionId = $_GET['session_id'] ?? '';

// Map our gender codes to Streamate's
$genderMap = [
    'f' => 'f',
    'm' => 'm',
    't' => 'tm2f',
    'c' => 'mf',
    'all' => 'f,ff,m,mm,mf,tm2f',
];
$smGender = $genderMap[$gender] ?? 'f';

// --- Cache: store API results for 60s to reduce API calls ---
$cacheDir = sys_get_temp_dir() . '/streamate-cache';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
$cacheKey = md5("sm_{$smGender}_{$count}_{$page}");
$cacheFile = "$cacheDir/$cacheKey.json";
$cacheTTL = 60; // seconds — short to keep pool fresh

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
    // --- Fetch from SMLive API ---
    // Request more than needed so we have buffer after filtering
    $fetchCount = $verify ? min($count * 3, 500) : $count;

    $xmlRequest = '<?xml version="1.0" encoding="UTF-8"?>
<SMLQuery>
  <Options MaxResults="' . $fetchCount . '" />
  <AvailablePerformers Exact="false" PageNum="' . $page . '" CountTotalResults="true" QueryId="swipehot">
    <Include>
      <Descriptions />
      <Media>biopic,staticbiopic</Media>
      <FreeChatSort />
      <HDSort>1</HDSort>
    </Include>
    <Constraints>
      <PublicProfile />
      <StreamType>live</StreamType>
      <Gender>' . htmlspecialchars($smGender) . '</Gender>
      <Audio />
    </Constraints>
  </AvailablePerformers>
</SMLQuery>';

    $url = 'http://affiliate.streamate.com/SMLive/SMLResult.xml';
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: text/xml']);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $xmlRequest);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $xmlResponse = curl_exec($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        http_response_code(502);
        echo json_encode(['error' => 'Streamate API error: ' . $curlError]);
        exit;
    }

    // Parse XML
    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($xmlResponse);
    if (!$xml) {
        http_response_code(502);
        echo json_encode(['error' => 'Failed to parse Streamate XML response']);
        exit;
    }
    if (isset($xml->ERROR)) {
        http_response_code(502);
        echo json_encode(['error' => 'Streamate: ' . (string)$xml->ERROR->Message]);
        exit;
    }

    $ap = $xml->AvailablePerformers;
    $totalCount = (int)($ap['TotalResultCount'] ?? 0);
    $performers = [];

    foreach ($ap->Performer as $p) {
        $attrs = $p->attributes();
        $name = (string)$attrs['Name'];

        // Filter out Gold Show performers via PerfFlag bitmask
        $perfFlag = (int)($attrs['PerfFlag'] ?? 0);
        $inGoldShow = ($perfFlag & 0x00100000) !== 0;
        if ($inGoldShow) continue;

        $isHD = ($perfFlag & 0x10000000) !== 0;
        $isWidescreen = ($perfFlag & 0x00000800) !== 0;

        // Get thumbnail URL
        $thumbUrl = '';
        $fullUrl = '';
        if (isset($p->Media->Pic->Thumb['Src'])) {
            $thumbUrl = (string)$p->Media->Pic->Thumb['Src'];
            if (strpos($thumbUrl, 'http') !== 0) {
                $thumbUrl = 'https://static.gfx.streamate.com' . $thumbUrl;
            }
        }
        if (isset($p->Media->Pic->Full['Src'])) {
            $fullUrl = (string)$p->Media->Pic->Full['Src'];
            if (strpos($fullUrl, 'http') !== 0) {
                $fullUrl = 'https://static.gfx.streamate.com' . $fullUrl;
            }
        }

        $performers[] = [
            'id' => (int)$attrs['Id'],
            'name' => $name,
            'age' => (int)($attrs['Age'] ?? 0),
            'gender' => (string)($attrs['Gender'] ?? ''),
            'ethnicity' => (string)($attrs['Ethnicity'] ?? ''),
            'hair_color' => (string)($attrs['HairColor'] ?? ''),
            'build' => (string)($attrs['Build'] ?? ''),
            'audio' => ((string)($attrs['Audio'] ?? '')) === 'true',
            'free_chat_audio' => ((string)($attrs['FreeChatAudio'] ?? '')) === 'true',
            'is_hd' => $isHD,
            'is_widescreen' => $isWidescreen,
            'theme' => (string)($attrs['Theme'] ?? ''),
            'fetishes' => (string)($attrs['Fetishes'] ?? ''),
            'language' => (string)($attrs['Language'] ?? ''),
            'thumb_url' => $thumbUrl,
            'image_url' => $fullUrl,
            'embed_url' => 'https://hybridclient.naiadsystems.com/purecam?performer=' . urlencode($name) . '&widescreen=true',
        ];
    }

    // --- Verify performers are in public free chat via manifest server ---
    if ($verify && count($performers) > 0) {
        $verified = [];
        // Use curl_multi to check in parallel (fast)
        $mh = curl_multi_init();
        $handles = [];

        foreach ($performers as $i => $perf) {
            $ch = curl_init();
            $manifestUrl = 'https://manifest-server.naiadsystems.com/live/s:' . urlencode($perf['name']) . '.json?last=load&format=mp4-hls';
            curl_setopt($ch, CURLOPT_URL, $manifestUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_NOBODY, false);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_multi_add_handle($mh, $ch);
            $handles[$i] = $ch;
        }

        // Execute all requests in parallel
        $running = null;
        do {
            curl_multi_exec($mh, $running);
            curl_multi_select($mh, 0.1);
        } while ($running > 0);

        // Check results
        foreach ($handles as $i => $ch) {
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            if ($httpCode === 200) {
                $verified[] = $performers[$i];
            }
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
        }
        curl_multi_close($mh);

        $performers = $verified;
    }

    // Trim to requested count
    $performers = array_slice($performers, 0, $count);

    // Cache the results
    @file_put_contents($cacheFile, json_encode([
        'performers' => $performers,
        'total' => $totalCount,
        'cached_at' => time(),
    ]));
}

// --- Seen-set: filter out already-seen performers ---
$seenFiltered = 0;
if ($sessionId) {
    $seenDir = sys_get_temp_dir() . '/streamate-seen';
    if (!is_dir($seenDir)) @mkdir($seenDir, 0755, true);
    $seenFile = "$seenDir/" . preg_replace('/[^a-zA-Z0-9_-]/', '', $sessionId) . '.json';

    $seen = [];
    if (file_exists($seenFile)) {
        $seenData = json_decode(file_get_contents($seenFile), true);
        // TTL: 2 hours
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

    // Cap seen list at 500
    if (count($seen) > 500) {
        $seen = array_slice($seen, -400);
    }

    @file_put_contents($seenFile, json_encode(['ts' => time(), 'names' => $seen]));
    $performers = $unseen;
}

echo json_encode([
    'total' => $totalCount,
    'count' => count($performers),
    'from_cache' => $fromCache,
    'seen_filtered' => $seenFiltered,
    'performers' => $performers,
]);
