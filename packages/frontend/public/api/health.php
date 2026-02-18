<?php
/**
 * GET /api/health.php — system health check
 */
require_once __DIR__ . '/_pool.php';

$allPool = getPool('all');
$genders = ['all', 'f', 'm', 't', 'c'];
$sizes = [];
foreach ($genders as $g) {
    $p = getPool($g);
    $sizes[$g] = count($p);
}

$cacheFile = CACHE_DIR . '/pool_all.json';
$cacheAge = file_exists($cacheFile) ? time() - filemtime($cacheFile) : -1;

$status = 'ok';
if (count($allPool) === 0) $status = 'degraded';
if ($cacheAge > 180) $status = 'degraded';

echo json_encode([
    'status' => $status,
    'pool_sizes' => $sizes,
    'cache_age_seconds' => $cacheAge,
    'backend' => 'php',
]);
