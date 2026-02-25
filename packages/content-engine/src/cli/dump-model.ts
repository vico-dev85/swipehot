import { fetchOnlineRooms } from '../services/chaturbate.js';
import { loadConfig } from '../config.js';
const config = loadConfig();
const rooms = await fetchOnlineRooms(config, { limit: 3 });
for (const r of rooms) {
  console.log(JSON.stringify(r, null, 2));
  console.log('---');
}
