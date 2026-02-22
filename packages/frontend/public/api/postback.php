<?php
/**
 * Chaturbate Postback Receiver
 * Receives conversion notifications from Chaturbate's affiliate system.
 *
 * Set your postback URL in Chaturbate affiliate dashboard to:
 * https://swipe.hot/api/postback.php
 *
 * Chaturbate will call this with GET params on every conversion.
 */

require_once __DIR__ . '/_config.php';

// Postback params from Chaturbate
$postback = [
    'cb_id'      => $_GET['id'] ?? '',
    'type'       => $_GET['type'] ?? '',
    'text'       => $_GET['text'] ?? '',
    'user_uid'   => $_GET['user_uid'] ?? '',
    'track'      => $_GET['track'] ?? '',
    'sid'        => $_GET['sid'] ?? '',
    'commission' => floatval($_GET['commission'] ?? 0),
    'tokens'     => intval($_GET['tokens'] ?? 0),
    'tier'       => intval($_GET['tier'] ?? 0),
    'received_at'=> date('Y-m-d H:i:s'),
    'ip'         => $_SERVER['REMOTE_ADDR'] ?? '',
];

// Parse our sid format: {session_id}_{performer_username}
$sessionId = '';
$performer = '';
if ($postback['sid']) {
    $lastUnderscore = strrpos($postback['sid'], '_');
    if ($lastUnderscore !== false) {
        $sessionId = substr($postback['sid'], 0, $lastUnderscore);
        $performer = substr($postback['sid'], $lastUnderscore + 1);
    }
}
$postback['parsed_session_id'] = $sessionId;
$postback['parsed_performer']  = $performer;

// Always log to file (reliable, no dependencies)
$logFile = CACHE_DIR . '/postbacks.jsonl';
file_put_contents($logFile, json_encode($postback) . "\n", FILE_APPEND | LOCK_EX);

// Try MySQL if configured
if (MYSQL_PASS) {
    try {
        $pdo = new PDO(
            'mysql:host=' . MYSQL_HOST . ';port=' . MYSQL_PORT . ';dbname=' . MYSQL_DB . ';charset=utf8mb4',
            MYSQL_USER,
            MYSQL_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );

        // Create table if not exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS postbacks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cb_id VARCHAR(255) NOT NULL,
            type VARCHAR(100) NOT NULL,
            text VARCHAR(500),
            user_uid VARCHAR(255),
            track VARCHAR(100),
            sid VARCHAR(255),
            session_id VARCHAR(100),
            performer VARCHAR(100),
            commission DECIMAL(10,4) DEFAULT 0,
            tokens INT DEFAULT 0,
            tier INT DEFAULT 0,
            received_at DATETIME NOT NULL,
            ip VARCHAR(45),
            INDEX idx_sid (sid),
            INDEX idx_session (session_id),
            INDEX idx_performer (performer),
            INDEX idx_type (type),
            INDEX idx_received (received_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $stmt = $pdo->prepare("INSERT INTO postbacks
            (cb_id, type, text, user_uid, track, sid, session_id, performer, commission, tokens, tier, received_at, ip)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $stmt->execute([
            $postback['cb_id'],
            $postback['type'],
            $postback['text'],
            $postback['user_uid'],
            $postback['track'],
            $postback['sid'],
            $sessionId,
            $performer,
            $postback['commission'],
            $postback['tokens'],
            $postback['tier'],
            $postback['received_at'],
            $postback['ip'],
        ]);
    } catch (PDOException $e) {
        // MySQL failed — file log is the backup
        file_put_contents(CACHE_DIR . '/postback_errors.log', date('c') . ' ' . $e->getMessage() . "\n", FILE_APPEND | LOCK_EX);
    }
}

// Respond 200 OK — Chaturbate expects a successful response
http_response_code(200);
echo json_encode(['status' => 'ok']);
