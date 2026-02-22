// Internal link injector — post-processes AI-generated HTML to add links to existing pages.
// Scans article text for mentions of categories and topics, replaces first occurrence with links.
// Rules: max 1 link per target page, no links inside headings, respects link density limits.

import { query } from '../db.js';
import { CATEGORIES } from '../categories.js';

export interface LinkTarget {
  phrase: string;      // text to match (case-insensitive)
  url: string;         // relative URL to link to
  title?: string;      // link title attribute
}

// Build link targets from database and known category pages.
export async function gatherLinkTargets(siteDomain: string): Promise<LinkTarget[]> {
  const targets: LinkTarget[] = [];

  // 1. Listicle category pages (always available — from categories.ts)
  for (const cat of CATEGORIES) {
    // Add the category title as a link phrase
    // e.g. "Asian Cams" → "/asian-cams/"
    targets.push({
      phrase: cat.title.replace(' Cams', ' cams'), // "Best Asian Cams" → match "asian cams"
      url: `/${cat.slug}/`,
      title: cat.title,
    });
    // Also add shorter variant without "cams"
    const shortPhrase = cat.title.replace(/\s*Cams$/i, '').toLowerCase();
    if (shortPhrase.length >= 4 && shortPhrase !== 'new') {
      targets.push({
        phrase: `${shortPhrase} cam`,
        url: `/${cat.slug}/`,
        title: cat.title,
      });
    }
  }

  // 2. Published blog posts (from DB)
  try {
    const posts = await query<{ slug: string; keyword: string; title: string }>(
      "SELECT slug, keyword, title FROM blog_posts WHERE status = 'published'"
    );
    for (const post of posts) {
      targets.push({
        phrase: post.keyword,
        url: `/blog/${post.slug}/`,
        title: post.title,
      });
    }
  } catch {
    // DB not available — use only category links
  }

  // 3. Token calculator (hardcoded — always exists)
  targets.push({
    phrase: 'token calculator',
    url: '/blog/chaturbate-token-calculator/',
    title: 'Chaturbate Token Calculator',
  });
  targets.push({
    phrase: 'chaturbate tokens',
    url: '/blog/chaturbate-token-calculator/',
    title: 'Chaturbate Token Calculator',
  });

  // Sort by phrase length descending — match longer phrases first
  targets.sort((a, b) => b.phrase.length - a.phrase.length);

  // Deduplicate by URL (keep longest phrase per URL)
  const seenUrls = new Set<string>();
  const unique: LinkTarget[] = [];
  for (const t of targets) {
    if (!seenUrls.has(t.url)) {
      seenUrls.add(t.url);
      unique.push(t);
    }
  }

  return unique;
}

// Inject internal links into HTML content.
// Returns the modified HTML with links added.
export function injectLinks(
  html: string,
  targets: LinkTarget[],
  maxLinksPerHundredWords: number = 1.0,
  siteDomain: string = '',
): string {
  // Calculate word count to determine max links
  const textOnly = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = textOnly.split(' ').filter(w => w.length > 0).length;
  const maxLinks = Math.max(3, Math.floor(maxLinksPerHundredWords * wordCount / 100));

  let result = html;
  let linksAdded = 0;
  const linkedUrls = new Set<string>();

  for (const target of targets) {
    if (linksAdded >= maxLinks) break;
    if (linkedUrls.has(target.url)) continue;

    // Build regex to find the phrase in text content (not inside tags or headings)
    // We need to avoid matching inside <h1>, <h2>, <h3>, <a>, or HTML attributes
    const escaped = target.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![<\\/a-zA-Z"=])\\b(${escaped})\\b(?![^<]*<\\/(?:h[1-3]|a))`, 'i');

    // Find match in result
    const match = result.match(regex);
    if (!match || match.index === undefined) continue;

    // Check we're not inside a heading or anchor tag
    const before = result.slice(0, match.index);
    const lastOpenH = Math.max(
      before.lastIndexOf('<h1'), before.lastIndexOf('<h2'), before.lastIndexOf('<h3'),
      before.lastIndexOf('<a ')
    );
    const lastCloseH = Math.max(
      before.lastIndexOf('</h1>'), before.lastIndexOf('</h2>'), before.lastIndexOf('</h3>'),
      before.lastIndexOf('</a>')
    );

    // If we're inside an unclosed heading or anchor, skip
    if (lastOpenH > lastCloseH) continue;

    // Build the link
    const baseUrl = siteDomain ? `https://${siteDomain}` : '';
    const href = `${baseUrl}${target.url}`;
    const titleAttr = target.title ? ` title="${escAttr(target.title)}"` : '';
    const link = `<a href="${href}"${titleAttr}>${match[1]}</a>`;

    // Replace first occurrence only
    result = result.slice(0, match.index) + link + result.slice(match.index + match[0].length);
    linksAdded++;
    linkedUrls.add(target.url);
  }

  return result;
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
