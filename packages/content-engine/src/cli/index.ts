#!/usr/bin/env node

// Content engine CLI — generates SEO model pages, manages keywords, generates sitemaps.
// Usage: npx tsx src/cli/index.ts <command> [options]

// Load .env file before anything else
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..');

// Simple .env loader — no extra dependency needed
function loadEnvFile(path: string): void {
  try {
    const content = readFileSync(path, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      // Don't override existing env vars
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env file doesn't exist — that's fine
  }
}

// Try .env in package root, then repo root
loadEnvFile(join(PKG_ROOT, '.env'));
loadEnvFile(join(PKG_ROOT, '..', '..', '.env'));

import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { loadConfig, type AIProvider } from '../config.js';
import { initDb, query, execute, closeDb } from '../db.js';
import { getTopModels, fetchOnlineRooms, downloadScreenshot, type CBRoom } from '../services/chaturbate.js';
import { generateModelPage, generateBatch } from '../generators/model-page.js';
import { generateMiniBio, generateCategoryIntro } from '../services/claude.js';
import { generateSitemap } from '../seo/sitemap.js';
import { buildAllPages } from '../builders/listicle-builder.js';
import { CATEGORIES } from '../categories.js';
import { generateBlogPost, generateBlogBatch, rebuildBlogLinks } from '../generators/blog-post.js';
import { BLOG_QUEUE, type BlogType } from '../blog/blog-types.js';

const program = new Command();

program
  .name('content-engine')
  .description('SEO content generator for model pages, blog posts, and category hubs')
  .version('0.1.0');

// ─── seed-keywords ──────────────────────────────────────────────────────────

program
  .command('seed-keywords')
  .description('Seed keywords into the database from a file or inline list')
  .requiredOption('--type <type>', 'Keyword type: model_name or general')
  .option('--file <path>', 'Path to CSV file (keyword in first column)')
  .option('--names <list>', 'Comma-separated list of keywords')
  .action(async (opts) => {
    const config = loadConfig();
    const dbReady = await initDb(config);
    if (!dbReady) {
      console.error('ERROR: seed-keywords requires a MySQL connection.');
      process.exit(1);
    }

    let keywords: string[] = [];

    if (opts.file) {
      const filePath = join(process.cwd(), opts.file);
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      // Skip header if it looks like a CSV header
      const start = lines[0].includes('keyword') ? 1 : 0;
      for (let i = start; i < lines.length; i++) {
        const kw = lines[i].split(',')[0].trim();
        if (kw.length > 0) keywords.push(kw);
      }
    } else if (opts.names) {
      keywords = opts.names.split(',').map((n: string) => n.trim()).filter((n: string) => n.length > 0);
    } else {
      console.error('ERROR: Provide --file or --names');
      process.exit(1);
    }

    console.log(`[seed] Seeding ${keywords.length} keywords (type: ${opts.type})...`);

    let inserted = 0;
    let skipped = 0;
    for (const kw of keywords) {
      try {
        const result = await execute(
          'INSERT IGNORE INTO keywords (keyword, type, priority) VALUES (?, ?, ?)',
          [kw, opts.type, 50]
        );
        if (result && result.affectedRows > 0) {
          inserted++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }

    console.log(`[seed] Done: ${inserted} inserted, ${skipped} skipped (duplicates)`);
    await closeDb();
  });

// ─── seed-from-api ──────────────────────────────────────────────────────────

program
  .command('seed-from-api')
  .description('Fetch online Chaturbate models and store with full room data (tags, age, country, etc.)')
  .option('--count <n>', 'Number of top models to fetch', '500')
  .option('--gender <g>', 'Filter by gender: f, m, t, c (default: all)')
  .action(async (opts) => {
    const config = loadConfig();
    const dbReady = await initDb(config);

    const count = parseInt(opts.count, 10);
    console.log(`[seed-api] Fetching top ${count} online models${opts.gender ? ` (gender: ${opts.gender})` : ''}...`);

    const models = await getTopModels(config, count);
    console.log(`[seed-api] Found ${models.length} online models with full data`);

    if (!dbReady) {
      console.log('[seed-api] No MySQL — printing what we found:');
      for (const m of models.slice(0, 20)) {
        console.log(`  ${m.username} | ${m.num_users} viewers | age:${m.age ?? '?'} | ${m.gender} | ${m.tags.slice(0, 5).join(', ')}`);
      }
      console.log(`  ... and ${Math.max(0, models.length - 20)} more`);
      return;
    }

    let inserted = 0;
    let updated = 0;
    for (const m of models) {
      // Store full CB room data as JSON
      const cbData = JSON.stringify({
        username: m.username,
        display_name: m.display_name,
        age: m.age,
        gender: m.gender,
        num_users: m.num_users,
        num_followers: m.num_followers,
        tags: m.tags,
        image_url: m.image_url,
        image_url_360x270: m.image_url_360x270,
        room_subject: m.room_subject,
        spoken_languages: m.spoken_languages,
        country: m.country,
        is_hd: m.is_hd,
        is_new: m.is_new,
        seconds_online: m.seconds_online,
      });

      const priority = Math.min(100, Math.round(Math.log10(m.num_users + 1) * 30));

      // Insert new or update existing with fresh data
      const result = await execute(
        `INSERT INTO keywords (keyword, type, priority, cb_data, seen_online_at)
         VALUES (?, 'model_name', ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           cb_data = VALUES(cb_data),
           seen_online_at = NOW(),
           priority = GREATEST(priority, VALUES(priority))`,
        [m.username, priority, cbData]
      );

      if (result) {
        if (result.affectedRows === 1) inserted++;
        else if (result.affectedRows === 2) updated++; // ON DUPLICATE KEY UPDATE counts as 2
      }
    }

    console.log(`[seed-api] Done: ${inserted} new, ${updated} updated (fresh data)`);
    await closeDb();
  });

// ─── generate ───────────────────────────────────────────────────────────────

program
  .command('generate')
  .description('Generate model pages from the keyword queue')
  .requiredOption('--type <type>', 'Content type: model_page')
  .option('--count <n>', 'Number of pages to generate', '5')
  .option('--keyword <kw>', 'Generate for a specific keyword')
  .option('--output <dir>', 'Output directory (default: packages/frontend/public)')
  .option('--provider <provider>', 'AI provider: claude, arli, or openai')
  .action(async (opts) => {
    const config = loadConfig(opts.provider as AIProvider | undefined);
    await initDb(config);

    if (opts.type !== 'model_page') {
      console.error('ERROR: Only model_page is supported in MVP. Blog posts coming later.');
      process.exit(1);
    }

    if (opts.keyword) {
      // Generate a single specific page — look up stored CB data first
      const rows = await query<{ cb_data: string | null }>(
        "SELECT cb_data FROM keywords WHERE keyword = ? AND cb_data IS NOT NULL LIMIT 1",
        [opts.keyword]
      );
      let cbData: CBRoom | null = null;
      if (rows.length > 0 && rows[0].cb_data) {
        try { cbData = JSON.parse(rows[0].cb_data) as CBRoom; } catch {}
      }
      if (!cbData) {
        console.error(`ERROR: No stored CB data for "${opts.keyword}".`);
        console.error('Run "collect" first to fetch real model data, or use "seed-from-api".');
        process.exit(1);
      }
      const result = await generateModelPage(config, opts.keyword, cbData, opts.output);
      if (result.success) {
        console.log(`\nSUCCESS: ${result.username} → ${result.htmlPath} (score: ${result.qualityScore})`);
      } else {
        console.error(`\nFAILED: ${result.username} — ${result.error}`);
        process.exit(1);
      }
    } else {
      // Batch generate from queue
      const count = parseInt(opts.count, 10);
      const results = await generateBatch(config, count, opts.output);
      const successes = results.filter(r => r.success);
      const failures = results.filter(r => !r.success);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`RESULTS: ${successes.length} succeeded, ${failures.length} failed`);
      if (successes.length > 0) {
        console.log('\nSuccessful:');
        for (const r of successes) {
          console.log(`  ${r.username} → ${r.htmlPath} (score: ${r.qualityScore})`);
        }
      }
      if (failures.length > 0) {
        console.log('\nFailed:');
        for (const r of failures) {
          console.log(`  ${r.username} — ${r.error}`);
        }
      }
    }

    await closeDb();
  });

// ─── collect (daily cron job) ────────────────────────────────────────────────

program
  .command('collect')
  .description('Fetch online models, store data, download screenshots, generate mini-bios. Run via cron.')
  .option('--count <n>', 'Models to fetch per run', '1000')
  .option('--tag <tag>', 'Filter by CB tag (e.g. asian, indian, ebony)')
  .option('--gender <g>', 'Filter by gender: f, m, t, c')
  .option('--fill-categories', 'Auto-collect for all thin categories (< 20 models)')
  .option('--screenshots', 'Download model screenshots locally', false)
  .option('--bios', 'Generate 50-80 word mini-bios for models missing them', false)
  .option('--bio-batch <n>', 'Max mini-bios to generate per run (to control API costs)', '50')
  .option('--descriptions', 'Generate micro-descriptions (listicle spotlights) for models missing them', false)
  .option('--desc-batch <n>', 'Max micro-descriptions to generate per run', '50')
  .option('--output <dir>', 'Output directory for screenshots', '')
  .action(async (opts) => {
    const config = loadConfig();
    const dbReady = await initDb(config);
    if (!dbReady) {
      console.error('ERROR: collect requires MySQL to store model data.');
      process.exit(1);
    }

    const count = parseInt(opts.count, 10);
    let models: Awaited<ReturnType<typeof getTopModels>>;

    if (opts.fillCategories) {
      // Pull 500 per category using each category's own tags + gender filters
      const { CATEGORIES } = await import('../categories.js');
      const seen = new Set<string>();
      models = [];

      // First: general top-500 pool (covers popular models across all categories)
      console.log(`[collect] === Fill All Categories (500 per category) ===\n`);
      const general = await getTopModels(config, 500);
      for (const m of general) { if (!seen.has(m.username)) { seen.add(m.username); models.push(m); } }
      console.log(`  General pool: ${general.length} models`);

      // Then: targeted pull for each category
      for (const cat of CATEGORIES) {
        const tags = [...cat.primaryTags, ...cat.secondaryTags];

        // Gender-based categories (gay, trans, couple): pull by gender
        if (cat.genderFilter) {
          try {
            const rooms = await fetchOnlineRooms(config, { gender: cat.genderFilter, limit: 500 });
            let added = 0;
            for (const m of rooms) { if (!seen.has(m.username)) { seen.add(m.username); models.push(m); added++; } }
            console.log(`  ${cat.slug}: gender=${cat.genderFilter} → ${rooms.length} from API, ${added} new`);
          } catch (err) {
            console.warn(`  ${cat.slug}: gender pull failed — ${(err as Error).message}`);
          }
        }

        // Tag-based pulls: pull 500 for each primary tag, then key secondary tags
        for (const tag of tags) {
          try {
            const rooms = await fetchOnlineRooms(config, { tag, limit: 500 });
            let added = 0;
            for (const m of rooms) { if (!seen.has(m.username)) { seen.add(m.username); models.push(m); added++; } }
            console.log(`  ${cat.slug}: tag="${tag}" → ${rooms.length} from API, ${added} new`);
          } catch (err) {
            console.warn(`  ${cat.slug}: tag="${tag}" failed — ${(err as Error).message}`);
          }
        }
      }
      console.log(`\n[collect] Total unique models: ${models.length}`);
    } else if (opts.tag) {
      // Single tag targeted pull
      console.log(`[collect] Fetching tag="${opts.tag}" (up to ${count})...`);
      models = [];
      for (const offset of [0, 500, 1000]) {
        try {
          const rooms = await fetchOnlineRooms(config, { tag: opts.tag, gender: opts.gender, limit: 500, offset });
          models.push(...rooms);
          if (rooms.length < 500) break;
        } catch { break; }
      }
      models = models.slice(0, count);
      console.log(`[collect] Got ${models.length} models with tag "${opts.tag}"`);
    } else {
      console.log(`[collect] Fetching up to ${count} online models...`);
      models = await getTopModels(config, count);
      console.log(`[collect] Got ${models.length} online models from CB API`);
    }

    const outputDir = opts.output || join(PKG_ROOT, '..', 'frontend', 'public', 'content-data');

    let inserted = 0;
    let updated = 0;
    let screenshotsDownloaded = 0;

    for (const m of models) {
      const cbData = JSON.stringify({
        username: m.username,
        display_name: m.display_name,
        age: m.age,
        gender: m.gender,
        num_users: m.num_users,
        num_followers: m.num_followers,
        tags: m.tags,
        image_url: m.image_url,
        image_url_360x270: m.image_url_360x270,
        room_subject: m.room_subject,
        spoken_languages: m.spoken_languages,
        country: m.country,
        is_hd: m.is_hd,
        is_new: m.is_new,
        seconds_online: m.seconds_online,
      });

      const priority = Math.min(100, Math.round(Math.log10(m.num_users + 1) * 30));

      // Upsert into keywords table (existing behavior)
      const result = await execute(
        `INSERT INTO keywords (keyword, type, priority, cb_data, seen_online_at)
         VALUES (?, 'model_name', ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           cb_data = VALUES(cb_data),
           seen_online_at = NOW(),
           priority = GREATEST(priority, VALUES(priority))`,
        [m.username, priority, cbData]
      );

      if (result) {
        if (result.affectedRows === 1) inserted++;
        else if (result.affectedRows === 2) updated++;
      }

      // Upsert into models table with new listicle columns
      await execute(
        `INSERT INTO models (model_name, chaturbate_username, display_name, gender, tags, is_currently_online, last_seen_online_at, num_followers)
         VALUES (?, ?, ?, ?, ?, 1, NOW(), ?)
         ON DUPLICATE KEY UPDATE
           display_name = VALUES(display_name),
           gender = VALUES(gender),
           tags = VALUES(tags),
           is_currently_online = 1,
           last_seen_online_at = NOW(),
           num_followers = VALUES(num_followers),
           updated_at = NOW()`,
        [m.username, m.username, m.display_name, m.gender || null, JSON.stringify(m.tags), m.num_followers]
      );

      // Upsert daily snapshot (accumulate viewer stats for 7-day average)
      await execute(
        `INSERT INTO daily_snapshots (model_username, snapshot_date, avg_viewers, peak_viewers, times_seen_online)
         VALUES (?, CURDATE(), ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           avg_viewers = ROUND((avg_viewers * times_seen_online + VALUES(avg_viewers)) / (times_seen_online + 1)),
           peak_viewers = GREATEST(peak_viewers, VALUES(peak_viewers)),
           times_seen_online = times_seen_online + 1`,
        [m.username, m.num_users, m.num_users]
      );

      // Download screenshot if requested
      if (opts.screenshots && m.image_url) {
        const screenshotPath = await downloadScreenshot(m.image_url, outputDir, m.username);
        if (screenshotPath) {
          await execute(
            `UPDATE models SET screenshot_local_path = ?, screenshot_updated_at = NOW() WHERE model_name = ?`,
            [screenshotPath, m.username]
          );
          screenshotsDownloaded++;
        }
      }
    }

    // Mark models NOT in this fetch as offline
    const onlineUsernames = models.map(m => m.username);
    if (onlineUsernames.length > 0) {
      const placeholders = onlineUsernames.map(() => '?').join(',');
      await execute(
        `UPDATE models SET is_currently_online = 0 WHERE model_name NOT IN (${placeholders}) AND is_currently_online = 1`,
        onlineUsernames
      );
    }

    // Generate mini-bios for models missing them (if --bios flag)
    let biosGenerated = 0;
    if (opts.bios) {
      const bioBatch = parseInt(opts.bioBatch, 10);
      console.log(`[collect] Generating mini-bios (max ${bioBatch})...`);

      // Find models with CB data but no cached bio
      const needBios = await query<{ keyword: string; cb_data: string }>(
        `SELECT k.keyword, k.cb_data FROM keywords k
         JOIN models m ON m.model_name = k.keyword
         WHERE k.cb_data IS NOT NULL AND (m.bio_cached IS NULL OR m.bio_cached = '')
         ORDER BY k.priority DESC
         LIMIT ?`,
        [bioBatch]
      );

      for (const row of needBios) {
        try {
          const cbData = (typeof row.cb_data === 'string' ? JSON.parse(row.cb_data) : row.cb_data) as CBRoom;
          const miniBio = await generateMiniBio(config, row.keyword, cbData);
          await execute(
            `UPDATE models SET bio_cached = ?, bio_generated_at = NOW() WHERE model_name = ?`,
            [miniBio.text, row.keyword]
          );
          biosGenerated++;
          if (biosGenerated % 10 === 0) {
            console.log(`[collect] Generated ${biosGenerated}/${needBios.length} mini-bios...`);
          }
        } catch (err) {
          console.warn(`[bio] Failed for ${row.keyword}: ${(err as Error).message}`);
        }
      }
    }

    // Generate micro-descriptions for listicle cards (if --descriptions flag)
    // Smart priority: only generate for models likely to appear in listicle top-20s
    // Uses: is_currently_online (1000 bonus), num_followers (log scale), avg_viewers_7d
    let descriptionsGenerated = 0;
    if (opts.descriptions) {
      const descBatch = parseInt(opts.descBatch, 10);
      console.log(`[collect] Generating micro-descriptions (max ${descBatch}, smart priority)...`);

      // Find models most likely to appear in listicles: online + high followers + high avg viewers
      const needDescs = await query<{ keyword: string; cb_data: string }>(
        `SELECT k.keyword, k.cb_data FROM keywords k
         JOIN models m ON m.model_name = k.keyword
         WHERE k.cb_data IS NOT NULL AND (m.micro_description IS NULL OR m.micro_description = '')
         ORDER BY (m.is_currently_online * 1000) + COALESCE(LOG10(GREATEST(m.num_followers, 1)) * 50, 0) + COALESCE(m.avg_viewers_7d, 0) DESC
         LIMIT ?`,
        [descBatch]
      );

      console.log(`[collect] Found ${needDescs.length} models needing descriptions (prioritized by listicle rank)`);

      // Assign round-robin angles so models in the same batch get different angles
      const { getRandomAngle } = await import('../services/claude.js');
      for (let i = 0; i < needDescs.length; i++) {
        const row = needDescs[i];
        try {
          const cbData = (typeof row.cb_data === 'string' ? JSON.parse(row.cb_data) : row.cb_data) as CBRoom;
          const angle = getRandomAngle(i);
          const miniBio = await generateMiniBio(config, row.keyword, cbData, angle);
          await execute(
            `UPDATE models SET micro_description = ? WHERE model_name = ?`,
            [miniBio.text, row.keyword]
          );
          descriptionsGenerated++;
          if (descriptionsGenerated % 10 === 0) {
            console.log(`[collect] Generated ${descriptionsGenerated}/${needDescs.length} micro-descriptions...`);
          }
        } catch (err) {
          console.warn(`[desc] Failed for ${row.keyword}: ${(err as Error).message}`);
        }
      }
    }

    // Update 7-day average viewer counts
    await execute(
      `UPDATE models m
       SET avg_viewers_7d = COALESCE((
         SELECT AVG(ds.avg_viewers)
         FROM daily_snapshots ds
         WHERE ds.model_username = m.model_name
           AND ds.snapshot_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       ), 0)`
    );

    // Show accumulation stats
    const totalWithData = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM keywords WHERE type = 'model_name' AND cb_data IS NOT NULL"
    );
    const totalModels = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM models"
    );
    const withBios = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM models WHERE bio_cached IS NOT NULL AND bio_cached != ''"
    );
    const withDescs = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM models WHERE micro_description IS NOT NULL AND micro_description != ''"
    );
    const withScreenshots = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM models WHERE screenshot_local_path IS NOT NULL"
    );

    console.log(`\n[collect] === Run Summary ===`);
    console.log(`  Keywords: ${inserted} new, ${updated} refreshed`);
    console.log(`  Total keywords with data: ${totalWithData[0]?.cnt ?? 0}`);
    console.log(`  Total models in DB: ${totalModels[0]?.cnt ?? 0}`);
    if (opts.screenshots) console.log(`  Screenshots downloaded: ${screenshotsDownloaded}`);
    if (opts.bios) console.log(`  Mini-bios generated: ${biosGenerated}`);
    if (opts.descriptions) console.log(`  Micro-descriptions generated: ${descriptionsGenerated}`);
    console.log(`  Models with bios: ${withBios[0]?.cnt ?? 0}`);
    console.log(`  Models with micro-descriptions: ${withDescs[0]?.cnt ?? 0}`);
    console.log(`  Models with screenshots: ${withScreenshots[0]?.cnt ?? 0}`);
    await closeDb();
  });

