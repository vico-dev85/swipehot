// Quick script to dump real Chaturbate tag frequencies from live API
import { fetchOnlineRooms } from '../services/chaturbate.js';
import { loadConfig } from '../config.js';
import { CATEGORIES } from '../categories.js';

const config = loadConfig();

// Pull 1500 models (3 pages)
const allRooms = [];
for (const offset of [0, 500, 1000]) {
  try {
    const rooms = await fetchOnlineRooms(config, { limit: 500, offset });
    allRooms.push(...rooms);
    if (rooms.length < 500) break;
  } catch { break; }
}

console.log(`Pulled ${allRooms.length} live models\n`);

// Count all tags
const tagCounts = new Map<string, number>();
for (const r of allRooms) {
  for (const t of r.tags) {
    tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  }
}

// Show top 100 tags
console.log('=== TOP 100 REAL CHATURBATE TAGS ===\n');
const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
for (const [tag, count] of sorted.slice(0, 100)) {
  console.log(`${String(count).padStart(4)}  ${tag}`);
}
console.log(`\nTotal unique tags: ${tagCounts.size}\n`);

// Check each category's tags against reality
console.log('=== CATEGORY TAG CHECK ===\n');
for (const cat of CATEGORIES) {
  const allTags = [...cat.primaryTags, ...cat.secondaryTags];
  if (allTags.length === 0 && cat.genderFilter) {
    const genderCount = allRooms.filter(r => r.gender === cat.genderFilter).length;
    console.log(`${cat.slug}: gender=${cat.genderFilter} → ${genderCount} models in pool`);
    continue;
  }
  const found: string[] = [];
  const missing: string[] = [];
  for (const t of allTags) {
    const count = tagCounts.get(t) || tagCounts.get(t.toLowerCase()) || 0;
    if (count > 0) found.push(`${t}(${count})`);
    else missing.push(t);
  }
  console.log(`${cat.slug}:`);
  if (found.length) console.log(`  FOUND: ${found.join(', ')}`);
  if (missing.length) console.log(`  MISSING: ${missing.join(', ')}`);
}
