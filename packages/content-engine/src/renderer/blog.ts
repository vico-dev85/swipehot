// Blog post HTML renderer — loads template, replaces placeholders, returns complete HTML.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from '../config.js';
import type { BlogTypeDef, BlogQueueItem } from '../blog/blog-types.js';
import { generateBlogMetaTags, type BlogMetaInput } from '../seo/meta.js';
import { generateBlogSchema, type BlogSchemaInput } from '../seo/schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, '..', '..', 'templates');

let templateCache: string | null = null;

async function loadTemplate(): Promise<string> {
  if (templateCache) return templateCache;
  templateCache = await readFile(join(TEMPLATE_DIR, 'blog-post.html'), 'utf-8');
  return templateCache;
}

export interface BlogRenderData {
  slug: string;
  title: string;
  articleHtml: string;
  faqHtml: string;
  metaDescription: string;
  blogType: BlogTypeDef;
  publishDate: string;        // ISO date YYYY-MM-DD
  wordCount: number;
  relatedPosts?: Array<{
    slug: string;
    title: string;
    type: string;
    description: string;
  }>;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildRelatedSection(posts: BlogRenderData['relatedPosts'], siteDomain: string): string {
  if (!posts || posts.length === 0) return '';

  const cards = posts.map(p => `
        <a href="https://${siteDomain}/blog/${p.slug}/" class="related-card">
            <div class="related-type">${escHtml(p.type)}</div>
            <div class="related-title">${escHtml(p.title)}</div>
            <div class="related-desc">${escHtml(p.description)}</div>
        </a>`).join('\n');

  return `<section class="related-section">
        <h2>Related Articles</h2>
        <div class="related-grid">${cards}
        </div>
    </section>`;
}

export async function renderBlogPost(config: Config, data: BlogRenderData): Promise<string> {
  const template = await loadTemplate();

  const canonicalUrl = `https://${config.siteDomain}/blog/${data.slug}/`;

  const metaTags = generateBlogMetaTags(config, {
    title: `${data.title} — ${config.siteName}`,
    description: data.metaDescription,
    canonicalUrl,
    publishDate: data.publishDate,
    section: data.blogType.label,
  });

  // Extract FAQ items for schema (parse from faqHtml)
  const faqItems: Array<{ question: string; answer: string }> = [];
  const faqRegex = /<button class="faq-q"[^>]*>([^<]+)<span/g;
  const ansRegex = /<div class="faq-a"><p>([^<]+)<\/p><\/div>/g;
  let qMatch;
  const questions: string[] = [];
  while ((qMatch = faqRegex.exec(data.faqHtml)) !== null) {
    questions.push(qMatch[1].trim());
  }
  let aMatch;
  let aIdx = 0;
  while ((aMatch = ansRegex.exec(data.faqHtml)) !== null) {
    if (aIdx < questions.length) {
      faqItems.push({ question: questions[aIdx], answer: aMatch[1].trim() });
    }
    aIdx++;
  }

  const schemaMarkup = generateBlogSchema(config, {
    title: data.title,
    description: data.metaDescription,
    canonicalUrl,
    publishDate: data.publishDate,
    faqItems: faqItems.length > 0 ? faqItems : undefined,
  });

  const readTime = Math.max(1, Math.ceil(data.wordCount / 230));

  const replacements: Record<string, string> = {
    '{{metaTags}}': metaTags,
    '{{schemaMarkup}}': schemaMarkup,
    '{{siteName}}': escHtml(config.siteName),
    '{{siteDomain}}': config.siteDomain,
    '{{articleTitle}}': escHtml(data.title),
    '{{articleContent}}': data.articleHtml,
    '{{faqSection}}': data.faqHtml,
    '{{relatedArticlesSection}}': buildRelatedSection(data.relatedPosts, config.siteDomain),
    '{{blogTypeLabel}}': escHtml(data.blogType.label),
    '{{publishDate}}': data.publishDate,
    '{{readTime}}': String(readTime),
    '{{currentYear}}': String(new Date().getFullYear()),
  };

  let html = template;
  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(key).join(value);
  }

  return html;
}
