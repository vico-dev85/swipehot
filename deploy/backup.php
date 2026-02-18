<?php
set_time_limit(600);
$webroot = "/var/www/xcam_vip_usr50/data/www/xcam.vip";
$zipFile = "$webroot/wordpress-backup.zip";

// Delete old backup if exists
if (file_exists($zipFile)) unlink($zipFile);

$zip = new ZipArchive();
$zip->open($zipFile, ZipArchive::CREATE);

$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($webroot, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::LEAVES_ONLY
);

$count = 0;
foreach ($files as $file) {
    $path = $file->getRealPath();
    $rel = substr($path, strlen($webroot) + 1);
    // Skip the backup zip itself
    if ($rel === 'wordpress-backup.zip') continue;
    $zip->addFile($path, $rel);
    $count++;
}
$zip->close();

echo "<pre>\n";
echo "Backup complete!\n";
echo "Files: $count\n";
echo "Size: " . round(filesize($zipFile) / 1024 / 1024, 1) . " MB\n";
echo "Download: wordpress-backup.zip (via File Manager)\n";
echo "</pre>";
?>
