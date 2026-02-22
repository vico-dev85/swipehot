<?php
/**
 * One-click backup for swipe.hot
 * Upload this file to the WordPress web root and visit it in your browser.
 * It will create a ZIP of all files + MySQL dump, then let you download it.
 *
 * Usage: https://swipe.hot/backup.php
 * After backup, DELETE this file from the server (it has no auth protection).
 */

set_time_limit(900);
ini_set('memory_limit', '512M');

// Auto-detect webroot (directory this file lives in)
$webroot = __DIR__;
$timestamp = date('Y-m-d_His');
$zipName = "backup-swipehot-$timestamp.zip";
$zipFile = "$webroot/$zipName";

echo "<pre style='font-family:monospace; background:#111; color:#0f0; padding:20px;'>\n";
echo "=== SwipeHot Backup ===\n";
echo "Webroot: $webroot\n";
echo "Time: $timestamp\n\n";

// --- Step 1: Try to dump MySQL (WordPress wp-config.php) ---
$dbDumpFile = null;
$wpConfig = "$webroot/wp-config.php";

if (file_exists($wpConfig)) {
    echo "1. Found wp-config.php — extracting DB credentials...\n";
    $wpContent = file_get_contents($wpConfig);

    // Parse WordPress DB constants
    $dbName = $dbUser = $dbPass = $dbHost = '';
    if (preg_match("/define\s*\(\s*'DB_NAME'\s*,\s*'([^']+)'/", $wpContent, $m)) $dbName = $m[1];
    if (preg_match("/define\s*\(\s*'DB_USER'\s*,\s*'([^']+)'/", $wpContent, $m)) $dbUser = $m[1];
    if (preg_match("/define\s*\(\s*'DB_PASSWORD'\s*,\s*'([^']+)'/", $wpContent, $m)) $dbPass = $m[1];
    if (preg_match("/define\s*\(\s*'DB_HOST'\s*,\s*'([^']+)'/", $wpContent, $m)) $dbHost = $m[1];

    if ($dbName && $dbUser) {
        echo "   DB: $dbName @ $dbHost (user: $dbUser)\n";
        $dbDumpFile = "$webroot/db-dump-$timestamp.sql";

        // Try mysqldump CLI
        $passArg = $dbPass ? "-p'" . addcslashes($dbPass, "'\\") . "'" : '';
        $cmd = "mysqldump -h'$dbHost' -u'$dbUser' $passArg '$dbName' > '$dbDumpFile' 2>&1";
        exec($cmd, $out, $ret);

        if ($ret === 0 && file_exists($dbDumpFile) && filesize($dbDumpFile) > 100) {
            echo "   MySQL dump: " . round(filesize($dbDumpFile) / 1024, 1) . " KB\n";
        } else {
            echo "   mysqldump failed (exit: $ret). Trying PHP PDO fallback...\n";

            // PDO fallback — dump table structures and data
            try {
                $dsn = "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4";
                $pdo = new PDO($dsn, $dbUser, $dbPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

                $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
                $sql = "-- SwipeHot DB Backup ($dbName) $timestamp\n-- Tables: " . count($tables) . "\n\n";

                foreach ($tables as $table) {
                    $create = $pdo->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_ASSOC);
                    $sql .= "DROP TABLE IF EXISTS `$table`;\n";
                    $sql .= $create['Create Table'] . ";\n\n";

                    $rows = $pdo->query("SELECT * FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
                    foreach ($rows as $row) {
                        $vals = array_map(function($v) use ($pdo) {
                            return $v === null ? 'NULL' : $pdo->quote($v);
                        }, array_values($row));
                        $sql .= "INSERT INTO `$table` VALUES(" . implode(',', $vals) . ");\n";
                    }
                    $sql .= "\n";
                }

                file_put_contents($dbDumpFile, $sql);
                echo "   PDO dump: " . round(filesize($dbDumpFile) / 1024, 1) . " KB (" . count($tables) . " tables)\n";
            } catch (Exception $e) {
                echo "   PDO failed: " . $e->getMessage() . "\n";
                $dbDumpFile = null;
            }
        }
    } else {
        echo "   Could not parse DB credentials from wp-config.php\n";
    }
} else {
    echo "1. No wp-config.php found — skipping DB backup\n";
}

// --- Step 2: Create ZIP of all files ---
echo "\n2. Creating ZIP backup...\n";
ob_flush(); flush();

if (!class_exists('ZipArchive')) {
    echo "   ERROR: ZipArchive not available. Ask hosting to enable php-zip.\n";
    echo "</pre>";
    exit;
}

// Delete old backup if exists
if (file_exists($zipFile)) unlink($zipFile);

$zip = new ZipArchive();
if ($zip->open($zipFile, ZipArchive::CREATE) !== true) {
    echo "   ERROR: Cannot create ZIP file at $zipFile\n";
    echo "</pre>";
    exit;
}

$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($webroot, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::LEAVES_ONLY
);

$count = 0;
$skipped = 0;
foreach ($files as $file) {
    $path = $file->getRealPath();
    $rel = substr($path, strlen($webroot) + 1);

    // Skip the backup files themselves
    if (strpos($rel, 'backup-swipehot-') === 0) continue;
    if (strpos($rel, 'db-dump-') === 0) continue;

    // Skip huge dirs that aren't worth backing up
    if (strpos($rel, 'node_modules/') === 0) { $skipped++; continue; }
    if (strpos($rel, '.git/') === 0) { $skipped++; continue; }

    $zip->addFile($path, $rel);
    $count++;
}
$zip->close();

echo "   Files: $count (skipped $skipped from node_modules/.git)\n";
echo "   Size: " . round(filesize($zipFile) / 1024 / 1024, 1) . " MB\n";

// Clean up DB dump file (it's inside the ZIP now, or wasn't created)
if ($dbDumpFile && file_exists($dbDumpFile)) {
    unlink($dbDumpFile);
}

// --- Step 3: Download link ---
echo "\n3. Backup ready!\n";
echo "   File: $zipName\n";
echo "   Download via File Manager or:\n";
echo "   <a href='/$zipName' style='color:#0ff'>https://swipe.hot/$zipName</a>\n";
echo "\n";
echo "   IMPORTANT: Delete this backup.php and the ZIP after downloading!\n";
echo "   Both are publicly accessible.\n";
echo "\n=== Done ===\n";
echo "</pre>";
?>
