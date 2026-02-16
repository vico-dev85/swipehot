/**
 * Event Logger — Persists analytics events to MySQL
 *
 * Batch INSERT for efficiency. Falls back to in-memory buffer if MySQL unavailable.
 */

import { getPool } from '../db.js';

export interface EventPayload {
  session_id: string;
  visitor_id: string;
  event_type: string;
  timestamp: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  viewport_width?: number;
  viewport_height?: number;
  referrer?: string;
  schema_version?: number;
  ab_variants?: Record<string, string>;
  performer_id?: string;
  time_on_performer_ms?: number;
  view_index?: number;
  [key: string]: unknown;
}

// In-memory fallback when MySQL is unavailable
const memoryBuffer: EventPayload[] = [];
const MAX_MEMORY_BUFFER = 10_000;

export async function logEvents(events: EventPayload[]): Promise<void> {
  const pool = getPool();

  if (!pool) {
    // Buffer in memory (bounded)
    memoryBuffer.push(...events);
    if (memoryBuffer.length > MAX_MEMORY_BUFFER) {
      memoryBuffer.splice(0, memoryBuffer.length - MAX_MEMORY_BUFFER);
    }
    return;
  }

  if (events.length === 0) return;

  // Batch INSERT
  const sql = `
    INSERT INTO events
      (session_id, visitor_id, event_type, event_timestamp, performer_id,
       time_on_performer_ms, view_index, properties, device_type, referrer, schema_version)
    VALUES ?
  `;

  const values = events.map((e) => {
    // Extract denormalized fields, put everything else in properties JSON
    const { session_id, visitor_id, event_type, timestamp, device_type,
            performer_id, time_on_performer_ms, view_index,
            viewport_width, viewport_height, referrer, schema_version,
            ...rest } = e;

    return [
      session_id,
      visitor_id,
      event_type,
      new Date(timestamp),
      performer_id || null,
      time_on_performer_ms || null,
      view_index || null,
      JSON.stringify({ ...rest, viewport_width, viewport_height }),
      device_type || 'mobile',
      referrer || null,
      schema_version || 1,
    ];
  });

  try {
    await pool.query(sql, [values]);
  } catch (err) {
    console.error('[EventLogger] MySQL insert failed:', (err as Error).message);
    // Fall back to memory buffer on failure
    memoryBuffer.push(...events);
    if (memoryBuffer.length > MAX_MEMORY_BUFFER) {
      memoryBuffer.splice(0, memoryBuffer.length - MAX_MEMORY_BUFFER);
    }
  }
}

export function getBufferedCount(): number {
  return memoryBuffer.length;
}

/**
 * Flush memory buffer to MySQL (called when MySQL reconnects).
 */
export async function flushMemoryBuffer(): Promise<number> {
  if (memoryBuffer.length === 0) return 0;
  const pool = getPool();
  if (!pool) return 0;

  const batch = memoryBuffer.splice(0, memoryBuffer.length);
  await logEvents(batch);
  return batch.length;
}
