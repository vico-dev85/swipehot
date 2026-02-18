<?php
/**
 * GET /api/stats.php — quick analytics dashboard data
 *
 * Returns funnel metrics, session stats, and top performers.
 * Query params:
 *   ?period=today|24h|7d|30d (default: 24h)
 *   ?key=SECRET (simple auth — set STATS_KEY in _config.php)
 */
require_once __DIR__ . '/_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'GET only']);
    exit;
}

// Simple auth — prevent public access
$key = $_GET['key'] ?? '';
if (!defined('STATS_KEY') || !STATS_KEY || $key !== STATS_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized. Pass ?key=YOUR_STATS_KEY']);
    exit;
}

if (!MYSQL_PASS) {
    http_response_code(503);
    echo json_encode(['error' => 'MySQL not configured']);
    exit;
}

$period = $_GET['period'] ?? '24h';
$periodMap = [
    'today'  => 'DATE(event_timestamp) = CURDATE()',
    '24h'    => 'event_timestamp >= NOW() - INTERVAL 24 HOUR',
    '7d'     => 'event_timestamp >= NOW() - INTERVAL 7 DAY',
    '30d'    => 'event_timestamp >= NOW() - INTERVAL 30 DAY',
];
$where = $periodMap[$period] ?? $periodMap['24h'];

try {
    require_once __DIR__ . '/_db.php';
    $pdo = getDB();

    $result = [];

    // 1. Funnel — event counts
    $stmt = $pdo->query("
        SELECT event_type, COUNT(*) as cnt
        FROM events
        WHERE $where
        GROUP BY event_type
        ORDER BY cnt DESC
    ");
    $eventCounts = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $eventCounts[$row['event_type']] = (int)$row['cnt'];
    }
    $result['event_counts'] = $eventCounts;

    // 2. Funnel conversion rates
    $pageLoads = $eventCounts['page_loaded'] ?? 0;
    $starts = $eventCounts['start_clicked'] ?? $eventCounts['session_started'] ?? 0;
    $views = $eventCounts['performer_viewed'] ?? 0;
    $ctaClicks = $eventCounts['cta_clicked'] ?? 0;
    $headerCta = $eventCounts['header_cta_clicked'] ?? 0;

    $result['funnel'] = [
        'page_loads' => $pageLoads,
        'starts' => $starts,
        'start_rate' => $pageLoads > 0 ? round($starts / $pageLoads * 100, 1) : 0,
        'performer_views' => $views,
        'cta_clicks' => $ctaClicks + $headerCta,
        'cta_rate_from_starts' => $starts > 0 ? round(($ctaClicks + $headerCta) / $starts * 100, 1) : 0,
        'cta_rate_from_views' => $views > 0 ? round(($ctaClicks + $headerCta) / $views * 100, 2) : 0,
    ];

    // 3. Unique sessions & visitors
    $stmt = $pdo->query("
        SELECT
            COUNT(DISTINCT session_id) as unique_sessions,
            COUNT(DISTINCT visitor_id) as unique_visitors
        FROM events
        WHERE $where
    ");
    $result['uniques'] = $stmt->fetch(PDO::FETCH_ASSOC);
    $result['uniques']['unique_sessions'] = (int)$result['uniques']['unique_sessions'];
    $result['uniques']['unique_visitors'] = (int)$result['uniques']['unique_visitors'];

    // 4. Device breakdown
    $stmt = $pdo->query("
        SELECT device_type, COUNT(DISTINCT session_id) as sessions
        FROM events
        WHERE $where AND event_type = 'page_loaded'
        GROUP BY device_type
    ");
    $devices = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $devices[$row['device_type']] = (int)$row['sessions'];
    }
    $result['devices'] = $devices;

    // 5. Top 10 performers by CTA clicks
    $stmt = $pdo->query("
        SELECT performer_id, COUNT(*) as clicks
        FROM events
        WHERE $where AND event_type IN ('cta_clicked', 'prompt_visit_clicked', 'header_cta_clicked') AND performer_id IS NOT NULL
        GROUP BY performer_id
        ORDER BY clicks DESC
        LIMIT 10
    ");
    $topPerformers = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $topPerformers[] = ['performer' => $row['performer_id'], 'cta_clicks' => (int)$row['clicks']];
    }
    $result['top_performers'] = $topPerformers;

    // 6. Session depth distribution (how many performers per session)
    $stmt = $pdo->query("
        SELECT
            CASE
                WHEN performers_viewed = 0 THEN '0 (bounced)'
                WHEN performers_viewed BETWEEN 1 AND 3 THEN '1-3'
                WHEN performers_viewed BETWEEN 4 AND 10 THEN '4-10'
                WHEN performers_viewed BETWEEN 11 AND 25 THEN '11-25'
                ELSE '25+'
            END as depth_bucket,
            COUNT(*) as sessions
        FROM sessions
        WHERE started_at >= NOW() - INTERVAL 24 HOUR
        GROUP BY depth_bucket
        ORDER BY FIELD(depth_bucket, '0 (bounced)', '1-3', '4-10', '11-25', '25+')
    ");
    $depth = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $depth[$row['depth_bucket']] = (int)$row['sessions'];
    }
    $result['session_depth'] = $depth;

    // 7. Postback conversions (if table exists)
    try {
        $stmt = $pdo->query("
            SELECT type, COUNT(*) as cnt, SUM(commission) as total_commission
            FROM postbacks
            WHERE received_at >= NOW() - INTERVAL 30 DAY
            GROUP BY type
        ");
        $conversions = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $conversions[] = [
                'type' => $row['type'],
                'count' => (int)$row['cnt'],
                'commission' => round((float)$row['total_commission'], 2),
            ];
        }
        $result['conversions_30d'] = $conversions;
    } catch (PDOException $e) {
        $result['conversions_30d'] = 'postbacks table not found';
    }

    $result['period'] = $period;
    $result['generated_at'] = date('c');

    echo json_encode($result, JSON_PRETTY_PRINT);

} catch (PDOException $ex) {
    http_response_code(500);
    echo json_encode(['error' => 'MySQL error: ' . $ex->getMessage()]);
}
