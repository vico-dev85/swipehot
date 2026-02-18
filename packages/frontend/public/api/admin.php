<?php
/**
 * Admin Dashboard API
 * All actions via ?action=xxx
 * Auth required for all actions except login.
 */
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_db.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

// --- Auth actions (no auth required) ---

if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'POST only']);
        exit;
    }
    if (!defined('ADMIN_PASS') || !ADMIN_PASS) {
        http_response_code(500);
        echo json_encode(['error' => 'ADMIN_PASS not set in _config.php. Add: define(\'ADMIN_PASS\', \'YourPassword\');']);
        exit;
    }
    $input = json_decode(file_get_contents('php://input'), true);
    $password = $input['password'] ?? '';
    if (login($password)) {
        echo json_encode(['ok' => true]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Wrong password']);
    }
    exit;
}

if ($action === 'logout') {
    logout();
    echo json_encode(['ok' => true]);
    exit;
}

if ($action === 'check') {
    echo json_encode([
        'authenticated' => isAuthenticated(),
        'admin_pass_defined' => defined('ADMIN_PASS'),
        'session_active' => session_status() === PHP_SESSION_ACTIVE,
        'php_version' => PHP_VERSION,
    ]);
    exit;
}

// --- Everything else requires auth ---
requireAuth();

try {
    $pdo = getDB();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database unavailable']);
    exit;
}

$period = $_GET['period'] ?? '24h';
$periodMap = [
    'today' => 'DATE(event_timestamp) = CURDATE()',
    '24h'   => 'event_timestamp >= NOW() - INTERVAL 24 HOUR',
    '7d'    => 'event_timestamp >= NOW() - INTERVAL 7 DAY',
    '30d'   => 'event_timestamp >= NOW() - INTERVAL 30 DAY',
];
$where = $periodMap[$period] ?? $periodMap['24h'];

// Previous period for delta calculation
$prevMap = [
    'today' => 'DATE(event_timestamp) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)',
    '24h'   => 'event_timestamp >= NOW() - INTERVAL 48 HOUR AND event_timestamp < NOW() - INTERVAL 24 HOUR',
    '7d'    => 'event_timestamp >= NOW() - INTERVAL 14 DAY AND event_timestamp < NOW() - INTERVAL 7 DAY',
    '30d'   => 'event_timestamp >= NOW() - INTERVAL 60 DAY AND event_timestamp < NOW() - INTERVAL 30 DAY',
];
$prevWhere = $prevMap[$period] ?? $prevMap['24h'];