// ─── status ─────────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Show pipeline status: keyword counts, generated pages, recent runs')
  .action(async () => {
    const config = loadConfig();
    const dbReady = await initDb(config);

    if (!dbReady) {
      console.log('[status] No MySQL connection — checking filesystem...');
      // Count model directories
      const { readdir } = await import('node:fs/promises');
      try {
        const outputDir = join(PKG_ROOT, '..', 'frontend', 'public', 'models');
        const dirs = await readdir(outputDir, { withFileTypes: true });
        const modelDirs = dirs.filter(d => d.isDirectory());
        console.log(`\nModel pages on disk: ${modelDirs.length}`);
        for (const d of modelDirs) {
          console.log(`  /models/${d.name}/`);
        }
      } catch {
        console.log('\nNo model pages generated yet.');
      }
      return;
    }

    // Keyword stats
    const kwStats = await query<{ status: string; cnt: number }>(
      'SELECT status, COUNT(*) as cnt FROM keywords WHERE type = ? GROUP BY status',
      ['model_name']
    );
    console.log('\n--- Keywords (model_name) ---');
    for (const row of kwStats) {
      console.log(`  ${row.status}: ${row.cnt}`);
    }

    // CB data coverage
    const withData = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM keywords WHERE type = 'model_name' AND cb_data IS NOT NULL"
    );
    const withoutData = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM keywords WHERE type = 'model_name' AND cb_data IS NULL"
    );
    const readyToGen = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM keywords WHERE type = 'model_name' AND status = 'pending' AND cb_data IS NOT NULL"
    );
    console.log(`\n--- CB Data Coverage ---`);
    console.log(`  With real data: ${withData[0]?.cnt ?? 0}`);
    console.log(`  Without data: ${withoutData[0]?.cnt ?? 0}`);
    console.log(`  Ready to generate: ${readyToGen[0]?.cnt ?? 0}`);

    // Model stats
    const modelStats = await query<{ status: string; cnt: number }>(
      'SELECT status, COUNT(*) as cnt FROM models GROUP BY status'
    );
    console.log('\n--- Models ---');
    for (const row of modelStats) {
      console.log(`  ${row.status}: ${row.cnt}`);
    }

    // Living listicle stats
    const withBios = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM models WHERE bio_cached IS NOT NULL AND bio_cached != ''"
    );
    const withDescriptions = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM models WHERE micro_description IS NOT NULL AND micro_description != ''"
    ).catch(() => [{ cnt: 0 }]);
    const withScreenshots = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM models WHERE screenshot_local_path IS NOT NULL"
    );
    const onlineNow = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM models WHERE is_currently_online = 1"
    );
    const totalVotes = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM user_votes"
    ).catch(() => [{ cnt: 0 }]);
    const totalSnapshots = await query<{ cnt: number }>(
      "SELECT COUNT(DISTINCT model_username) as cnt FROM daily_snapshots"
    ).catch(() => [{ cnt: 0 }]);
    const catContent = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM category_content WHERE intro_text IS NOT NULL"
    ).catch(() => [{ cnt: 0 }]);
    const recentBuilds = await query<{ category_slug: string; models_count: number; created_at: string }>(
      "SELECT category_slug, models_count, created_at FROM page_builds ORDER BY created_at DESC LIMIT 5"
    ).catch(() => []);

    console.log('\n--- Living Listicle Data ---');
    console.log(`  Models with mini-bios: ${withBios[0]?.cnt ?? 0}`);
    console.log(`  Models with micro-descriptions: ${withDescriptions[0]?.cnt ?? 0}`);
    console.log(`  Category intros generated: ${catContent[0]?.cnt ?? 0}/25`);
    console.log(`  Models with screenshots: ${withScreenshots[0]?.cnt ?? 0}`);
    console.log(`  Currently online: ${onlineNow[0]?.cnt ?? 0}`);
    console.log(`  Total user votes: ${totalVotes[0]?.cnt ?? 0}`);
    console.log(`  Models with daily snapshots: ${totalSnapshots[0]?.cnt ?? 0}`);

    if (recentBuilds.length > 0) {
      console.log('\n--- Recent Page Builds ---');
      for (const build of recentBuilds) {
        console.log(`  ${build.category_slug} — ${build.models_count} models — ${build.created_at}`);
      }
    }

    // Recent pipeline runs
    const recentRuns = await query<{ keyword: string; success: number; quality_score: number | null; created_at: string }>(
      'SELECT keyword, success, quality_score, created_at FROM pipeline_runs ORDER BY created_at DESC LIMIT 10'
    );
    if (recentRuns.length > 0) {
      console.log('\n--- Recent Pipeline Runs ---');
      for (const run of recentRuns) {
        const status = run.success ? 'OK' : 'FAIL';
        const score = run.quality_score !== null ? ` (score: ${run.quality_score})` : '';
        console.log(`  [${status}] ${run.keyword}${score} — ${run.created_at}`);
      }
    }

    await closeDb();
  });

