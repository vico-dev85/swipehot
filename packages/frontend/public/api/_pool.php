<?php
/**
 * Pool fetching and caching — shared library
 * Fetches performers from Chaturbate API, caches in temp files.
 */

require_once __DIR__ . '/_config.php';

// Tag synonyms for normalization (from pool-fetcher.ts)
$TAG_SYNONYMS = [
    'latina' => ['latina','latin','colombian','mexican','brazilian','spanish'],
    'asian' => ['asian','japanese','korean','chinese','thai','filipina'],
    'ebony' => ['ebony','black','african'],
    'bigboobs' => ['bigboobs','bigtits','hugetits','busty','bigbreasts'],
    'smalltits' => ['smalltits','tinytits','flatchest','petite'],
    'milf' => ['milf','mature','mom','mommy'],
    'teen' => ['teen','18','young','barely legal'],
    'blonde' => ['blonde','blond'],
    'brunette' => ['brunette','darkhaair'],
    'redhead' => ['redhead','ginger','red hair'],
    'anal' => ['anal','ass','butt'],
    'lovense' => ['lovense','lush','ohmibod','interactive','toy'],
    'squirt' => ['squirt','squirting'],
    'bdsm' => ['bdsm','bondage','domination','submissive'],
    'feet' => ['feet','foot','footfetish','soles'],
    'hairy' => ['hairy','bush','natural'],
    'tattoo' => ['tattoo','tattoos','tattooed','inked'],
    'curvy' => ['curvy','bbw','thick','chubby','plussize'],
    'skinny' => ['skinny','slim','thin','fit'],
    'couple' => ['couple','couples','duo'],
    'lesbian' => ['lesbian','lesbians','girlongirl'],
    'muscle' => ['muscle','muscular','fit','athletic','bodybuilder'],
];

// Build reverse lookup
$tagToCanonical = [];
foreach ($TAG_SYNONYMS as $canonical => $synonyms) {
    foreach ($synonyms as $syn) {
        $tagToCanonical[strtolower($syn)] = $canonical;
    }
}

function normalizeTags(array $rawTags): array {
    global $tagToCanonical;
    $normalized = [];
    foreach ($rawTags as $raw) {
        $lower = strtolower(trim($raw));
        $canonical = $tagToCanonical[$lower] ?? $lower;
        $normalized[$canonical] = true;
    }
    return array_keys($normalized);
}

function calculateQualityScore(array $p): float {
    $score = 0;
    $score += log10(max($p['num_users'], 1)) * 25;
    if (!empty($p['is_hd'])) $score += 15;
    $minutesOnline = ($p['seconds_online'] ?? 0) / 60;
    if ($minutesOnline >= 10 && $minutesOnline <= 60) $score += 10;
    elseif ($minutesOnline > 60 && $minutesOnline <= 120) $score += 5;
    if ($p['num_users'] < 1) $score -= 50;
    return round($score * 100) / 100;
}

function mapGender(string $g): string {
    $map = ['f'=>'f','m'=>'m','t'=>'t','c'=>'c','s'=>'c'];
    return $map[$g] ?? 'f';
}

// Known countries for synthetic tag generation
$KNOWN_COUNTRIES = [
    'US','CO','RO','RU','UA','GB','ES','MX','BR','DE','FR','IT','CA','AU',
    'NL','PL','CZ','AR','CL','PE','PH','TH','JP','KR','IN','ZA','NZ','SE',
    'LT','LV','EE','HU','PT','VE','EC',
];

function buildSyntheticTags(?int $age, string $country): array {
    global $KNOWN_COUNTRIES;
    $tags = [];

    // Age bucket — only legit ages (18-69)
    if ($age !== null && $age >= 18 && $age <= 69) {
        if ($age <= 22) $tags[] = 'age_18_22';
        elseif ($age <= 30) $tags[] = 'age_23_30';
        elseif ($age <= 40) $tags[] = 'age_31_40';
        else $tags[] = 'age_41_plus';
    }

    // Country — only known 2-letter codes
    $upper = strtoupper(trim($country));
    if (strlen($upper) === 2 && in_array($upper, $KNOWN_COUNTRIES)) {
        $tags[] = 'country_' . strtolower($upper);
    }

    return $tags;
}

