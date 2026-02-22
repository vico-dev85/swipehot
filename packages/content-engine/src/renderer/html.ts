// HTML renderer — reads template file, replaces {{placeholders}} with data.
// No framework — pure string interpolation for max speed and simplicity.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from '../config.js';
import { generateMetaTags } from '../seo/meta.js';
import { generateModelSchema } from '../seo/schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ModelPageData {
  username: string;
  displayName: string;
  bio: string;
  metaDescription: string;
  categories: string[];
  tags: string[];
  imageUrl: string;
  isOnline: boolean;
  numUsers: number;
  numFollowers: number;
  age: number | null;
  gender: string;
  roomSubject: string;
  embedUrl: string;
  roomUrl: string;
  relatedModels: RelatedModel[];
}

export interface RelatedModel {
  username: string;
  displayName: string;
  imageUrl: string;
}

export async function renderModelPage(config: Config, data: ModelPageData): Promise<string> {
  const templatePath = join(__dirname, '..', '..', 'templates', 'model-page.html');
  let html = await readFile(templatePath, 'utf-8');

  const canonicalUrl = `https://${config.siteDomain}/models/${data.username}`;
  const title = `${data.displayName} Live Cam | ${config.siteName}`;

  // Generate SEO blocks
  const metaTags = generateMetaTags(config, {
    title,
    description: data.metaDescription,
    canonicalUrl,
    imageUrl: data.imageUrl,
  });

  const schemaMarkup = generateModelSchema(config, {
    username: data.username,
    displayName: data.displayName,
    description: data.metaDescription,
    imageUrl: data.imageUrl,
    canonicalUrl,
    tags: data.tags,
  });

  // Build the embed/thumbnail section
  const mediaSection = data.isOnline
    ? `<div class="embed-container">
        <iframe src="${escAttr(data.embedUrl)}" loading="lazy" allowfullscreen allow="autoplay" frameborder="0"></iframe>
        <div class="live-badge">LIVE</div>
      </div>`
    : `<div class="thumbnail-container">
        <img src="${escAttr(data.imageUrl)}" alt="${escAttr(data.displayName)}" loading="lazy">
        <div class="offline-badge">OFFLINE</div>
        <a href="/" class="roulette-cta">Watch Similar on ${escHtml(config.siteName)}</a>
      </div>`;

  // Build related models grid
  const relatedHtml = data.relatedModels.length > 0
    ? data.relatedModels.map(m =>
      `<a href="/models/${m.username}" class="related-card">
          <img src="${escAttr(m.imageUrl)}" alt="${escAttr(m.displayName)}" loading="lazy">
          <span>${escHtml(m.displayName)}</span>
        </a>`
    ).join('\n        ')
    : '<p class="no-related">More models coming soon.</p>';

  // Build tag pills
  const tagPills = data.categories
    .map(t => `<span class="tag-pill">${escHtml(t)}</span>`)
    .join(' ');

  // Stats line
  const statsItems: string[] = [];
  if (data.isOnline) statsItems.push(`<span class="stat">${data.numUsers.toLocaleString()} viewers</span>`);
  if (data.age) statsItems.push(`<span class="stat">Age: ${data.age}</span>`);
  if (data.numFollowers > 0) statsItems.push(`<span class="stat">${data.numFollowers.toLocaleString()} followers</span>`);
  const statsHtml = statsItems.join(' &middot; ');

  // Replace all placeholders
  const replacements: Record<string, string> = {
    '{{metaTags}}': metaTags,
    '{{schemaMarkup}}': schemaMarkup,
    '{{siteName}}': escHtml(config.siteName),
    '{{siteTagline}}': escHtml(config.siteTagline),
    '{{siteDomain}}': config.siteDomain,
    '{{displayName}}': escHtml(data.displayName),
    '{{username}}': escHtml(data.username),
    '{{bio}}': data.bio,
    '{{mediaSection}}': mediaSection,
    '{{tagPills}}': tagPills,
    '{{stats}}': statsHtml,
    '{{relatedModels}}': relatedHtml,
    '{{roomUrl}}': escAttr(data.roomUrl),
    '{{year}}': String(new Date().getFullYear()),
    '{{ctaText}}': data.isOnline
      ? `Watch ${escHtml(data.displayName)} Live`
      : `Visit ${escHtml(data.displayName)}'s Room`,
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replaceAll(placeholder, value);
  }

  return html;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