// ─── sitemap ────────────────────────────────────────────────────────────────

program
  .command('sitemap')
  .description('Regenerate sitemap.xml from active models')
  .option('--output <dir>', 'Output directory (default: packages/frontend/public)')
  .action(async (opts) => {
    const config = loadConfig();
    await initDb(config);

    const outputDir = opts.output || join(PKG_ROOT, '..', 'frontend', 'public');
    const count = await generateSitemap(config, outputDir);
    console.log(`[sitemap] Generated sitemap with ${count} URLs`);

    await closeDb();
  });

// ─── test-one (no MySQL needed) ─────────────────────────────────────────────

program
  .command('test-one')
  .description('Quick test: fetch 1 live model from CB API, generate a page, write HTML. No MySQL needed.')
  .option('--provider <provider>', 'AI provider: claude, arli, or openai')
  .option('--output <dir>', 'Output directory')
  .action(async (opts) => {
    const config = loadConfig(opts.provider as AIProvider | undefined);
    // No initDb() — this command works without MySQL

    console.log(`[test] Fetching a live model from Chaturbate API...`);
    const models = await getTopModels(config, 20);
    if (models.length === 0) {
      console.error('ERROR: Could not fetch any models from CB API.');
      process.exit(1);
    }

    // Pick a model with good data (has tags, decent viewers)
    const model = models.find(m => m.tags.length >= 3 && m.num_users >= 50) || models[0];
    console.log(`[test] Selected: ${model.username} (${model.num_users} viewers, age:${model.age ?? '?'}, tags:[${model.tags.slice(0, 5).join(', ')}])`);

    // Generate bio via AI
    console.log(`[test] Generating bio via ${config.aiProvider}...`);
    const { generateModelBio, ANGLES } = await import('../services/claude.js');
    const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)].name;
    console.log(`[test] Using angle: ${angle}`);

    const content = await generateModelBio(config, model.username, model, angle);
    console.log(`[test] Bio generated: ${content.bio.length} chars, meta: "${content.metaDescription.slice(0, 60)}..."`);
    console.log(`[test] Categories: ${content.categories.join(', ')}`);

    // Validate
    const { validateModelBio } = await import('../validators/content.js');
    const validation = validateModelBio(content.bio, content.metaDescription, model.username);
    console.log(`[test] Quality score: ${validation.score}/100 (${validation.valid ? 'PASS' : 'FAIL'})`);
    if (validation.issues.length > 0) {
      console.log(`[test] Issues: ${validation.issues.join('; ')}`);
    }

    // Render HTML
    const { renderModelPage } = await import('../renderer/html.js');
    const { buildEmbedUrl, buildRoomUrl } = await import('../services/chaturbate.js');

    const displayName = model.display_name || model.username.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const html = await renderModelPage(config, {
      username: model.username,
      displayName,
      bio: content.bio,
      metaDescription: content.metaDescription,
      categories: content.categories,
      tags: model.tags,
      imageUrl: model.image_url,
      isOnline: true,
      numUsers: model.num_users,
      numFollowers: model.num_followers,
      age: model.age,
      gender: model.gender,
      roomSubject: model.room_subject,
      embedUrl: buildEmbedUrl(config, model.username),
      roomUrl: buildRoomUrl(config, model.username),
      relatedModels: [],
    });

    // Write file
    const { mkdir, writeFile } = await import('node:fs/promises');
    const pubDir = opts.output || join(PKG_ROOT, '..', 'frontend', 'public');
    const modelDir = join(pubDir, 'models', model.username);
    await mkdir(modelDir, { recursive: true });
    const htmlPath = join(modelDir, 'index.html');
    await writeFile(htmlPath, html, 'utf-8');

    console.log(`\n${'='.repeat(60)}`);
    console.log(`SUCCESS!`);
    console.log(`Model:    ${model.username} (${displayName})`);
    console.log(`Score:    ${validation.score}/100`);
    console.log(`Angle:    ${angle}`);
    console.log(`Provider: ${config.aiProvider}`);
    console.log(`File:     ${htmlPath}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nOpen it:  start "${htmlPath}"`);
  });

