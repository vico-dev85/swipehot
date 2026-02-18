<?php
/**
 * Shared database connection + auto-table creation
 */
require_once __DIR__ . '/_config.php';

function getDB(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;

    $pdo = new PDO(
        'mysql:host=' . MYSQL_HOST . ';port=' . MYSQL_PORT . ';dbname=' . MYSQL_DB . ';charset=utf8mb4',
        MYSQL_USER,
        MYSQL_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    ensureTables($pdo);
    return $pdo;
}

function ensureTables(PDO $pdo): void {
    // Quick check: if events table exists, skip
    try {
        $pdo->query('SELECT 1 FROM events LIMIT 1');
        return;
    } catch (PDOException $e) {
        // Table doesn't exist, create all
    }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS events (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            session_id VARCHAR(64) NOT NULL,
            visitor_id VARCHAR(64) NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            event_timestamp DATETIME(3) NOT NULL,
            received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            performer_id VARCHAR(100) DEFAULT NULL,
            time_on_performer_ms INT UNSIGNED DEFAULT NULL,
            view_index SMALLINT UNSIGNED DEFAULT NULL,
            properties JSON NOT NULL,
            device_type ENUM('mobile', 'tablet', 'desktop') NOT NULL DEFAULT 'mobile',
            referrer VARCHAR(500) DEFAULT NULL,
            schema_version TINYINT UNSIGNED NOT NULL DEFAULT 1,
            INDEX idx_session (session_id, event_timestamp),
            INDEX idx_visitor (visitor_id, event_timestamp),
            INDEX idx_event_type_time (event_type, event_timestamp),
            INDEX idx_performer (performer_id, event_type),
            INDEX idx_timestamp (event_timestamp)
        ) ENGINE=InnoDB ROW_FORMAT=COMPRESSED
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ab_tests (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            test_name VARCHAR(100) NOT NULL UNIQUE,
            variants JSON NOT NULL,
            traffic_pct TINYINT UNSIGNED NOT NULL DEFAULT 100,
            status ENUM('draft', 'running', 'paused', 'completed') NOT NULL DEFAULT 'draft',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            started_at DATETIME DEFAULT NULL,
            ended_at DATETIME DEFAULT NULL
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sessions (
            session_id VARCHAR(64) PRIMARY KEY,
            visitor_id VARCHAR(64) NOT NULL,
            started_at DATETIME(3) NOT NULL,
            ended_at DATETIME(3) DEFAULT NULL,
            duration_ms INT UNSIGNED DEFAULT NULL,
            performers_viewed SMALLINT UNSIGNED DEFAULT 0,
            cta_clicks SMALLINT UNSIGNED DEFAULT 0,
            likes_count SMALLINT UNSIGNED DEFAULT 0,
            sound_on_count SMALLINT UNSIGNED DEFAULT 0,
            device_type ENUM('mobile', 'tablet', 'desktop') NOT NULL DEFAULT 'mobile',
            referrer VARCHAR(500) DEFAULT NULL,
            ab_variants JSON DEFAULT NULL,
            INDEX idx_visitor (visitor_id, started_at),
            INDEX idx_started (started_at),
            INDEX idx_engagement (performers_viewed, cta_clicks)
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS daily_visitors (
            visitor_id VARCHAR(64) NOT NULL,
            visit_date DATE NOT NULL,
            sessions_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
            total_performers_viewed SMALLINT UNSIGNED NOT NULL DEFAULT 0,
            total_cta_clicks SMALLINT UNSIGNED NOT NULL DEFAULT 0,
            first_seen_date DATE NOT NULL,
            PRIMARY KEY (visitor_id, visit_date),
            INDEX idx_date (visit_date),
            INDEX idx_first_seen (first_seen_date, visit_date)
        )
    ");
}
