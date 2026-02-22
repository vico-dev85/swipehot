// Blog post generation pipeline.
// Flow: load blog def → check duplicate → gather context → generate outline →
//       generate article → inject links → validate → render HTML → write & log.
// Two-phase AI generation (outline then article) for better structure.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from '../config.js';
import { query, execute } from '../db.js';
import { BLOG_TYPES, BLOG_QUEUE, getBlogDef, type BlogType, type BlogQueueItem, type BlogTypeDef } from '../blog/blog-types.js';
import { generateOutline, generateArticle, reviseArticle, type BlogOutline, type GeneratedBlogPost } from '../blog/blog-prompts.js';
import { validateBlogPost } from '../validators/blog-content.js';
import { gatherLinkTargets, injectLinks } from '../blog/link-injector.js';
import { renderBlogPost, type BlogRenderData } from '../renderer/blog.js';
import { generateSitemap } from '../seo/sitemap.js';

const MAX_RETRIES = 2;

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..');

function getOutputDir(): string {
  return join(PKG_ROOT, '..', 'frontend', 'public');
}

export interface BlogGenerateResult {
  success: boolean;
  slug: string;
  keyword: string;
  htmlPath?: string;
  error?: string;
  qualityScore?: number;
  wordCount?: number;
}

// Generate a single blog post.
export async function generateBlogPost(
  config: Config,
  slug: string,
  blogType: BlogType,
  outputDir?: string,
): Promise<BlogGenerateResult> {
  const pubDir = outputDir || getOutputDir();

  // Step 1: Load blog definition
  const item = getBlogDef(slug);
  if (!item) {
    return { success: false, slug, keyword: slug, error: `Unknown blog slug "${slug}" — not in BLOG_QUEUE` };
  }

  const typeDef = BLOG_TYPES[blogType || item.type];
  if (!typeDef) {
    return { success: false, slug, keyword: item.keyword, error: `Unknown blog type "${blogType}"` };
  }

  console.log(`\n[blog] ═══════════════════════════════════════════════`);
  console.log(`[blog] Generating: "${item.keyword}" (${typeDef.label})`);
  console.log(`[blog] Slug: ${slug}`);
  console.log(`[blog] Target: ${typeDef.targetWordCount[0]}-${typeDef.targetWordCount[1]} words`);
  console.log(`[blog] ═══════════════════════════════════════════════`);

  // Step 2: Check for duplicate
  const existing = await query<{ id: number; status: string }>(
    "SELECT id, status FROM blog_posts WHERE slug = ?",
    [slug]
  );
  if (existing.length > 0 && existing[0].status === 'published') {
    console.log(`[blog] SKIP: Blog post "${slug}" already published (id: ${existing[0].id})`);
    return { success: false, slug, keyword: item.keyword, error: 'Already published' };
  }

  // Step 3: Gather context — existing pages for internal linking
  const existingPages = await gatherExistingPages(config);
  console.log(`[blog] Found ${existingPages.length} existing pages for internal linking`);

  let lastError = '';
  let lastArticleHtml = '';
  let lastIssues: string[] = [];
  let generated: GeneratedBlogPost | null = null;
  let outline: BlogOutline | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      let articleHtml: string;

      if (attempt === 0 || !generated) {
        // First attempt: generate from scratch
        console.log(`[blog] Phase 1: Generating outline...`);
        outline = await generateOutline(config, item, typeDef, existingPages);

        console.log(`[blog] Phase 2: Generating article...`);
        generated = await generateArticle(config, item, typeDef, outline);
        articleHtml = generated.articleHtml;
      } else {
        // Retry: revise with specific feedback instead of regenerating from scratch
        console.log(`[blog] Revision attempt ${attempt + 1}: feeding ${lastIssues.length} issues back to AI...`);
        articleHtml = await reviseArticle(config, item, typeDef, lastArticleHtml, lastIssues);
        generated.articleHtml = articleHtml;
      }

      // Step 6: Inject internal links
      console.log(`[blog] Injecting internal links...`);
      const linkTargets = await gatherLinkTargets(config.siteDomain);
      const linkedArticle = injectLinks(
        articleHtml,
        linkTargets,
        typeDef.internalLinkDensity,
        config.siteDomain,
      );

      // Step 7: Validate
      console.log(`[blog] Validating content quality...`);
      const validation = validateBlogPost(
        linkedArticle,
        generated.faqHtml,
        generated.metaDescription,
        item.keyword,
        typeDef,
      );
      console.log(`[blog] Validation: score=${validation.score}, valid=${validation.valid}, words=${validation.wordCount}, h2s=${validation.h2Count}, links=${validation.linkCount}`);

      if (validation.issues.length > 0) {
        console.log(`[blog] Issues: ${validation.issues.join('; ')}`);
      }

      if (!validation.valid) {
        lastError = `Validation failed (score ${validation.score}): ${validation.issues.join('; ')}`;
        lastArticleHtml = articleHtml;
        lastIssues = validation.issues;
        if (attempt < MAX_RETRIES) {
          console.log(`[blog] Will revise with feedback (attempt ${attempt + 1}/${MAX_RETRIES})...`);
          continue;
        }
        throw new Error(lastError);
      }

      // Step 8: Render HTML
      console.log(`[blog] Rendering HTML...`);
      const today = new Date().toISOString().split('T')[0];

      const relatedPosts = await findRelatedPosts(slug, item.type);

      const renderData: BlogRenderData = {
        slug,
        title: generated.title,
        articleHtml: linkedArticle,
        faqHtml: generated.faqHtml,
        metaDescription: generated.metaDescription,
        blogType: typeDef,
        publishDate: today,
        wordCount: validation.wordCount,
        relatedPosts,
      };

      const html = await renderBlogPost(config, renderData);

      // Step 9: Write file & update DB
      const blogDir = join(pubDir, 'blog', slug);
      await mkdir(blogDir, { recursive: true });
      const htmlPath = join(blogDir, 'index.html');
      await writeFile(htmlPath, html, 'utf-8');
      console.log(`[blog] Wrote: ${htmlPath}`);

      // Upsert into blog_posts table
      await execute(
        `INSERT INTO blog_posts (slug, keyword, blog_type, title, meta_description, content, word_count, internal_link_count, quality_score, html_file_path, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           meta_description = VALUES(meta_description),
           content = VALUES(content),
           word_count = VALUES(word_count),
           internal_link_count = VALUES(internal_link_count),
           quality_score = VALUES(quality_score),
           html_file_path = VALUES(html_file_path),
           status = 'published',
           updated_at = NOW()`,
        [
          slug,
          item.keyword,
          item.type,
          generated.title,
          generated.metaDescription,
          linkedArticle,
          validation.wordCount,
          validation.linkCount,
          validation.score,
          `blog/${slug}/index.html`,
        ]
      );

      // Log pipeline run
      await execute(
        "INSERT INTO pipeline_runs (content_type, keyword, success, quality_score) VALUES ('blog_post', ?, 1, ?)",
        [item.keyword, validation.score]
      );

      console.log(`[blog] SUCCESS: "${item.keyword}" → ${htmlPath} (score: ${validation.score}, words: ${validation.wordCount})`);

      return {
        success: true,
        slug,
        keyword: item.keyword,
        htmlPath,
        qualityScore: validation.score,
        wordCount: validation.wordCount,
      };

    } catch (err) {
      lastError = (err as Error).message;
      if (attempt >= MAX_RETRIES) break;
      console.log(`[blog] Error: ${lastError} — will retry with revision...`);
    }
  }

  // All retries exhausted
  console.error(`[blog] FAILED: ${slug} — ${lastError}`);
  await execute(
    `INSERT INTO blog_posts (slug, keyword, blog_type, status)
     VALUES (?, ?, ?, 'failed')
     ON DUPLICATE KEY UPDATE status = 'failed', updated_at = NOW()`,
    [slug, item.keyword, item.type]
  );
  await execute(
    "INSERT INTO pipeline_runs (content_type, keyword, success, error_message, retry_count) VALUES ('blog_post', ?, 0, ?, ?)",
    [item.keyword, lastError, MAX_RETRIES]
  );

  return { success: false, slug, keyword: item.keyword, error: lastError };
}