switch ($action) {

case 'overview':
    // Current period
    $stmt = $pdo->query("
        SELECT
            COUNT(DISTINCT visitor_id) as visitors,
            COUNT(DISTINCT session_id) as sessions,
            SUM(CASE WHEN event_type IN ('cta_clicked','prompt_visit_clicked','header_cta_clicked') THEN 1 ELSE 0 END) as cta_clicks,
            SUM(CASE WHEN event_type = 'session_started' THEN 1 ELSE 0 END) as starts
        FROM events WHERE $where
    ");
    $cur = $stmt->fetch(PDO::FETCH_ASSOC);

    // Previous period
    $stmt = $pdo->query("
        SELECT
            COUNT(DISTINCT visitor_id) as visitors,
            COUNT(DISTINCT session_id) as sessions,
            SUM(CASE WHEN event_type IN ('cta_clicked','prompt_visit_clicked','header_cta_clicked') THEN 1 ELSE 0 END) as cta_clicks,
            SUM(CASE WHEN event_type = 'session_started' THEN 1 ELSE 0 END) as starts
        FROM events WHERE $prevWhere
    ");
    $prev = $stmt->fetch(PDO::FETCH_ASSOC);

    $ctr = (int)$cur['starts'] > 0 ? round((int)$cur['cta_clicks'] / (int)$cur['starts'] * 100, 1) : 0;
    $prevCtr = (int)$prev['starts'] > 0 ? round((int)$prev['cta_clicks'] / (int)$prev['starts'] * 100, 1) : 0;

    echo json_encode([
        'visitors'    => (int)$cur['visitors'],
        'sessions'    => (int)$cur['sessions'],
        'cta_clicks'  => (int)$cur['cta_clicks'],
        'ctr'         => $ctr,
        'prev' => [
            'visitors'   => (int)$prev['visitors'],
            'sessions'   => (int)$prev['sessions'],
            'cta_clicks' => (int)$prev['cta_clicks'],
            'ctr'        => $prevCtr,
        ],
    ]);
    break;

case 'funnel':
    $stmt = $pdo->query("
        SELECT event_type, COUNT(*) as cnt
        FROM events WHERE $where
        GROUP BY event_type
    ");
    $counts = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $counts[$row['event_type']] = (int)$row['cnt'];
    }

    $pageLoads = $counts['page_loaded'] ?? 0;
    $starts = $counts['start_clicked'] ?? $counts['session_started'] ?? 0;
    $views = $counts['performer_viewed'] ?? 0;
    $cta = ($counts['cta_clicked'] ?? 0) + ($counts['prompt_visit_clicked'] ?? 0) + ($counts['header_cta_clicked'] ?? 0);

    echo json_encode([
        'steps' => [
            ['label' => 'Page Loads', 'value' => $pageLoads],
            ['label' => 'Starts', 'value' => $starts, 'rate' => $pageLoads > 0 ? round($starts / $pageLoads * 100, 1) : 0],
            ['label' => 'Performer Views', 'value' => $views, 'rate' => $starts > 0 ? round($views / $starts * 100, 1) : 0],
            ['label' => 'CTA Clicks', 'value' => $cta, 'rate' => $views > 0 ? round($cta / $views * 100, 1) : 0],
        ],
    ]);
    break;

case 'devices':
    $stmt = $pdo->query("
        SELECT device_type, COUNT(DISTINCT session_id) as cnt
        FROM events WHERE $where AND event_type = 'page_loaded'
        GROUP BY device_type
    ");
    $devices = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $devices[$row['device_type']] = (int)$row['cnt'];
    }
    echo json_encode($devices);
    break;

case 'session_depth':
    $stmt = $pdo->query("
        SELECT
            CASE
                WHEN performers_viewed = 0 THEN '0 (bounced)'
                WHEN performers_viewed BETWEEN 1 AND 3 THEN '1-3'
                WHEN performers_viewed BETWEEN 4 AND 10 THEN '4-10'
                WHEN performers_viewed BETWEEN 11 AND 25 THEN '11-25'
                ELSE '25+'
            END as bucket,
            COUNT(*) as cnt
        FROM sessions
        WHERE started_at >= NOW() - INTERVAL 24 HOUR
        GROUP BY bucket
        ORDER BY FIELD(bucket, '0 (bounced)', '1-3', '4-10', '11-25', '25+')
    ");
    $depth = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $depth[] = ['bucket' => $row['bucket'], 'count' => (int)$row['cnt']];
    }
    echo json_encode($depth);
    break;

case 'top_performers':
    $stmt = $pdo->query("
        SELECT performer_id, COUNT(*) as clicks
        FROM events
        WHERE $where AND event_type IN ('cta_clicked','prompt_visit_clicked','header_cta_clicked') AND performer_id IS NOT NULL
        GROUP BY performer_id
        ORDER BY clicks DESC
        LIMIT 10
    ");
    $top = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $top[] = ['performer' => $row['performer_id'], 'clicks' => (int)$row['clicks']];
    }
    echo json_encode($top);
    break;

case 'conversions':
    try {
        $stmt = $pdo->query("
            SELECT type, COUNT(*) as cnt, COALESCE(SUM(commission), 0) as total
            FROM postbacks
            WHERE received_at >= NOW() - INTERVAL 30 DAY
            GROUP BY type
        ");
        $conv = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $conv[] = ['type' => $row['type'], 'count' => (int)$row['cnt'], 'commission' => round((float)$row['total'], 2)];
        }
        echo json_encode($conv);
    } catch (PDOException $e) {
        echo json_encode([]);
    }
    break;

// --- A/B Test Management ---

case 'ab_list':
    $stmt = $pdo->query("SELECT * FROM ab_tests ORDER BY FIELD(status, 'running', 'paused', 'draft', 'completed'), created_at DESC");
    $tests = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $row['variants'] = json_decode($row['variants'], true);
        $row['id'] = (int)$row['id'];
        $row['traffic_pct'] = (int)$row['traffic_pct'];
        $tests[] = $row;
    }
    echo json_encode($tests);
    break;

case 'ab_create':
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"error":"POST"}'; exit; }
    $input = json_decode(file_get_contents('php://input'), true);
    $name = trim($input['test_name'] ?? '');
    $variants = $input['variants'] ?? [];
    $traffic = min(100, max(0, (int)($input['traffic_pct'] ?? 100)));

    if (!$name || count($variants) < 2) {
        http_response_code(400);
        echo json_encode(['error' => 'Need test name and at least 2 variants']);
        exit;
    }

    // Sanitize name
    $name = preg_replace('/[^a-z0-9_]/', '_', strtolower($name));

    $stmt = $pdo->prepare("INSERT INTO ab_tests (test_name, variants, traffic_pct, status) VALUES (?, ?, ?, 'draft')");
    try {
        $stmt->execute([$name, json_encode(array_values($variants)), $traffic]);
        echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(409);
        echo json_encode(['error' => 'Test name already exists']);
    }
    break;

case 'ab_start':
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"error":"POST"}'; exit; }
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);
    $stmt = $pdo->prepare("UPDATE ab_tests SET status = 'running', started_at = NOW() WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['ok' => true]);
    break;

case 'ab_pause':
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"error":"POST"}'; exit; }
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);
    $stmt = $pdo->prepare("UPDATE ab_tests SET status = 'paused' WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['ok' => true]);
    break;

case 'ab_complete':
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"error":"POST"}'; exit; }
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);
    $stmt = $pdo->prepare("UPDATE ab_tests SET status = 'completed', ended_at = NOW() WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['ok' => true]);
    break;

case 'ab_delete':
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"error":"POST"}'; exit; }
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);
    $stmt = $pdo->prepare("DELETE FROM ab_tests WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['ok' => true]);
    break;

case 'ab_update':
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"error":"POST"}'; exit; }
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);
    $traffic = min(100, max(0, (int)($input['traffic_pct'] ?? 100)));
    $stmt = $pdo->prepare("UPDATE ab_tests SET traffic_pct = ? WHERE id = ?");
    $stmt->execute([$traffic, $id]);
    echo json_encode(['ok' => true]);
    break;