/**
 * Fetch performers from Chaturbate API for a gender.
 */
function fetchFromCB(string $gender, int $limit = 500): array {
    $params = http_build_query([
        'wm' => AFFILIATE_CAMPAIGN,
        'client_ip' => 'request_ip',
        'limit' => $limit,
        'format' => 'json',
    ]);
    if ($gender !== 'all') {
        $params .= '&gender=' . urlencode($gender);
    }

    $url = CB_API_URL . '?' . $params;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code !== 200 || !$body) return [];

    $data = json_decode($body, true);
    return $data['results'] ?? [];
}

/**
 * Process raw CB performers into our cached format.
 */
function processPerformers(array $raw): array {
    $now = time();
    $result = [];
    foreach ($raw as $p) {
        if (($p['num_users'] ?? 0) < 1) continue;
        // Only include public shows — private/hidden embeds won't work
        if (($p['current_show'] ?? '') !== 'public') continue;
        $result[] = [
            'username' => $p['username'],
            'display_name' => $p['display_name'] ?: $p['username'],
            'gender' => mapGender($p['gender'] ?? 'f'),
            'age' => $p['age'] ?? null,
            'num_users' => (int)$p['num_users'],
            'country' => $p['country'] ?? '',
            'spoken_languages' => $p['spoken_languages'] ?? '',
            'tags' => $p['tags'] ?? [],
            'normalized_tags' => array_merge(
                normalizeTags($p['tags'] ?? []),
                buildSyntheticTags($p['age'] ?? null, $p['country'] ?? '')
            ),
            'image_url' => $p['image_url_360x270'] ?: ($p['image_url'] ?? ''),
            'iframe_embed' => $p['iframe_embed_revshare'] ?: ($p['iframe_embed'] ?? ''),
            'chat_room_url' => $p['chat_room_url_revshare'] ?: ($p['chat_room_url'] ?? ''),
            'room_subject' => $p['room_subject'] ?? '',
            'is_hd' => !empty($p['is_hd']),
            'seconds_online' => (int)($p['seconds_online'] ?? 0),
            'quality_score' => calculateQualityScore($p),
            'fetched_at' => $now,
        ];
    }
    // Sort by quality score descending
    usort($result, fn($a, $b) => $b['quality_score'] <=> $a['quality_score']);
    return $result;
}

/**
 * Get pool for a gender — uses file cache with TTL.
 * If cache is stale, fetches fresh data from CB API.
 */
function getPool(string $gender = 'all'): array {
    $validGenders = ['all', 'f', 'm', 't', 'c'];
    if (!in_array($gender, $validGenders)) $gender = 'all';

    $cacheFile = CACHE_DIR . '/pool_' . $gender . '.json';

    // Check cache freshness
    if (file_exists($cacheFile)) {
        $age = time() - filemtime($cacheFile);
        if ($age < POOL_CACHE_TTL) {
            $data = json_decode(file_get_contents($cacheFile), true);
            if ($data) return $data;
        }
    }

    // Cache miss or stale — fetch fresh
    $limits = ['all' => 500, 'f' => 500, 'm' => 200, 't' => 200, 'c' => 200];
    $limit = $limits[$gender] ?? 500;
    $raw = fetchFromCB($gender, $limit);
    if (empty($raw)) {
        // If fetch fails, return stale cache if available
        if (file_exists($cacheFile)) {
            return json_decode(file_get_contents($cacheFile), true) ?: [];
        }
        return [];
    }

    $processed = processPerformers($raw);
    file_put_contents($cacheFile, json_encode($processed));
    return $processed;
}

/**
 * Build embed URL for iframe.
 */
