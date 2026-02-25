import { loadConfig } from '../config.js';
import { initDb, query } from '../db.js';
const config = loadConfig();
console.log('DB config:', config.mysqlHost, config.mysqlUser, config.mysqlDb);
const ok = await initDb(config);
console.log('DB connected:', ok);

const rows = await query<{ keyword: string; cb_data: string }>(
  `SELECT keyword, cb_data FROM keywords WHERE cb_data IS NOT NULL LIMIT 5`
);

for (const r of rows) {
  const data = JSON.parse(r.cb_data);
  console.log(`${r.keyword}:`);
  console.log(`  room_subject: ${data.room_subject || '(none)'}`);
  console.log(`  num_followers: ${data.num_followers || 0}`);
  console.log(`  seconds_online: ${data.seconds_online || 0}`);
  console.log(`  tags: ${(data.tags || []).join(', ')}`);
  console.log('');
}
