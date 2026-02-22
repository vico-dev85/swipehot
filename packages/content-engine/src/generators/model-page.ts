// Model page generation pipeline.
// Flow: keyword (with stored CB data) → angle select → AI generate → validate → dedupe → render → write.
// Only generates pages for models we've actually seen online (real data, no guessing).

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from '../config.js';
import { query, execute } from '../db.js';
import {
  extractUsername,
  buildEmbedUrl,
  buildRoomUrl,
  type CBRoom,
} from '../services/chaturbate.js';
import { generateModelBio, ANGLES, type AngleName } from '../services/claude.js';
import { validateModelBio, contentSimilarity } from '../validators/content.js';
import { renderModelPage, type ModelPageData, type RelatedModel } from '../renderer/html.js';
import { generateSitemap } from '../seo/sitemap.js';

// Angle rotation counter — cycles through 12 angles to avoid consecutive repeats
let angleIndex = 0;

const MAX_RETRIES = 2;

// Resolve paths relative to this package, not cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..');

export interface GenerateResult {
  success: boolean;
  username: string;
  keyword: string;
  htmlPath?: string;
  error?: string;
  qualityScore?: number;
}

// Output directory for generated HTML files.
function getOutputDir(): string {
  return join(PKG_ROOT, '..', 'frontend', 'public');
}

// Generate a single model page from a keyword + stored CB data.
export async function generateModelPage(
  config: Config,
  keyword: string,
  storedData: CBRoom | null,
  outputDir?: string,
  angle?: AngleName,
): Promise<GenerateResult> {
  const pubDir = outputDir || getOutputDir();
  const username = extractUsername(keyword);

  console.log(`\n[generate] Processing: "${keyword}" → username: ${username}`);

  if (!storedData) {
    console.log(`[generate] SKIP: No stored CB data for "${username}" — run 'collect' first`);
    return { success: false, username, keyword, error: 'No stored CB data — model not seen online' };
  }

  console.log(`[generate] Using stored data: ${storedData.num_users} viewers, age:${storedData.age ?? '?'}, tags:[${storedData.tags.slice(0, 5).join(', ')}]`);

  // Mark keyword as processing in DB
  await execute(
    "UPDATE keywords SET status = 'processing' WHERE keyword = ? AND status = 'pending'",
    [keyword]
  );

  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Step 1: Generate content via AI with angle rotation
      const assignedAngle = angle || ANGLES[angleIndex % ANGLES.length].name;
      console.log(`[generate] Generating bio (attempt ${attempt + 1}, angle: ${assignedAngle})...`);
      const content = await generateModelBio(config, username, storedData, assignedAngle);

      // Step 2: Validate content quality
      const validation = validateModelBio(content.bio, content.metaDescription, username);
      console.log(`[generate] Validation: score=${validation.score}, valid=${validation.valid}`);
      if (validation.issues.length > 0) {
        console.log(`[generate] Issues: ${validation.issues.join('; ')}`);
      }

      if (!validation.valid) {
        lastError = `Validation failed (score ${validation.score}): ${validation.issues.join('; ')}`;
        if (attempt < MAX_RETRIES) {
          console.log(`[generate] Retrying (${attempt + 1}/${MAX_RETRIES})...`);
          continue;
        }
        throw new Error(lastError);
      }

      // Step 3: Check for duplicate content against existing models
      const existingBios = await query<{ bio: string }>(
        "SELECT bio FROM models WHERE status = 'active' AND bio IS NOT NULL LIMIT 50"
      );
      let tooSimilar = false;
      for (const existing of existingBios) {
        const similarity = contentSimilarity(content.bio, existing.bio);
        if (similarity > 0.3) {
          lastError = `Content too similar to existing model (${(similarity * 100).toFixed(0)}% overlap)`;
          tooSimilar = true;
          break;
        }
      }
      if (tooSimilar) {
        if (attempt < MAX_RETRIES) {
          console.log(`[generate] ${lastError} — retrying...`);
          continue;
        }
        throw new Error(lastError);
      }

      // Step 4: Find related models
      const relatedModels = await findRelatedModels(username, content.categories);

      // Step 5: Render HTML — all data comes from stored CB snapshot
      const displayName = storedData.display_name || formatDisplayName(username);
      const imageUrl = storedData.image_url || `https://${config.siteDomain}/images/default-model.jpg`;
      const tags = storedData.tags.length > 0 ? storedData.tags : content.categories;

      const pageData: ModelPageData = {
        username,
        displayName,
        bio: content.bio,
        metaDescription: content.metaDescription,
        categories: content.categories,
        tags,
        imageUrl,
        isOnline: true, // We only generate for models we've seen online
        numUsers: storedData.num_users,
        numFollowers: storedData.num_followers,
        age: storedData.age,
        gender: storedData.gender,
        roomSubject: storedData.room_subject,
        embedUrl: buildEmbedUrl(config, username),
        roomUrl: buildRoomUrl(config, username),
        relatedModels,
      };

      const html = await renderModelPage(config, pageData);

      // Step 6: Write file
      const modelDir = join(pubDir, 'models', username);
      await mkdir(modelDir, { recursive: true });
      const htmlPath = join(modelDir, 'index.html');
      await writeFile(htmlPath, html, 'utf-8');
      console.log(`[generate] Wrote: ${htmlPath}`);

      // Step 7: Update DB
      await execute(
        `INSERT INTO models (model_name, chaturbate_username, display_name, bio, categories, tags, status, is_currently_online, num_followers, html_file_path)
         VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, ?)
         ON DUPLICATE KEY UPDATE
           display_name = VALUES(display_name),
           bio = VALUES(bio),
           categories = VALUES(categories),
           tags = VALUES(tags),
           status = 'active',
           is_currently_online = 1,
           num_followers = VALUES(num_followers),
           html_file_path = VALUES(html_file_path),
           updated_at = NOW()`,
        [
          username,
          username,
          displayName,
          content.bio,
          JSON.stringify(content.categories),
          JSON.stringify(tags),
          storedData.num_followers,
          `models/${username}/index.html`,
        ]
      );

      await execute(
        "UPDATE keywords SET status = 'completed', processed_at = NOW() WHERE keyword = ?",
        [keyword]
      );

      await execute(
        "INSERT INTO pipeline_runs (content_type, keyword, success, quality_score) VALUES ('model_page', ?, 1, ?)",
        [keyword, validation.score]
      );

      return {
        success: true,
        username,
        keyword,
        htmlPath,
        qualityScore: validation.score,
      };

    } catch (err) {
      lastError = (err as Error).message;
      if (attempt >= MAX_RETRIES) break;
      console.log(`[generate] Error: ${lastError} — retrying...`);
    }
  }

  // All retries exhausted — mark as failed
  console.error(`[generate] FAILED: ${username} — ${lastError}`);
  await execute(
    "UPDATE keywords SET status = 'failed', error_message = ? WHERE keyword = ?",
    [lastError, keyword]
  );
  await execute(
    "INSERT INTO pipeline_runs (content_type, keyword, success, error_message, retry_count) VALUES ('model_page', ?, 0, ?, ?)",
    [keyword, lastError, MAX_RETRIES]
  );

  return { success: false, username, keyword, error: lastError };
}