function buildEmbedUrl(array $performer, string $sessionId = ''): string {
    $params = [
        'tour' => AFFILIATE_TOUR,
        'campaign' => AFFILIATE_CAMPAIGN,
        'track' => AFFILIATE_TRACK,
        'disable_sound' => '1',
        'mobileRedirect' => 'auto',
        'embed_video_only' => '1',
    ];
    if ($sessionId) {
        $params['sid'] = $sessionId . '_' . $performer['username'];
    }
    return 'https://' . WHITELABEL_DOMAIN . '/embed/' . urlencode($performer['username']) . '/?' . http_build_query($params);
}

/**
 * Build CTA room URL with affiliate tracking + sid for postback.
 */
function buildRoomUrl(array $performer, string $sessionId): string {
    $params = http_build_query([
        'track' => AFFILIATE_TRACK,
        'room' => $performer['username'],
        'sid' => $sessionId . '_' . $performer['username'],
    ]);
    return 'https://' . WHITELABEL_DOMAIN . '/accounts/register/?' . $params;
}

/**
 * Get session's seen performers (stored in file).
 */
function getSeenSet(string $sessionId): array {
    $file = CACHE_DIR . '/seen_' . md5($sessionId) . '.json';
    if (!file_exists($file)) return [];
    $age = time() - filemtime($file);
    if ($age > 7200) { // 2 hour TTL
        @unlink($file);
        return [];
    }
    return json_decode(file_get_contents($file), true) ?: [];
}

function markSeen(string $sessionId, string $username): void {
    $file = CACHE_DIR . '/seen_' . md5($sessionId) . '.json';
    $seen = getSeenSet($sessionId);
    $seen[] = $username;
    // Cap at 500 — enough for a long session without repeats
    if (count($seen) > 500) $seen = array_slice($seen, -400);
    file_put_contents($file, json_encode($seen));
}

/**
 * Personalized performer selection (blended scoring).
 */
function selectPerformer(array $pool, array $seen, array $preferTags, float $alpha): ?array {
    // Filter out seen
    $seenMap = array_flip($seen);
    $unseen = array_filter($pool, fn($p) => !isset($seenMap[$p['username']]));
    $unseen = array_values($unseen);

    if (empty($unseen)) return null;

    // 30% exploration: random pick
    if (mt_rand(1, 100) <= 30) {
        return $unseen[array_rand($unseen)];
    }

    // Normalize popularity scores
    $minQ = PHP_FLOAT_MAX; $maxQ = PHP_FLOAT_MIN;
    foreach ($unseen as $p) {
        if ($p['quality_score'] < $minQ) $minQ = $p['quality_score'];
        if ($p['quality_score'] > $maxQ) $maxQ = $p['quality_score'];
    }
    $range = $maxQ - $minQ ?: 1;

    // Score each performer
    $scored = [];
    foreach ($unseen as $p) {
        $popScore = (($p['quality_score'] - $minQ) / $range) * 100;

        // Personal score from tag overlap
        $persScore = 0;
        if (!empty($preferTags)) {
            $tagCount = count($preferTags);
            foreach ($preferTags as $i => $tag) {
                if (in_array($tag, $p['normalized_tags'])) {
                    $persScore += ($tagCount - $i) / $tagCount;
                }
            }
            $persScore = ($persScore / $tagCount) * 100;
        }

        $blended = $alpha * $persScore + (1 - $alpha) * $popScore;
        $scored[] = ['performer' => $p, 'score' => $blended];
    }

    // Sort by score descending
    usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);

    // Weighted random from top 25%
    $topCount = max(1, (int)ceil(count($scored) * 0.25));
    $top = array_slice($scored, 0, $topCount);
    $totalWeight = array_sum(array_map(fn($s) => max($s['score'], 0.1), $top));
    $rand = mt_rand() / mt_getrandmax() * $totalWeight;

    foreach ($top as $entry) {
        $rand -= max($entry['score'], 0.1);
        if ($rand <= 0) return $entry['performer'];
    }

    return $top[count($top) - 1]['performer'];
}
