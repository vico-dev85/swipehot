// Listicle page builder — queries DB for models, runs scoring, renders HTML per category.
// Used by CLI command: build-pages [--category slug] [--output dir]

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Config } from '../config.js';
import { query, execute } from '../db.js';
import { CATEGORIES, modelMatchesCategory, type CategoryDef } from '../categories.js';
import { rankModelsForCategory, type VoteRecord } from '../services/scoring.js';
import { renderListiclePage } from '../renderer/listicle.js';

export interface BuildResult {
  slug: string;
  modelsCount: number;
  htmlPath: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

// Fetch all models with their data for scoring
async function fetchModelsForCategory(category: CategoryDef) {
  // Build the WHERE clause for tag matching
  const allTags = [...category.primaryTags, ...category.secondaryTags];

  let whereClause: string;
  let params: any[];

  if (category.genderFilter) {
    // Gender-based pages (gay, trans): use keywords.cb_data gender field
    // We'll filter in JS since gender is inside JSON
    whereClause = '1=1';
    params = [];
  } else if (allTags.length === 0) {
    // No tags (shouldn't happen, but safety)
    return [];
  } else {
    // Tag-based matching: check if any tag appears in the model's tags JSON
    // MySQL JSON search: JSON_CONTAINS won't work well for OR logic across many tags
    // Instead, we do a LIKE search on the JSON array string representation
    const tagConditions = allTags.map(() => 'LOWER(m.tags) LIKE ?');
    whereClause = `(${tagConditions.join(' OR ')})`;
    params = allTags.map(t => `%"${t.toLowerCase()}"%`);
  }

  const rows = await query<{
    model_name: string;
    display_name: string;
    tags: string;
    is_currently_online: number;
    num_followers: number;
    avg_viewers_7d: number;
    bio_cached: string | null;
    screenshot_local_path: string | null;
    first_seen_at: string;
  }>(
    `SELECT m.model_name, m.display_name, m.tags, m.is_currently_online,
            m.num_followers, m.avg_viewers_7d, m.bio_cached, m.screenshot_local_path,
            m.first_seen_at
     FROM models m
     WHERE m.status != 'removed' AND ${whereClause}
     ORDER BY m.avg_viewers_7d DESC
     LIMIT 100`,
    params
  );

  // Get current viewer counts from keywords table (latest cb_data)
  const viewerMap = new Map<string, { viewers: number; age: number | null; gender: string; country: string; tags: string[]; imageUrl: string; isNew: boolean }>();
  if (rows.length > 0) {
    const usernames = rows.map(r => r.model_name);
    const placeholders = usernames.map(() => '?').join(',');
    const kwRows = await query<{ keyword: string; cb_data: string }>(
      `SELECT keyword, cb_data FROM keywords WHERE keyword IN (${placeholders}) AND cb_data IS NOT NULL`,
      usernames
    );
    for (const kw of kwRows) {
      try {
        const data = JSON.parse(kw.cb_data);
        viewerMap.set(kw.keyword, {
          viewers: data.num_users || 0,
          age: data.age || null,
          gender: data.gender || '',
          country: data.country || '',
          tags: data.tags || [],
          imageUrl: data.image_url || '',
          isNew: data.is_new || false,
        });
      } catch {}
    }
  }

  // Get vote records per model for this category
  const voteMap = new Map<string, VoteRecord[]>();
  if (rows.length > 0) {
    const usernames = rows.map(r => r.model_name);
    const placeholders = usernames.map(() => '?').join(',');
    const voteRows = await query<{ model_username: string; created_at: string }>(
      `SELECT model_username, created_at FROM user_votes
       WHERE category_slug = ? AND model_username IN (${placeholders})`,
      [category.slug, ...usernames]
    );
    for (const v of voteRows) {
      if (!voteMap.has(v.model_username)) voteMap.set(v.model_username, []);
      voteMap.get(v.model_username)!.push({ createdAt: new Date(v.created_at) });
    }
  }

  // Filter gender-based pages
  let filteredRows = rows;
  if (category.genderFilter) {
    filteredRows = rows.filter(r => {
      const kwData = viewerMap.get(r.model_name);
      if (!kwData) {
        // Check tags for gender hints
        const tags = parseTags(r.tags);
        return category.secondaryTags.some(t => tags.includes(t.toLowerCase()));
      }
      return kwData.gender === category.genderFilter ||
        category.secondaryTags.some(t => kwData.tags.map(tt => tt.toLowerCase()).includes(t.toLowerCase()));
    });
  }

  // Assemble model data for scoring
  return filteredRows.map(r => {
    const kwData = viewerMap.get(r.model_name);
    const tags = kwData?.tags || parseTags(r.tags);
    const firstSeen = r.first_seen_at ? new Date(r.first_seen_at) : new Date();
    const daysSinceFirstSeen = (Date.now() - firstSeen.getTime()) / (1000 * 60 * 60 * 24);

    return {
      username: r.model_name,
      displayName: r.display_name || r.model_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      isOnline: r.is_currently_online === 1,
      currentViewers: kwData?.viewers || 0,
      votes: voteMap.get(r.model_name) || [],
      avgViewers7d: r.avg_viewers_7d || 0,
      isNew: kwData?.isNew || daysSinceFirstSeen < 7,
      tags,
      age: kwData?.age || null,
      gender: kwData?.gender || '',
      imageUrl: kwData?.imageUrl || '',
      screenshotPath: r.screenshot_local_path,
      bioCached: r.bio_cached,
      country: kwData?.country || '',
      numFollowers: r.num_followers || 0,
    };
  });
}

function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Build a single category page
export async function buildCategoryPage(
  config: Config,
  category: CategoryDef,
  outputDir: string,
): Promise<BuildResult> {
  const start = Date.now();
  const slug = category.slug;

  try {
    // Fetch and score models
    const modelData = await fetchModelsForCategory(category);
    const allTags = [...category.primaryTags, ...category.secondaryTags];
    const scoredModels = rankModelsForCategory(modelData, allTags);

    if (scoredModels.length === 0) {
      return {
        slug,
        modelsCount: 0,
        htmlPath: '',
        durationMs: Date.now() - start,
        success: false,
        error: 'No models found for this category',
      };
    }

    // Render HTML
    const html = await renderListiclePage(config, {
      category,
      models: scoredModels,
      lastUpdated: new Date(),
    });

    // Write file
    const pageDir = join(outputDir, slug);
    await mkdir(pageDir, { recursive: true });
    const htmlPath = join(pageDir, 'index.html');
    await writeFile(htmlPath, html, 'utf-8');

    // Log build to DB
    await execute(
      `INSERT INTO page_builds (category_slug, page_title, models_count, build_type, html_file_path, build_duration_ms)
       VALUES (?, ?, ?, 'light', ?, ?)`,
      [slug, category.title, scoredModels.length, htmlPath, Date.now() - start]
    );

    return {
      slug,
      modelsCount: scoredModels.length,
      htmlPath,
      durationMs: Date.now() - start,
      success: true,
    };
  } catch (err) {
    return {
      slug,
      modelsCount: 0,
      htmlPath: '',
      durationMs: Date.now() - start,
      success: false,
      error: (err as Error).message,
    };
  }
}

// Build all category pages (or a specific one)
export async function buildAllPages(
  config: Config,
  outputDir: string,
  specificSlug?: string,
): Promise<BuildResult[]> {
  const categories = specificSlug
    ? CATEGORIES.filter(c => c.slug === specificSlug)
    : CATEGORIES;

  if (specificSlug && categories.length === 0) {
    return [{
      slug: specificSlug,
      modelsCount: 0,
      htmlPath: '',
      durationMs: 0,
      success: false,
      error: `Unknown category slug: ${specificSlug}`,
    }];
  }

  const results: BuildResult[] = [];
  for (const category of categories) {
    const result = await buildCategoryPage(config, category, outputDir);
    results.push(result);
    if (result.success) {
      console.log(`  [OK] /${result.slug}/ — ${result.modelsCount} models (${result.durationMs}ms)`);
    } else {
      console.log(`  [SKIP] /${result.slug}/ — ${result.error}`);
    }
  }

  return results;
}
