<?php
/**
 * GET /api/pool-stats.php — pool health info (viewer count, pool sizes)
 */
require_once __DIR__ . '/_pool.php';

$genders = ['all', 'f', 'm', 't', 'c'];
$sizes = [];
$totalViewers = 0;

$allPool = getPool('all');
$totalViewers = array_sum(array_column($allPool, 'num_users'));
$sizes['all'] = count($allPool);

foreach (['f', 'm', 't', 'c'] as $g) {
    $p = getPool($g);
    $sizes[$g] = count($p);
}

echo json_encode([
    'pool_sizes' => $sizes,
    'total_performers_cached' => count($allPool),
    'total_viewers' => $totalViewers,
]);