// Generate multiple model pages from the keyword queue.
// Only processes keywords that have stored CB data (seen online).
export async function generateBatch(
  config: Config,
  count: number,
  outputDir?: string,
): Promise<GenerateResult[]> {
  // Pull pending keywords that have CB data (seen online)
  const keywords = await query<{ keyword: string; cb_data: string | null }>(
    `SELECT keyword, cb_data FROM keywords
     WHERE type = 'model_name' AND status = 'pending' AND cb_data IS NOT NULL
     ORDER BY priority DESC, id ASC LIMIT ?`,
    [count]
  );

  if (keywords.length === 0) {
    // Check if there are pending keywords WITHOUT data
    const pendingWithout = await query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM keywords WHERE type = 'model_name' AND status = 'pending' AND cb_data IS NULL"
    );
    const withoutCount = pendingWithout[0]?.cnt ?? 0;

    if (withoutCount > 0) {
      console.log(`[generate] No keywords with stored CB data ready to process.`);
      console.log(`[generate] ${withoutCount} keywords are pending but have no CB data.`);
      console.log(`[generate] Run 'collect' first to fetch real model data from CB API.`);
    } else {
      console.log('[generate] No pending keywords to process.');
    }
    return [];
  }

  console.log(`[generate] Processing ${keywords.length} keywords (all with real CB data)...`);
  console.log(`[generate] Angle rotation: ${ANGLES.length} angles, starting at index ${angleIndex}`);
  const results: GenerateResult[] = [];

  for (const row of keywords) {
    // Parse stored CB data
    let cbData: CBRoom | null = null;
    try {
      cbData = row.cb_data ? JSON.parse(row.cb_data) as CBRoom : null;
    } catch {
      console.warn(`[generate] Bad cb_data JSON for "${row.keyword}" — skipping`);
      continue;
    }

    // Rotate angle for each model in the batch
    const batchAngle = ANGLES[angleIndex % ANGLES.length].name;
    angleIndex++;

    const result = await generateModelPage(config, row.keyword, cbData, outputDir, batchAngle);
    results.push(result);

    // Small delay between API calls
    await sleep(1000);
  }

  // Regenerate sitemap after batch
  const pubDir = outputDir || getOutputDir();
  try {
    await generateSitemap(config, pubDir);
  } catch (err) {
    console.warn(`[generate] Sitemap generation failed: ${(err as Error).message}`);
  }

  const successes = results.filter(r => r.success).length;
  const failures = results.filter(r => !r.success).length;
  console.log(`\n[generate] Done: ${successes} succeeded, ${failures} failed out of ${results.length} total`);

  return results;
}

// Find related models from the DB by overlapping categories.
async function findRelatedModels(username: string, categories: string[]): Promise<RelatedModel[]> {
  if (categories.length === 0) return [];

  const models = await query<{ model_name: string; display_name: string; categories: string }>(
    "SELECT model_name, display_name, categories FROM models WHERE status = 'active' AND model_name != ? LIMIT 100",
    [username]
  );

  if (models.length === 0) return [];

  const scored = models.map(m => {
    let cats: string[];
    try {
      cats = JSON.parse(m.categories);
    } catch {
      cats = [];
    }
    const overlap = categories.filter(c => cats.includes(c)).length;
    return { ...m, overlap };
  });

  return scored
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 8)
    .map(m => ({
      username: m.model_name,
      displayName: m.display_name || formatDisplayName(m.model_name),
      imageUrl: '',
    }));
}

// Format a username into a display name: "hot_latina_22" → "Hot Latina 22"
function formatDisplayName(username: string): string {
  return username
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