// ─── build-pages (living listicle generator) ────────────────────────────────

program
  .command('build-pages')
  .description('Build living listicle HTML pages from scored model data. Run every 30 minutes via cron.')
  .option('--category <slug>', 'Build only this category slug (default: all)')
  .option('--output <dir>', 'Output directory (default: packages/frontend/public)')
  .action(async (opts) => {
    const config = loadConfig();
    const dbReady = await initDb(config);
    if (!dbReady) {
      console.error('ERROR: build-pages requires a MySQL connection.');
      process.exit(1);
    }

    const outputDir = opts.output || join(PKG_ROOT, '..', 'frontend', 'public');
    const slug = opts.category || undefined;

    console.log(`[build] Building listicle pages${slug ? ` (${slug} only)` : ' (all 25 categories)'}...`);
    console.log(`[build] Output: ${outputDir}`);

    const results = await buildAllPages(config, outputDir, slug);

    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    console.log(`\n[build] === Summary ===`);
    console.log(`  Built: ${successes.length} pages`);
    console.log(`  Skipped: ${failures.length} (no models or errors)`);
    console.log(`  Total models across all pages: ${successes.reduce((sum, r) => sum + r.modelsCount, 0)}`);
    console.log(`  Total build time: ${results.reduce((sum, r) => sum + r.durationMs, 0)}ms`);

    await closeDb();
  });

