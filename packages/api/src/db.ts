/**
 * MySQL Connection Pool
 *
 * Uses mysql2/promise for async queries.
 * Connection is optional — API works without MySQL (events buffered in-memory).
 */

import mysql from 'mysql2/promise';
import { config } from './config.js';

let pool: mysql.Pool | null = null;

export async function connectMySQL(): Promise<void> {
  if (!config.mysql.password) {
    console.warn('[MySQL] No password configured — running without MySQL (events will be buffered in-memory only)');
    return;
  }

  try {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      connectionLimit: config.mysql.connectionLimit,
      waitForConnections: true,
      queueLimit: 0,
    });

    // Test connection
    const conn = await pool.getConnection();
    conn.release();
    console.log('[MySQL] Connected successfully');
  } catch (err) {
    console.error('[MySQL] Connection failed:', (err as Error).message);
    pool = null;
  }
}

export function getPool(): mysql.Pool | null {
  return pool;
}

export async function disconnectMySQL(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[MySQL] Disconnected');
  }
}