// Generate multiple blog posts from the queue (highest volume first).
export async function generateBlogBatch(
  config: Config,
  count: number,
  outputDir?: string,
): Promise<BlogGenerateResult[]> {
  // Find which posts haven't been published yet
  const published = await query<{ slug: string }>(
    "SELECT slug FROM blog_posts WHERE status = 'published'"
  );
  const publishedSlugs = new Set(published.map(p => p.slug));

  const pending = BLOG_QUEUE
    .filter(item => !publishedSlugs.has(item.slug))
    .sort((a, b) => b.volume - a.volume) // highest volume first
    .slice(0, count);

  if (pending.length === 0) {
    console.log('[blog] All blog posts in the queue are already published.');
    return [];
  }

  console.log(`[blog] Generating ${pending.length} blog posts (${count} requested, ${publishedSlugs.size} already published)...`);
  const results: BlogGenerateResult[] = [];

  for (const item of pending) {
    const result = await generateBlogPost(config, item.slug, item.type, outputDir);
    results.push(result);

    // Delay between API calls
    await sleep(2000);
  }

  // Regenerate sitemap after batch
  const pubDir = outputDir || getOutputDir();
  try {
    await generateSitemap(config, pubDir);
    console.log('[blog] Sitemap regenerated');
  } catch (err) {
    console.warn(`[blog] Sitemap generation failed: ${(err as Error).message}`);
  }

  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);

  // Structured summary for cron logs / monitoring
  const summary = {
    timestamp: new Date().toISOString(),
    requested: count,
    generated: successes.length,
    failed: failures.length,
    skipped: publishedSlugs.size,
    queueRemaining: BLOG_QUEUE.length - publishedSlugs.size - successes.length,
    posts: results.map(r => ({
      slug: r.slug,
      success: r.success,
      score: r.qualityScore ?? null,
      words: r.wordCount ?? null,
      error: r.error ?? null,
    })),
  };

  console.log(`\n[blog] ══════════════════════════════════════════`);
  console.log(`[blog] BATCH SUMMARY`);
  console.log(`[blog]   Generated: ${successes.length}/${results.length}`);
  console.log(`[blog]   Failed:    ${failures.length}/${results.length}`);
  console.log(`[blog]   Queue remaining: ${summary.queueRemaining} posts`);
  if (successes.length > 0) {
    console.log(`[blog]   Published:`);
    for (const r of successes) {
      console.log(`[blog]     ✓ ${r.slug} (score: ${r.qualityScore}, words: ${r.wordCount})`);
    }
  }
  if (failures.length > 0) {
    console.log(`[blog]   Failed:`);
    for (const r of failures) {
      console.log(`[blog]     ✗ ${r.slug}: ${r.error}`);
    }
  }
  console.log(`[blog] ══════════════════════════════════════════`);

  // Write machine-readable summary for monitoring tools
  try {
    const summaryPath = join(pubDir, '..', '..', 'content-engine', 'last-blog-run.json');
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
  } catch { /* non-critical */ }

  return results;
}

