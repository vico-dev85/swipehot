// Sitemap.xml generator.
// Reads active models, published blog posts, and listicle category pages from DB/filesystem.

import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Config } from '../config.js';
import { query } from '../db.js';
import { CATEGORIES } from '../categories.js';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export async function generateSitemap(
  config: Config,
  outputDir: string,
): Promise<number> {
  const entries: SitemapEntry[] = [];
  const base = `https://${config.siteDomain}`;

  // Homepage
  entries.push({
    loc: `${base}/`,
    changefreq: 'daily',
    priority: '1.0',
  });

  // Try DB first for model pages
  const models = await query<{ model_name: string; updated_at: string }>(
    "SELECT model_name, updated_at FROM models WHERE status = 'active' ORDER BY model_name"
  );

  if (models.length > 0) {
    for (const m of models) {
      entries.push({
        loc: `${base}/models/${m.model_name}`,
        lastmod: new Date(m.updated_at).toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.7',
      });
    }
  } else {
    // Fallback: scan filesystem for model page directories
    const modelsDir = join(outputDir, 'models');
    try {
      const dirs = await readdir(modelsDir, { withFileTypes: true });
      for (const d of dirs) {
        if (d.isDirectory()) {
          entries.push({
            loc: `${base}/models/${d.name}`,
            changefreq: 'weekly',
            priority: '0.7',
          });
        }
      }
    } catch {
      // No models dir yet
    }
  }

  // Listicle category pages (from categories.ts — always available)
  for (const cat of CATEGORIES) {
    entries.push({
      loc: `${base}/${cat.slug}/`,
      changefreq: 'hourly',
      priority: '0.9',
    });
  }

  // Published blog posts
  const blogPosts = await query<{ slug: string; updated_at: string }>(
    "SELECT slug, updated_at FROM blog_posts WHERE status = 'published' ORDER BY slug"
  );
  for (const post of blogPosts) {
    entries.push({
      loc: `${base}/blog/${post.slug}/`,
      lastmod: new Date(post.updated_at).toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.8',
    });
  }

  // Token calculator (hardcoded — always exists)
  entries.push({
    loc: `${base}/blog/chaturbate-token-calculator/`,
    changefreq: 'monthly',
    priority: '0.8',
  });

  const xml = buildSitemapXml(entries);
  const sitemapPath = join(outputDir, 'sitemap.xml');
  await writeFile(sitemapPath, xml, 'utf-8');
  console.log(`[sitemap] Wrote ${entries.length} URLs to ${sitemapPath}`);
  return entries.length;
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const entry of entries) {
    xml += '  <url>\n';
    xml += `    <loc>${escXml(entry.loc)}</loc>\n`;
    if (entry.lastmod) xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
    if (entry.changefreq) xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    if (entry.priority) xml += `    <priority>${entry.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';
  return xml;
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
