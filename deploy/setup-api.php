<?php
set_time_limit(600);
echo "<pre>\n";

$webroot = "/var/www/xcam_vip_usr50/data/www/xcam.vip";
$nodeBin = "$webroot/_node/bin";
$apiDir  = "$webroot/_api";
$bundle  = "$webroot/api-bundle.tar.gz";

// Step param: ?step=install | ?step=start | ?step=stop | ?step=status
$step = $_GET['step'] ?? 'all';

echo "=== xcam.vip API Setup (step: $step) ===\n\n";

// Helper: run with node in PATH
function run($cmd) {
    global $nodeBin;
    $fullCmd = "export PATH=\"$nodeBin:\$PATH\" && $cmd 2>&1";
    $output = [];
    exec($fullCmd, $output, $ret);
    return ['output' => implode("\n", $output), 'code' => $ret];
}

// ---- STATUS ----
if ($step === 'status' || $step === 'all') {
    echo "--- Status ---\n";
    $r = run("$nodeBin/node -v");
    echo "Node: {$r['output']}\n";

    // Check if API is running
    $r = run("pgrep -f 'node.*server.js' || echo 'NOT RUNNING'");
    echo "API process: {$r['output']}\n";

    // Try health check
    $health = @file_get_contents('http://127.0.0.1:3001/api/health');
    echo "Health: " . ($health ?: 'NOT RESPONDING') . "\n";

    if ($step === 'status') { echo "</pre>"; exit; }
    echo "\n";
}

// ---- INSTALL ----
if ($step === 'install' || $step === 'all') {
    echo "--- Install ---\n";

    // Check bundle exists
    if (!file_exists($bundle)) {
        echo "ERROR: Upload api-bundle.tar.gz to web root first!\n";
        echo "Expected at: $bundle\n";
        echo "</pre>";
        exit;
    }
    echo "1. Bundle found: " . round(filesize($bundle) / 1024, 1) . " KB\n";
    ob_flush(); flush();

    // Extract
    echo "2. Extracting to $apiDir ...\n";
    exec("rm -rf '$apiDir'");
    exec("mkdir -p '$apiDir'");
    $r = run("tar -xzf '$bundle' -C '$apiDir'");
    echo "   Exit: {$r['code']}\n";
    if ($r['output']) echo "   {$r['output']}\n";
    ob_flush(); flush();

    // Install production deps
    echo "3. Installing npm dependencies (this takes 1-2 minutes)...\n";
    ob_flush(); flush();
    $r = run("cd '$apiDir' && $nodeBin/npm install --workspaces --production --no-optional 2>&1");
    echo "   Exit: {$r['code']}\n";
    // Show last 5 lines
    $lines = explode("\n", $r['output']);
    $last = array_slice($lines, -5);
    foreach ($last as $l) echo "   $l\n";
    ob_flush(); flush();

    // Create .env if not exists
    $envFile = "$apiDir/packages/api/.env";
    if (!file_exists($envFile)) {
        echo "4. Creating .env with defaults...\n";
        $env = "NODE_ENV=production\n";
        $env .= "PORT=3001\n";
        $env .= "HOST=127.0.0.1\n";
        $env .= "CB_API_URL=https://chaturbate.com/api/public/affiliates/onlinerooms/\n";
        $env .= "CB_API_TOKEN=\n";
        $env .= "WHITELABEL_DOMAIN=www.xcam.vip\n";
        $env .= "REDIS_URL=\n";
        $env .= "AFFILIATE_CAMPAIGN=roGHG\n";
        $env .= "AFFILIATE_TOUR=9oGW\n";
        $env .= "AFFILIATE_TRACK=wetroulette\n";
        $env .= "POOL_REFRESH_CRON=*/60 * * * * *\n";
        $env .= "MYSQL_HOST=localhost\n";
        $env .= "MYSQL_PORT=3306\n";
        $env .= "MYSQL_USER=xcamvip\n";
        $env .= "MYSQL_PASSWORD=\n";
        $env .= "MYSQL_DATABASE=xcamvip\n";
        file_put_contents($envFile, $env);
        echo "   Created at $envFile\n";
        echo "   NOTE: Edit this file to add MySQL password!\n";
    } else {
        echo "4. .env already exists, keeping it.\n";
    }

    // Cleanup bundle
    unlink($bundle);
    echo "\nInstall complete!\n";

    if ($step === 'install') { echo "</pre>"; exit; }
    echo "\n";
}

// ---- START ----
if ($step === 'start' || $step === 'all') {
    echo "--- Starting API ---\n";

    $serverJs = "$apiDir/packages/api/dist/server.js";
    if (!file_exists($serverJs)) {
        echo "ERROR: server.js not found. Run ?step=install first.\n";
        echo "</pre>";
        exit;
    }

    // Kill existing
    run("pkill -f 'node.*server.js'");
    sleep(1);

    // Start with nohup
    $logFile = "$apiDir/api.log";
    $pidFile = "$apiDir/api.pid";
    $startCmd = "cd '$apiDir/packages/api' && nohup $nodeBin/node dist/server.js > '$logFile' 2>&1 & echo \$!";
    $r = run($startCmd);
    $pid = trim($r['output']);
    file_put_contents($pidFile, $pid);
    echo "Started with PID: $pid\n";

    // Wait and check
    sleep(3);
    $health = @file_get_contents('http://127.0.0.1:3001/api/health');
    if ($health) {
        echo "Health check: $health\n";
        echo "\n=== API IS RUNNING! ===\n";
    } else {
        echo "Health check failed. Checking logs...\n";
        $log = file_get_contents($logFile);
        $logLines = explode("\n", $log);
        $last = array_slice($logLines, -20);
        foreach ($last as $l) echo "   $l\n";
    }
}

// ---- STOP ----
if ($step === 'stop') {
    echo "--- Stopping API ---\n";
    $r = run("pkill -f 'node.*server.js'");
    echo "Killed. {$r['output']}\n";
}

echo "</pre>";
?>
