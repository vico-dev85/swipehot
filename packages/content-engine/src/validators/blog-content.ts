// Blog post content validator.
// Checks word count per blog type, required sections, heading hierarchy,
// AI slop, FAQ count, internal link count, and keyword presence.
// Reuses detectSlopPhrases and detectRepetitiveStarts from content.ts.

import { detectSlopPhrases, detectRepetitiveStarts } from './content.js';
import type { BlogTypeDef } from '../blog/blog-types.js';

export interface BlogValidationResult {
  valid: boolean;
  score: number;      // 0-100
  issues: string[];
  wordCount: number;
  h2Count: number;
  linkCount: number;
}

// Count words in HTML content (strips tags first).
function wordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(' ').filter(w => w.length > 0).length;
}

// Count internal links in HTML.
function countInternalLinks(html: string): number {
  const matches = html.match(/<a\s+[^>]*href=["'][^"']*["'][^>]*>/gi) || [];
  return matches.filter(m => !m.includes('http') || m.includes('{{siteDomain}}')).length;
}

// Extract H2 heading texts from HTML.
function extractH2s(html: string): string[] {
  const matches = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  return matches.map(m => m.replace(/<[^>]+>/g, '').trim());
}

// Check if keyword appears in text (case-insensitive).
function containsKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

export function validateBlogPost(
  articleHtml: string,
  faqHtml: string,
  metaDescription: string,
  keyword: string,
  typeDef: BlogTypeDef,
): BlogValidationResult {
  const issues: string[] = [];
  let score = 100;

  const fullHtml = articleHtml + faqHtml;
  const words = wordCount(articleHtml); // FAQ not counted toward word target
  const h2s = extractH2s(articleHtml);
  const links = countInternalLinks(fullHtml);

  // --- Word Count ---
  const [minWords, maxWords] = typeDef.targetWordCount;
  if (words < minWords) {
    issues.push(`Too short: ${words} words (min ${minWords} for ${typeDef.type})`);
    score -= 25;
  } else if (words > maxWords * 1.3) {
    issues.push(`Too long: ${words} words (max ~${maxWords} for ${typeDef.type})`);
    score -= 10;
  }

  // --- Required Sections ---
  const missingH2s: string[] = [];
  for (const required of typeDef.sections) {
    const found = h2s.some(h2 =>
      h2.toLowerCase().includes(required.toLowerCase()) ||
      required.toLowerCase().includes(h2.toLowerCase().split(':')[0])
    );
    if (!found) {
      missingH2s.push(required);
    }
  }
  if (missingH2s.length > 0) {
    issues.push(`Missing sections: ${missingH2s.join(', ')}`);
    score -= missingH2s.length * 8;
  }

  // --- Heading Hierarchy ---
  // Check no H3 appears before any H2
  const h2Pos = articleHtml.search(/<h2/i);
  const h3Pos = articleHtml.search(/<h3/i);
  if (h3Pos !== -1 && (h2Pos === -1 || h3Pos < h2Pos)) {
    issues.push('H3 appears before any H2 — broken heading hierarchy');
    score -= 10;
  }

  // Check for H1 in article body (should not be there — template handles H1)
  if (/<h1/i.test(articleHtml)) {
    issues.push('Article body contains H1 — remove it (template handles the title)');
    score -= 10;
  }

  // --- AI Slop Detection ---
  const slopHits = detectSlopPhrases(fullHtml);
  if (slopHits.length > 0) {
    issues.push(`AI slop phrases: ${slopHits.map(p => `"${p}"`).join(', ')}`);
    score -= Math.min(slopHits.length * 8, 30);
  }

  // --- Repetitive Sentence Starts ---
  const repetitionIssues = detectRepetitiveStarts(articleHtml);
  if (repetitionIssues.length > 0) {
    issues.push(...repetitionIssues);
    score -= 10;
  }

  // --- FAQ Count ---
  const faqItemCount = (faqHtml.match(/class="faq-item"/g) || []).length;
  const [minFaq, maxFaq] = typeDef.faqCount;
  if (faqItemCount < minFaq) {
    issues.push(`Too few FAQ items: ${faqItemCount} (min ${minFaq})`);
    score -= 10;
  }

  // --- Internal Links ---
  const targetLinks = Math.floor(typeDef.internalLinkDensity * words / 100);
  if (links < Math.max(1, targetLinks - 2)) {
    issues.push(`Too few internal links: ${links} (target ~${targetLinks})`);
    score -= 10;
  }

  // --- Keyword Presence ---
  const articleText = articleHtml.replace(/<[^>]+>/g, ' ').toLowerCase();
  if (!containsKeyword(articleText, keyword)) {
    issues.push(`Primary keyword "${keyword}" not found in article body`);
    score -= 15;
  }
  if (!containsKeyword(metaDescription, keyword)) {
    issues.push(`Primary keyword "${keyword}" not in meta description`);
    score -= 5;
  }

  // --- Meta Description Length ---
  if (metaDescription.length < 120) {
    issues.push(`Meta description too short: ${metaDescription.length} chars (min 120)`);
    score -= 5;
  } else if (metaDescription.length > 160) {
    issues.push(`Meta description too long: ${metaDescription.length} chars (max 160)`);
    score -= 3;
  }

  // --- Empty Paragraphs ---
  if (articleHtml.includes('<p></p>') || articleHtml.includes('<p> </p>')) {
    issues.push('Article contains empty paragraphs');
    score -= 5;
  }

  return {
    valid: score >= 60,
    score: Math.max(0, score),
    issues,
    wordCount: words,
    h2Count: h2s.length,
    linkCount: links,
  };
}
