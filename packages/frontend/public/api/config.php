<?php
/**
 * GET /api/config.php — public runtime config for frontend
 * A/B tests are loaded from the database (managed via /admin/).
 * Falls back to hardcoded defaults if DB is unavailable.
 */
require_once __DIR__ . '/_config.php';

// Try to load A/B tests from database
$abTests = null;
try {
    require_once __DIR__ . '/_db.php';
    $pdo = getDB();
    $stmt = $pdo->query("SELECT test_name, variants, traffic_pct FROM ab_tests WHERE status = 'running'");
    $abTests = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $abTests[] = [
            'test_name' => $row['test_name'],
            'variants' => json_decode($row['variants'], true),
            'traffic_pct' => (int)$row['traffic_pct'],
        ];
    }
} catch (Exception $e) {
    // DB unavailable — fall through to hardcoded defaults
}

// Fallback if DB query returned nothing or failed
if ($abTests === null || ($abTests === [] && !isset($pdo))) {
    $abTests = [
        ['test_name' => 'start_screen', 'variants' => ['control', 'instant'], 'traffic_pct' => 100],
        ['test_name' => 'cta_copy', 'variants' => ['watch_live', 'go_live', 'chat_now'], 'traffic_pct' => 100],
    ];
}

echo json_encode([
    'features' => [
        'double_tap_hint' => true,
        'overlay_auto_hide' => true,
        'swipe_to_dismiss' => true,
    ],
    'ab_tests' => $abTests,
]);
