// Blog post AI prompt construction — two-phase generation (outline → article).
// Reuses callProvider from claude.ts for multi-provider support.

import type { Config } from '../config.js';
import type { BlogTypeDef, BlogQueueItem } from './blog-types.js';
import { callProvider } from '../services/claude.js';

// --- Slop phrases (same list used in prompts to tell AI what to avoid) ---
const FORBIDDEN_PHRASES = [
  '"In the world of..."', '"In the realm of..."', '"Let\'s dive in"',
  '"Whether you\'re ___ or ___"', '"Look no further"',
  '"A plethora of"', '"At the end of the day"', '"In conclusion"',
  '"In today\'s [adjective] world/age/era"', '"Harnessing the power of"',
  '"The heart of [anything]"', '"X is a game-changer"',
  '"Has taken the world by storm"', '"Imagine this:"', '"Picture this:"',
  '"Ever-evolving landscape"', '"cutting-edge"', '"state-of-the-art"',
  '"From all walks of life"', '"Now, more than ever"',
  '"Without further ado"', '"This is a testament to"',
  '"Let\'s embark on a journey"', '"It is important to note"',
  '"Buckle up"', '"You\'ve come to the right place"',
];

export interface BlogOutline {
  title: string;
  sections: Array<{
    heading: string;
    keyPoints: string[];
  }>;
  faqItems: Array<{
    question: string;
    answerHint: string;
  }>;
  internalLinkTargets: string[];  // URLs to link to in the article
}

export interface GeneratedBlogPost {
  title: string;
  articleHtml: string;    // Full HTML body (H2s, paragraphs, lists)
  faqHtml: string;        // FAQ section as HTML (dt/dd or div structure)
  metaDescription: string; // 120-160 chars
}

// --- Phase 1: Outline Generation ---

function buildOutlineSystemPrompt(config: Config, typeDef: BlogTypeDef): string {
  return `You are a content strategist planning a ${typeDef.label.toLowerCase()} article for "${config.siteName}".

Your job is to create a detailed article OUTLINE — not the article itself.

ARTICLE TYPE: ${typeDef.label}
TONE: ${typeDef.toneGuide}
TARGET LENGTH: ${typeDef.targetWordCount[0]}-${typeDef.targetWordCount[1]} words
REQUIRED SECTIONS (adapt titles but cover these topics): ${typeDef.sections.join(', ')}
FAQ ITEMS NEEDED: ${typeDef.faqCount[0]}-${typeDef.faqCount[1]}

Return a JSON outline. Be specific in key points — don't write vague bullet points like "discuss the topic". Write actionable notes like "explain that Chaturbate uses HTTPS encryption and does not store payment info on-site".`;
}

function buildOutlineUserPrompt(
  item: BlogQueueItem,
  existingPages: string[],
): string {
  const pagesList = existingPages.length > 0
    ? `\nEXISTING PAGES TO LINK TO:\n${existingPages.map(p => `- ${p}`).join('\n')}`
    : '\nNo existing pages to link to yet.';

  return `Create an outline for: "${item.keyword}"
Suggested title: "${item.title}"
Blog type: ${item.type}
${pagesList}

Return JSON with this exact structure:
{
  "title": "Final article title (can adjust the suggestion)",
  "sections": [
    {
      "heading": "Section H2 title",
      "keyPoints": ["Specific point 1", "Specific point 2", "..."]
    }
  ],
  "faqItems": [
    {
      "question": "Common question people ask",
      "answerHint": "Brief note on what the answer should cover"
    }
  ],
  "internalLinkTargets": ["URLs from the existing pages list that are relevant to link to"]
}

Return ONLY the JSON, no other text.`;
}

// --- Phase 2: Full Article Generation ---

function buildArticleSystemPrompt(config: Config, typeDef: BlogTypeDef): string {
  return `You are a skilled writer creating a ${typeDef.label.toLowerCase()} for "${config.siteName}" (${config.siteTagline}).

WRITING RULES:
1. Write ${typeDef.targetWordCount[0]}-${typeDef.targetWordCount[1]} words.
2. Use proper HTML: <h2> for sections, <h3> for subsections, <p> for paragraphs, <ul>/<ol>/<li> for lists, <strong> for emphasis.
3. DO NOT include <h1> — that's handled by the template.
4. Write for humans, not search engines. Be genuinely helpful and specific.
5. Include the primary keyword naturally 3-5 times. Don't force it.
6. Address the reader directly ("you/your").
7. Use contractions. Write conversationally.
8. Include specific facts, numbers, prices, and dates where relevant.
9. Vary sentence length. Mix short punchy lines with longer explanations.
10. The site name is "${config.siteName}" — ONLY use this exact name. NEVER invent other site names.

TONE: ${typeDef.toneGuide}

ABSOLUTELY FORBIDDEN — your article will be rejected if it contains:
${FORBIDDEN_PHRASES.map(p => `- ${p}`).join('\n')}
- Starting 3+ consecutive sentences with the same word
- Generic filler that adds no information
- Fabricating statistics without labeling them as estimates

QUALITY STANDARDS:
- Every section must provide concrete, actionable information
- No padding — if a section would just repeat what was said, skip it
- End with a clear takeaway, not a generic conclusion`;
}

