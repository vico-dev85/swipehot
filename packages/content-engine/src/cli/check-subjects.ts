// Must be run via CLI entry point for .env loading
// Instead, just use: npx tsx src/cli/index.ts status
// This is a standalone debug — manually load .env

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '..', '.env');

try {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

const { loadConfig } = await import('../config.js');
const { initDb, query } = await import('../db.js');

const config = loadConfig();
await initDb(config);

const rows = await query<{ keyword: string; cb_data: string }>(
  `SELECT keyword, cb_data FROM keywords WHERE cb_data IS NOT NULL ORDER BY RAND() LIMIT 5`
);

for (const r of rows) {
  try {
    const raw = typeof r.cb_data === 'string' ? r.cb_data : JSON.stringify(r.cb_data);
    const data = typeof r.cb_data === 'string' ? JSON.parse(r.cb_data) : r.cb_data;
    console.log(`${r.keyword}:`);
    console.log(`  room_subject: "${(data.room_subject || '').slice(0, 80)}"`);
    console.log(`  num_followers: ${data.num_followers || 0}`);
    console.log(`  seconds_online: ${data.seconds_online || 0}`);
    console.log('');
  } catch (e) {
    console.log(`${r.keyword}: INVALID cb_data — type=${typeof r.cb_data}, preview="${String(r.cb_data).slice(0, 50)}"`);
  }
}

process.exit(0);