// Re-inject links into all published blog posts (run when new pages are added).
export async function rebuildBlogLinks(
  config: Config,
  outputDir?: string,
): Promise<number> {
  const pubDir = outputDir || getOutputDir();

  const posts = await query<{ slug: string; keyword: string; blog_type: string; title: string; meta_description: string; content: string; word_count: number }>(
    "SELECT slug, keyword, blog_type, title, meta_description, content, word_count FROM blog_posts WHERE status = 'published'"
  );

  if (posts.length === 0) {
    console.log('[blog-links] No published blog posts to update.');
    return 0;
  }

  console.log(`[blog-links] Re-injecting links for ${posts.length} published blog posts...`);
  const linkTargets = await gatherLinkTargets(config.siteDomain);
  let updated = 0;

  for (const post of posts) {
    const typeDef = BLOG_TYPES[post.blog_type as BlogType];
    if (!typeDef) continue;

    // Strip existing links first (re-inject fresh)
    const stripped = post.content.replace(/<a\s+[^>]*>(.*?)<\/a>/gi, '$1');

    // Re-inject with current link targets
    const linked = injectLinks(stripped, linkTargets, typeDef.internalLinkDensity, config.siteDomain);

    // Count links
    const linkCount = (linked.match(/<a\s+[^>]*href/gi) || []).length;

    // Re-render the page
    const relatedPosts = await findRelatedPosts(post.slug, post.blog_type as BlogType);
    const today = new Date().toISOString().split('T')[0];

    const renderData: BlogRenderData = {
      slug: post.slug,
      title: post.title,
      articleHtml: linked,
      faqHtml: '', // FAQ was baked into the original HTML — we'd need to store separately for re-render
      metaDescription: post.meta_description,
      blogType: typeDef,
      publishDate: today,
      wordCount: post.word_count,
      relatedPosts,
    };

    const html = await renderBlogPost(config, renderData);
    const blogDir = join(pubDir, 'blog', post.slug);
    await mkdir(blogDir, { recursive: true });
    await writeFile(join(blogDir, 'index.html'), html, 'utf-8');

    // Update link count in DB
    await execute(
      "UPDATE blog_posts SET content = ?, internal_link_count = ?, updated_at = NOW() WHERE slug = ?",
      [linked, linkCount, post.slug]
    );

    updated++;
    console.log(`[blog-links] Updated: ${post.slug} (${linkCount} links)`);
  }

  return updated;
}