case 'ab_results':
    $testId = (int)($_GET['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT * FROM ab_tests WHERE id = ?");
    $stmt->execute([$testId]);
    $test = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$test) {
        http_response_code(404);
        echo json_encode(['error' => 'Test not found']);
        exit;
    }

    $testName = $test['test_name'];
    $variants = json_decode($test['variants'], true);

    // Query sessions table for per-variant metrics
    $stmt = $pdo->prepare("
        SELECT
            JSON_UNQUOTE(JSON_EXTRACT(ab_variants, ?)) as variant,
            COUNT(*) as sessions,
            SUM(CASE WHEN cta_clicks > 0 THEN 1 ELSE 0 END) as conversions,
            AVG(performers_viewed) as avg_depth,
            AVG(duration_ms) as avg_duration_ms
        FROM sessions
        WHERE ab_variants IS NOT NULL
            AND JSON_EXTRACT(ab_variants, ?) IS NOT NULL
            AND started_at >= COALESCE(?, started_at)
        GROUP BY variant
    ");
    $jsonPath = '$.' . $testName;
    $stmt->execute([$jsonPath, $jsonPath, $test['started_at']]);

    $results = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $results[$row['variant']] = [
            'sessions' => (int)$row['sessions'],
            'conversions' => (int)$row['conversions'],
            'rate' => (int)$row['sessions'] > 0 ? round((int)$row['conversions'] / (int)$row['sessions'] * 100, 2) : 0,
            'avg_depth' => round((float)$row['avg_depth'], 1),
            'avg_duration_s' => round((float)$row['avg_duration_ms'] / 1000, 0),
        ];
    }

    // Calculate significance between control (first variant) and each other variant
    $significance = [];
    $controlVariant = $variants[0] ?? null;
    $controlData = $results[$controlVariant] ?? null;

    if ($controlData && $controlData['sessions'] > 0) {
        for ($i = 1; $i < count($variants); $i++) {
            $v = $variants[$i];
            $vData = $results[$v] ?? null;
            if ($vData && $vData['sessions'] > 0) {
                $significance[$v] = calcSignificance(
                    $controlData['sessions'], $controlData['conversions'],
                    $vData['sessions'], $vData['conversions']
                );
            }
        }
    }

    // Determine winner
    $winner = null;
    $bestRate = -1;
    foreach ($results as $variant => $data) {
        if ($data['rate'] > $bestRate) {
            $bestRate = $data['rate'];
            $winner = $variant;
        }
    }

    $totalSessions = array_sum(array_column($results, 'sessions'));

    echo json_encode([
        'test' => $test,
        'variants' => $variants,
        'results' => $results,
        'significance' => $significance,
        'winner' => $winner,
        'total_sessions' => $totalSessions,
        'enough_data' => $totalSessions >= 100,
    ]);
    break;

default:
    http_response_code(400);
    echo json_encode(['error' => 'Unknown action: ' . $action]);
}

// --- Significance Calculation ---

function calcSignificance(int $n1, int $c1, int $n2, int $c2): array {
    $p1 = $n1 > 0 ? $c1 / $n1 : 0;
    $p2 = $n2 > 0 ? $c2 / $n2 : 0;
    $total = $n1 + $n2;
    $pPooled = $total > 0 ? ($c1 + $c2) / $total : 0;

    $se = ($n1 > 0 && $n2 > 0)
        ? sqrt($pPooled * (1 - $pPooled) * (1/$n1 + 1/$n2))
        : 0;

    $z = $se > 0 ? ($p2 - $p1) / $se : 0;
    $pValue = 2 * (1 - normalCDF(abs($z)));

    return [
        'control_rate' => round($p1 * 100, 2),
        'variant_rate' => round($p2 * 100, 2),
        'lift' => $p1 > 0 ? round(($p2 - $p1) / $p1 * 100, 1) : 0,
        'z_score' => round($z, 3),
        'p_value' => round($pValue, 4),
        'is_significant' => $pValue < 0.05,
        'confidence' => round((1 - $pValue) * 100, 1),
    ];
}

function normalCDF(float $x): float {
    if ($x < -8) return 0.0;
    if ($x > 8) return 1.0;
    $a1 = 0.254829592; $a2 = -0.284496736; $a3 = 1.421413741;
    $a4 = -1.453152027; $a5 = 1.061405429; $p = 0.3275911;
    $sign = $x < 0 ? -1 : 1;
    $ax = abs($x) / sqrt(2);
    $t = 1.0 / (1.0 + $p * $ax);
    $y = 1.0 - (((($a5*$t + $a4)*$t + $a3)*$t + $a2)*$t + $a1) * $t * exp(-$ax*$ax);
    return 0.5 * (1.0 + $sign * $y);
}
