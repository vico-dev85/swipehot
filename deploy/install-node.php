<?php
set_time_limit(600);
ob_start();
echo "<pre>\n";

$webroot = "/home/deploy/swipehot";
$nodeDir = "$webroot/_node";
$nodeVersion = "v20.18.1";
$tarFile = "$webroot/node.tar.gz";
$url = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-linux-x64.tar.gz";

echo "=== Installing Node.js $nodeVersion ===\n\n";

// Check methods
echo "0. Available methods:\n";
echo "   allow_url_fopen: " . (ini_get('allow_url_fopen') ? 'YES' : 'NO') . "\n";
echo "   curl extension: " . (extension_loaded('curl') ? 'YES' : 'NO') . "\n";
echo "   curl CLI: " . exec('which curl 2>/dev/null || echo NO') . "\n";
echo "   wget CLI: " . exec('which wget 2>/dev/null || echo NO') . "\n";
echo "   writable: " . (is_writable($webroot) ? 'YES' : 'NO') . "\n";
ob_flush(); flush();

// Download
echo "\n1. Downloading (~30MB, may take a minute)...\n";
ob_flush(); flush();

$downloaded = false;

// Method A: PHP curl extension (safe - use RETURNTRANSFER, not FILE)
if (!$downloaded && extension_loaded('curl')) {
    echo "   Using PHP curl...\n";
    ob_flush(); flush();
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 300);
    $data = curl_exec($ch);
    $err = curl_error($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($err) {
        echo "   Error: $err\n";
    } else {
        echo "   HTTP $code, size: " . strlen($data) . " bytes\n";
        if (strlen($data) > 1000000) {
            file_put_contents($tarFile, $data);
            unset($data);
            $downloaded = true;
        }
    }
}

// Method B: wget
if (!$downloaded) {
    echo "   Trying wget...\n";
    ob_flush(); flush();
    exec("wget -q '$url' -O '$tarFile' 2>&1", $wout, $wret);
    echo "   Exit: $wret\n";
    if (file_exists($tarFile) && filesize($tarFile) > 1000000) $downloaded = true;
}

// Method C: curl CLI
if (!$downloaded) {
    echo "   Trying curl CLI...\n";
    ob_flush(); flush();
    exec("curl -sL '$url' -o '$tarFile' 2>&1", $cout, $cret);
    echo "   Exit: $cret\n";
    if (file_exists($tarFile) && filesize($tarFile) > 1000000) $downloaded = true;
}

if (!$downloaded) {
    echo "\n   FAILED to download Node.js.\n";
    echo "   Check: is outbound HTTPS allowed from this server?\n";
    echo "</pre>";
    exit;
}

echo "   OK: " . round(filesize($tarFile) / 1024 / 1024, 1) . " MB\n";

// Extract
echo "\n2. Extracting...\n";
ob_flush(); flush();
exec("rm -rf '$nodeDir' 2>&1");
exec("mkdir -p '$nodeDir' 2>&1");
exec("tar -xzf '$tarFile' -C '$nodeDir' --strip-components=1 2>&1", $tout, $tret);
echo "   Exit code: $tret\n";

// Verify
echo "\n3. Verifying...\n";
$nv = exec("$nodeDir/bin/node -v 2>&1");
$npmv = exec("$nodeDir/bin/npm -v 2>&1");
echo "   Node: $nv\n";
echo "   NPM: $npmv\n";

// Cleanup tar
if (file_exists($tarFile)) unlink($tarFile);

if (strpos($nv, 'v20') !== false) {
    echo "\n=== SUCCESS! Node.js at $nodeDir/bin/node ===\n";
} else {
    echo "\n=== FAILED ===\n";
}
echo "</pre>";
ob_end_flush();
?>