// ─── generate-blog (single blog post) ──────────────────────────────────────

program
  .command('generate-blog')
  .description('Generate a single blog post by slug')
  .requiredOption('--slug <slug>', 'Blog post slug (e.g. "is-chaturbate-safe")')
  .option('--type <type>', 'Blog type override: safety_guide, methods_guide, how_to_guide, platform_review, payment_guide')
  .option('--output <dir>', 'Output directory (default: packages/frontend/public)')
  .option('--provider <provider>', 'AI provider: claude, arli, or openai')
  .action(async (opts) => {
    const config = loadConfig(opts.provider as AIProvider | undefined);
    const dbReady = await initDb(config);
    if (!dbReady) {
      console.error('ERROR: generate-blog requires a MySQL connection.');
      process.exit(1);
    }

    const result = await generateBlogPost(config, opts.slug, opts.type as BlogType, opts.output);

    if (result.success) {
      console.log(`\nSUCCESS: ${result.slug} → ${result.htmlPath} (score: ${result.qualityScore}, words: ${result.wordCount})`);
    } else {
      console.error(`\nFAILED: ${result.slug} — ${result.error}`);
      process.exit(1);
    }

    await closeDb();
  });

// ─── generate-blog-batch ───────────────────────────────────────────────────

program
  .command('generate-blog-batch')
  .description('Generate multiple blog posts from the priority queue')
  .option('--count <n>', 'Number of posts to generate', '5')
  .option('--output <dir>', 'Output directory (default: packages/frontend/public)')
  .option('--provider <provider>', 'AI provider: claude, arli, or openai')
  .action(async (opts) => {
    const config = loadConfig(opts.provider as AIProvider | undefined);
    const dbReady = await initDb(config);
    if (!dbReady) {
      console.error('ERROR: generate-blog-batch requires a MySQL connection.');
      process.exit(1);
    }

    const count = parseInt(opts.count, 10);
    console.log(`[blog-batch] Generating up to ${count} blog posts...`);
    console.log(`[blog-batch] Queue has ${BLOG_QUEUE.length} total posts defined`);

    const results = await generateBlogBatch(config, count, opts.output);

    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESULTS: ${successes.length} succeeded, ${failures.length} failed`);
    if (successes.length > 0) {
      console.log('\nSuccessful:');
      for (const r of successes) {
        console.log(`  ${r.slug} → ${r.htmlPath} (score: ${r.qualityScore}, words: ${r.wordCount})`);
      }
    }
    if (failures.length > 0) {
      console.log('\nFailed:');
      for (const r of failures) {
        console.log(`  ${r.slug} — ${r.error}`);
      }
    }

    await closeDb();
  });

// ─── rebuild-blog-links ────────────────────────────────────────────────────

program
  .command('rebuild-blog-links')
  .description('Re-inject internal links into all published blog posts (run after adding new pages)')
  .option('--output <dir>', 'Output directory (default: packages/frontend/public)')
  .action(async (opts) => {
    const config = loadConfig();
    const dbReady = await initDb(config);
    if (!dbReady) {
      console.error('ERROR: rebuild-blog-links requires a MySQL connection.');
      process.exit(1);
    }

    const updated = await rebuildBlogLinks(config, opts.output);
    console.log(`[blog-links] Done: ${updated} blog posts updated with fresh links`);

    await closeDb();
  });

// ─── generate-category-content ──────────────────────────────────────────────

// Load top keywords per category from tier3-categories.csv
async function loadCategoryKeywords(): Promise<Map<string, string[]>> {
  const csvPath = join(PKG_ROOT, 'data', 'processed', 'tier3-categories.csv');
  const map = new Map<string, string[]>();

  try {
    const content = await readFile(csvPath, 'utf-8');
    const lines = content.split('\n');
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const keyword = cols[0]?.trim();
      if (!keyword) continue;
      const source = cols[7]?.trim() || '';

      // Match keywords to categories by slug pattern in the source filename or keyword content
      for (const cat of CATEGORIES) {
        const slugBase = cat.slug.replace(/-cams$/, '');
        const allTags = [...cat.primaryTags, ...cat.secondaryTags];

        // Match if keyword contains any of the category's tags
        const kwLower = keyword.toLowerCase();
        const matches = allTags.some(t => kwLower.includes(t.toLowerCase()));
        if (matches) {
          if (!map.has(cat.slug)) map.set(cat.slug, []);
          const arr = map.get(cat.slug)!;
          if (!arr.includes(keyword) && arr.length < 20) {
            arr.push(keyword);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[cat-content] Could not load tier3-categories.csv: ${(err as Error).message}`);
  }

  return map;
}

