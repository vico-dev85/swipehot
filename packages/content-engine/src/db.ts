// MySQL connection with auto-create tables on first run.
// Falls back to a no-op store when MySQL is unavailable (logs to console).

import mysql from 'mysql2/promise';
import type { Config } from './config.js';

let pool: mysql.Pool | null = null;

const TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS models (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(100) UNIQUE NOT NULL,
    chaturbate_username VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    gender CHAR(1) NULL,
    bio TEXT,
    bio_cached TEXT NULL,
    bio_generated_at DATETIME NULL,
    categories JSON,
    tags JSON,
    status ENUM('pending','active','inactive','removed') DEFAULT 'pending',
    is_currently_online TINYINT(1) DEFAULT 0,
    last_online_at DATETIME NULL,
    last_seen_online_at DATETIME NULL,
    first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    num_followers INT DEFAULT 0,
    avg_viewers_7d FLOAT DEFAULT 0,
    screenshot_local_path VARCHAR(500) NULL,
    screenshot_updated_at DATETIME NULL,
    html_file_path VARCHAR(500) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_online (is_currently_online),
    INDEX idx_last_seen (last_seen_online_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS keywords (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    type ENUM('model_name','general') NOT NULL,
    priority INT DEFAULT 0,
    status ENUM('pending','processing','completed','skipped','failed') DEFAULT 'pending',
    error_message TEXT NULL,
    cb_data JSON NULL,
    seen_online_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    INDEX idx_queue (status, type, priority DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS pipeline_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    content_type ENUM('model_page','blog_post') NOT NULL,
    keyword VARCHAR(255),
    success TINYINT(1) DEFAULT 0,
    quality_score INT NULL,
    error_message TEXT NULL,
    retry_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_date (content_type, created_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Living listicles: user upvotes per model per category
  `CREATE TABLE IF NOT EXISTS user_votes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_username VARCHAR(100) NOT NULL,
    category_slug VARCHAR(100) NOT NULL,
    visitor_token VARCHAR(64) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_vote (model_username, category_slug, visitor_token),
    INDEX idx_model_cat (model_username, category_slug),
    INDEX idx_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Daily snapshots: viewer/online stats per model per day (for 7-day averages)
  `CREATE TABLE IF NOT EXISTS daily_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_username VARCHAR(100) NOT NULL,
    snapshot_date DATE NOT NULL,
    avg_viewers INT DEFAULT 0,
    peak_viewers INT DEFAULT 0,
    hours_online FLOAT DEFAULT 0,
    times_seen_online INT DEFAULT 0,
    upvote_count INT DEFAULT 0,
    UNIQUE KEY uk_snap (model_username, snapshot_date),
    INDEX idx_date (snapshot_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Page build log: tracks every listicle page generation
  `CREATE TABLE IF NOT EXISTS page_builds (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_slug VARCHAR(100) NOT NULL,
    page_title VARCHAR(500),
    models_count INT DEFAULT 0,
    build_type ENUM('full','light') NOT NULL,
    html_file_path VARCHAR(500) NULL,
    build_duration_ms INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category_slug, created_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS blog_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    blog_type VARCHAR(50) NOT NULL,
    title VARCHAR(500),
    meta_description VARCHAR(300),
    content LONGTEXT,
    word_count INT DEFAULT 0,
    internal_link_count INT DEFAULT 0,
    quality_score INT DEFAULT 0,
    html_file_path VARCHAR(500) NULL,
    status ENUM('draft','published','failed') DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

export async function initDb(config: Config): Promise<boolean> {
  try {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
    // Test connection
    await pool.query('SELECT 1');
    // Auto-create tables
    for (const sql of TABLES_SQL) {
      await pool.query(sql);
    }
    // Migrate: add cb_data + seen_online_at columns if missing (safe on existing DBs)
    await pool.query(
      "ALTER TABLE keywords ADD COLUMN IF NOT EXISTS cb_data JSON NULL AFTER error_message"
    ).catch(() => {});
    await pool.query(
      "ALTER TABLE keywords ADD COLUMN IF NOT EXISTS seen_online_at DATETIME NULL AFTER cb_data"
    ).catch(() => {});

    // Migrate: add living listicle columns to models table (safe on existing DBs)
    const modelMigrations = [
      "ALTER TABLE models ADD COLUMN IF NOT EXISTS bio_cached TEXT NULL AFTER bio",
      "ALTER TABLE models ADD COLUMN IF NOT EXISTS bio_generated_at DATETIME NULL AFTER bio_cached",
      "ALTER TABLE models ADD COLUMN IF NOT EXISTS last_seen_online_at DATETIME NULL AFTER last_online_at",
      "ALTER TABLE models ADD COLUMN IF NOT EXISTS first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER last_seen_online_at",
      "ALTER TABLE models ADD COLUMN IF NOT EXISTS avg_viewers_7d FLOAT DEFAULT 0 AFTER num_followers",
      "ALTER TABLE models ADD COLUMN IF NOT EXISTS screenshot_local_path VARCHAR(500) NULL AFTER avg_viewers_7d",
      "ALTER TABLE models ADD COLUMN IF NOT EXISTS screenshot_updated_at DATETIME NULL AFTER screenshot_local_path",
      "ALTER TABLE models ADD COLUMN gender CHAR(1) NULL AFTER display_name",
      "ALTER TABLE models ADD INDEX idx_gender (gender)",
    ];
    for (const sql of modelMigrations) {
      await pool.query(sql).catch(() => {});
    }

    console.log('[db] MySQL connected, tables ready');
    return true;
  } catch (err) {
    console.warn(`[db] MySQL unavailable (${(err as Error).message}) — running without database`);
    pool = null;
    return false;
  }
}

export function getPool(): mysql.Pool | null {
  return pool;
}

// Helper: run a query, return rows. Returns empty array if no DB.
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (!pool) return [];
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

// Helper: run an insert/update, return result info. Returns null if no DB.
export async function execute(sql: string, params: any[] = []): Promise<mysql.ResultSetHeader | null> {
  if (!pool) return null;
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