function buildArticleUserPrompt(
  item: BlogQueueItem,
  outline: BlogOutline,
): string {
  const sectionsText = outline.sections
    .map(s => `## ${s.heading}\nKey points to cover:\n${s.keyPoints.map(p => `- ${p}`).join('\n')}`)
    .join('\n\n');

  return `Write the full article for: "${item.keyword}"
Title: "${outline.title}"

OUTLINE TO FOLLOW:
${sectionsText}

Now write the complete article HTML body following this outline. Include all sections.
Do NOT include the title (H1) — just start with the first H2 section.
Do NOT include the FAQ section — that will be generated separately.

Return ONLY the HTML content, no wrapping tags, no markdown code fences.`;
}

function buildFaqUserPrompt(outline: BlogOutline): string {
  const faqList = outline.faqItems
    .map((f, i) => `${i + 1}. Q: ${f.question}\n   Hint: ${f.answerHint}`)
    .join('\n');

  return `Write FAQ answers for these questions. Each answer should be 2-4 sentences, specific and helpful.

${faqList}

Return as JSON array:
[
  {"question": "...", "answer": "..."},
  ...
]

Return ONLY the JSON, no other text.`;
}

// --- Public API ---

export async function generateOutline(
  config: Config,
  item: BlogQueueItem,
  typeDef: BlogTypeDef,
  existingPages: string[],
): Promise<BlogOutline> {
  const systemPrompt = buildOutlineSystemPrompt(config, typeDef);
  const userPrompt = buildOutlineUserPrompt(item, existingPages);

  console.log(`[blog] Generating outline for "${item.keyword}"...`);
  const text = await callProvider(config, systemPrompt, userPrompt);

  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(jsonStr) as BlogOutline;
  if (!parsed.title || !Array.isArray(parsed.sections) || !Array.isArray(parsed.faqItems)) {
    throw new Error('Outline missing required fields');
  }

  console.log(`[blog] Outline: ${parsed.sections.length} sections, ${parsed.faqItems.length} FAQ items`);
  return parsed;
}

export async function generateArticle(
  config: Config,
  item: BlogQueueItem,
  typeDef: BlogTypeDef,
  outline: BlogOutline,
): Promise<GeneratedBlogPost> {
  const systemPrompt = buildArticleSystemPrompt(config, typeDef);
  const articlePrompt = buildArticleUserPrompt(item, outline);

  console.log(`[blog] Generating article for "${item.keyword}" (${typeDef.targetWordCount[0]}-${typeDef.targetWordCount[1]} words)...`);
  const articleHtml = await callProvider(config, systemPrompt, articlePrompt);

  // Clean up: strip markdown code fences if present
  let cleanArticle = articleHtml.trim();
  if (cleanArticle.startsWith('```')) {
    cleanArticle = cleanArticle.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '');
  }

  // Generate FAQ answers
  const faqPrompt = buildFaqUserPrompt(outline);
  console.log(`[blog] Generating FAQ answers...`);
  const faqText = await callProvider(config, systemPrompt, faqPrompt);

  let faqJsonStr = faqText.trim();
  if (faqJsonStr.startsWith('```')) {
    faqJsonStr = faqJsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const faqItems = JSON.parse(faqJsonStr) as Array<{ question: string; answer: string }>;

  // Build FAQ HTML
  const faqHtml = faqItems.map(f =>
    `<div class="faq-item">
      <button class="faq-q" aria-expanded="false">${escHtml(f.question)}<span class="faq-arrow">▼</span></button>
      <div class="faq-a"><p>${escHtml(f.answer)}</p></div>
    </div>`
  ).join('\n');

  // Generate meta description
  const metaPrompt = `Write a 120-160 character meta description for an article titled "${outline.title}" about "${item.keyword}". Be specific and compelling. Return ONLY the meta description text, nothing else.`;
  const metaText = await callProvider(config, systemPrompt, metaPrompt);
  const metaDescription = metaText.trim().replace(/^["']|["']$/g, '');

  return {
    title: outline.title,
    articleHtml: cleanArticle,
    faqHtml,
    metaDescription,
  };
}

// --- Phase 3: Revision with Feedback ---

function buildRevisionUserPrompt(
  item: BlogQueueItem,
  typeDef: BlogTypeDef,
  originalHtml: string,
  issues: string[],
): string {
  return `Your previous article for "${item.keyword}" failed quality validation. Fix the specific issues below and return the corrected article.

ISSUES TO FIX:
${issues.map(i => `- ${i}`).join('\n')}

REQUIREMENTS REMINDER:
- Word count: ${typeDef.targetWordCount[0]}-${typeDef.targetWordCount[1]} words
- Required sections (as H2s): ${typeDef.sections.join(', ')}
- No H1 tags (template handles the title)
- H2 before any H3
- Primary keyword "${item.keyword}" must appear naturally 3-5 times
- No AI slop phrases

ORIGINAL ARTICLE:
${originalHtml}

Return the FIXED article HTML body. Apply minimal changes — don't rewrite what's already good. Return ONLY the HTML content, no markdown code fences.`;
}

export async function reviseArticle(
  config: Config,
  item: BlogQueueItem,
  typeDef: BlogTypeDef,
  originalHtml: string,
  issues: string[],
): Promise<string> {
  const systemPrompt = buildArticleSystemPrompt(config, typeDef);
  const userPrompt = buildRevisionUserPrompt(item, typeDef, originalHtml, issues);

  console.log(`[blog] Revising article with ${issues.length} issues to fix...`);
  const revised = await callProvider(config, systemPrompt, userPrompt);

  let clean = revised.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '');
  }

  return clean;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