program
  .command('generate-category-content')
  .description('Generate LLM intro text, FAQs, and internal links for category pages')
  .option('--category <slug>', 'Generate for a specific category (default: all)')
  .option('--provider <provider>', 'AI provider: claude, arli, or openai')
  .option('--force', 'Overwrite existing content', false)
  .action(async (opts) => {
    const config = loadConfig(opts.provider as AIProvider | undefined);
    const dbReady = await initDb(config);
    if (!dbReady) {
      console.error('ERROR: generate-category-content requires a MySQL connection.');
      process.exit(1);
    }

    const categories = opts.category
      ? CATEGORIES.filter(c => c.slug === opts.category)
      : CATEGORIES;

    if (opts.category && categories.length === 0) {
      console.error(`ERROR: Unknown category slug: ${opts.category}`);
      process.exit(1);
    }

    console.log(`[cat-content] Loading keyword data...`);
    const keywordMap = await loadCategoryKeywords();

    console.log(`[cat-content] Generating content for ${categories.length} categories...`);
    console.log(`[cat-content] Provider: ${config.aiProvider}\n`);

    let generated = 0;
    let skipped = 0;
    let failed = 0;

    for (const cat of categories) {
      // Check if content already exists (skip unless --force)
      if (!opts.force) {
        const existing = await query<{ intro_text: string | null }>(
          'SELECT intro_text FROM category_content WHERE category_slug = ?',
          [cat.slug]
        );
        if (existing.length > 0 && existing[0].intro_text && existing[0].intro_text.length > 50) {
          console.log(`  [SKIP] ${cat.slug} — content already exists (use --force to overwrite)`);
          skipped++;
          continue;
        }
      }

      try {
        const topKeywords = keywordMap.get(cat.slug) || [];
        const allTags = [...cat.primaryTags, ...cat.secondaryTags];

        // Pick 4 related categories for internal linking
        const relatedSlugs = CATEGORIES
          .filter(c => c.slug !== cat.slug)
          .slice(0, 4)
          .map(c => c.slug);

        console.log(`  [GEN] ${cat.slug} — ${topKeywords.length} keywords, volume ~${cat.combinedVolume.toLocaleString()}...`);

        const result = await generateCategoryIntro(
          config,
          cat.slug,
          cat.title,
          allTags,
          cat.combinedVolume,
          topKeywords,
          relatedSlugs,
        );

        // Upsert into category_content table
        await execute(
          `INSERT INTO category_content (category_slug, intro_text, faq_json, internal_links_text, generated_at)
           VALUES (?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             intro_text = VALUES(intro_text),
             faq_json = VALUES(faq_json),
             internal_links_text = VALUES(internal_links_text),
             generated_at = NOW()`,
          [cat.slug, result.introText, JSON.stringify(result.faqItems), result.internalLinksText]
        );

        const faqCount = result.faqItems?.length || 0;
        console.log(`  [OK] ${cat.slug} — intro ${result.introText.length} chars, ${faqCount} FAQs`);
        generated++;
      } catch (err) {
        console.error(`  [FAIL] ${cat.slug} — ${(err as Error).message}`);
        failed++;
      }
    }

    console.log(`\n[cat-content] === Summary ===`);
    console.log(`  Generated: ${generated}`);
    console.log(`  Skipped: ${skipped} (already exist)`);
    console.log(`  Failed: ${failed}`);

    await closeDb();
  });

// ─── Parse and run ──────────────────────────────────────────────────────────

program.parse();