// Gather existing page URLs for the AI to know about during outline generation.
async function gatherExistingPages(config: Config): Promise<string[]> {
  const pages: string[] = [];
  const base = `https://${config.siteDomain}`;

  // Listicle category pages (always available)
  try {
    const { CATEGORIES } = await import('../categories.js');
    for (const cat of CATEGORIES) {
      pages.push(`${base}/${cat.slug}/ — ${cat.title}`);
    }
  } catch { /* categories not available */ }

  // Published blog posts
  const posts = await query<{ slug: string; title: string }>(
    "SELECT slug, title FROM blog_posts WHERE status = 'published'"
  );
  for (const p of posts) {
    pages.push(`${base}/blog/${p.slug}/ — ${p.title}`);
  }

  // Token calculator (always exists)
  pages.push(`${base}/blog/chaturbate-token-calculator/ — Chaturbate Token Calculator`);

  return pages;
}

// Find related blog posts (different type, for the "Related Articles" section).
async function findRelatedPosts(
  currentSlug: string,
  currentType: BlogType,
): Promise<Array<{ slug: string; title: string; type: string; description: string }>> {
  const posts = await query<{ slug: string; title: string; blog_type: string; meta_description: string }>(
    "SELECT slug, title, blog_type, meta_description FROM blog_posts WHERE status = 'published' AND slug != ? LIMIT 10",
    [currentSlug]
  );

  // Prefer posts of different types for variety, limit to 3
  const sorted = posts.sort((a, b) => {
    const aTypeDiff = a.blog_type !== currentType ? 1 : 0;
    const bTypeDiff = b.blog_type !== currentType ? 1 : 0;
    return bTypeDiff - aTypeDiff;
  });

  return sorted.slice(0, 3).map(p => ({
    slug: p.slug,
    title: p.title,
    type: BLOG_TYPES[p.blog_type as BlogType]?.label || p.blog_type,
    description: p.meta_description || '',
  }));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
