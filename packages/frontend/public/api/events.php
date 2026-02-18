<?php
/**
 * POST /api/events.php — batch analytics event ingestion
 *
 * Accepts { events: [...] } from the frontend tracker.
 * Inserts into MySQL with denormalized fields for fast queries.
 * Falls back to JSONL file if MySQL unavailable.
 */
require_once __DIR__ . '/_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST only']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Support both batch and single event
$events = [];
if (isset($body['events']) && is_array($body['events'])) {
    $events = $body['events'];
} elseif (isset($body['event_type'])) {
    $events = [$body];
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Expected { events: [...] }']);
    exit;
}

// Validate: must have session_id and event_type
$valid = array_filter($events, function($e) {
    return is_array($e)
        && !empty($e['session_id']) && is_string($e['session_id'])
        && !empty($e['event_type']) && is_string($e['event_type']);
});

if (empty($valid)) {
    http_response_code(400);
    echo json_encode(['error' => 'No valid events']);
    exit;
}

// ---------- MySQL persistence ----------
$logged = false;
if (MYSQL_PASS) {
    try {
        require_once __DIR__ . '/_db.php';
        $pdo = getDB();

        // Prepared statements
        $insertEvent = $pdo->prepare(
            'INSERT INTO events
                (session_id, visitor_id, event_type, event_timestamp, performer_id,
                 time_on_performer_ms, view_index, properties, device_type, referrer, schema_version)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        $upsertSession = $pdo->prepare(
            'INSERT INTO sessions
                (session_id, visitor_id, started_at, performers_viewed, cta_clicks, likes_count,
                 device_type, referrer, ab_variants)
             VALUES (?, ?, NOW(3), ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                ended_at = NOW(3),
                duration_ms = TIMESTAMPDIFF(MICROSECOND, started_at, NOW(3)) / 1000,
                performers_viewed = GREATEST(performers_viewed, VALUES(performers_viewed)),
                cta_clicks = GREATEST(cta_clicks, VALUES(cta_clicks)),
                likes_count = GREATEST(likes_count, VALUES(likes_count))'
        );

        $upsertDaily = $pdo->prepare(
            'INSERT INTO daily_visitors
                (visitor_id, visit_date, sessions_count, total_performers_viewed, total_cta_clicks, first_seen_date)
             VALUES (?, CURDATE(), 1, ?, ?, CURDATE())
             ON DUPLICATE KEY UPDATE
                sessions_count = sessions_count + 1,
                total_performers_viewed = GREATEST(total_performers_viewed, VALUES(total_performers_viewed)),
                total_cta_clicks = GREATEST(total_cta_clicks, VALUES(total_cta_clicks))'
        );

        foreach ($valid as $e) {
            $sessionId  = $e['session_id'];
            $visitorId  = $e['visitor_id'] ?? '';
            $eventType  = $e['event_type'];
            $timestamp  = $e['timestamp'] ?? date('c');
            $deviceType = $e['device_type'] ?? 'mobile';
            $referrer   = $e['referrer'] ?? null;
            $schemaVer  = (int)($e['schema_version'] ?? 1);

            // Extract denormalized fields from event properties
            $performerId = $e['performer_id'] ?? null;
            $timeOnPerf  = isset($e['time_on_performer_ms']) ? (int)$e['time_on_performer_ms'] : null;
            $viewIndex   = isset($e['view_index']) ? (int)$e['view_index'] : null;

            // Validate device_type enum
            if (!in_array($deviceType, ['mobile', 'tablet', 'desktop'])) {
                $deviceType = 'mobile';
            }

            // Insert into events table
            $insertEvent->execute([
                $sessionId,
                $visitorId,
                $eventType,
                $timestamp,
                $performerId,
                $timeOnPerf,
                $viewIndex,
                json_encode($e),
                $deviceType,
                $referrer ? substr($referrer, 0, 500) : null,
                $schemaVer,
            ]);

            // Upsert session summary from heartbeat events
            if ($eventType === 'session_heartbeat') {
                $upsertSession->execute([
                    $sessionId,
                    $visitorId,
                    (int)($e['performers_viewed'] ?? 0),
                    (int)($e['cta_clicks'] ?? 0),
                    (int)($e['likes_count'] ?? 0),
                    $deviceType,
                    $referrer ? substr($referrer, 0, 500) : null,
                    isset($e['ab_variants']) ? json_encode($e['ab_variants']) : null,
                ]);
            }

            // Upsert daily visitor
            if ($eventType === 'session_started' || $eventType === 'page_loaded') {
                $performersViewed = (int)($e['performers_viewed'] ?? 0);
                $ctaClicks = (int)($e['cta_clicks'] ?? 0);
                $upsertDaily->execute([
                    $visitorId,
                    $performersViewed,
                    $ctaClicks,
                ]);
            }
        }

        $logged = true;
    } catch (PDOException $ex) {
        error_log('xcam events MySQL error: ' . $ex->getMessage());
    }
}

// ---------- Fallback: JSONL file ----------
if (!$logged) {
    $logFile = CACHE_DIR . '/events.jsonl';
    $lines = '';
    foreach ($valid as $e) {
        $e['_logged_at'] = date('c');
        $lines .= json_encode($e) . "\n";
    }
    file_put_contents($logFile, $lines, FILE_APPEND | LOCK_EX);
}

http_response_code(202);
echo json_encode(['accepted' => count($valid)]);
