// Listicle page renderer — reads template, injects scored model data per category.
// Produces complete static HTML files for living listicle pages.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from '../config.js';
import type { CategoryDef } from '../categories.js';
import type { ScoredModel } from '../services/scoring.js';
import { CATEGORIES } from '../categories.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ListiclePageData {
  category: CategoryDef;
  models: ScoredModel[];
  lastUpdated: Date;
}

// Build the SEO meta tags block
function buildMetaTags(config: Config, category: CategoryDef): string {
  const canonicalUrl = `https://${config.siteDomain}/${category.slug}/`;
  return `<title>${escHtml(category.metaTitle)} | ${escHtml(config.siteName)}</title>
    <meta name="description" content="${escAttr(category.metaDescription)}">
    <link rel="canonical" href="${escAttr(canonicalUrl)}">
    <meta property="og:title" content="${escAttr(category.metaTitle)}">
    <meta property="og:description" content="${escAttr(category.metaDescription)}">
    <meta property="og:url" content="${escAttr(canonicalUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${escAttr(config.siteName)}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escAttr(category.metaTitle)}">
    <meta name="twitter:description" content="${escAttr(category.metaDescription)}">`;
}

// Build JSON-LD schema (ItemList + BreadcrumbList)
function buildSchemaMarkup(config: Config, category: CategoryDef, models: ScoredModel[]): string {
  const canonicalUrl = `https://${config.siteDomain}/${category.slug}/`;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: category.title,
    url: canonicalUrl,
    numberOfItems: models.length,
    itemListElement: models.slice(0, 20).map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: m.displayName || m.username,
      url: `https://${config.siteDomain}/${category.slug}/#${m.username}`,
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: config.siteName, item: `https://${config.siteDomain}/` },
      { '@type': 'ListItem', position: 2, name: category.title, item: canonicalUrl },
    ],
  };

  return `<script type="application/ld+json">${JSON.stringify(itemList)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;
}

// Build a single model card HTML — must match listicle-page.html CSS selectors
function buildModelCard(config: Config, model: ScoredModel, rank: number, categorySlug: string): string {
  const displayName = model.displayName || model.username.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  // Use CB API image_url (always available). Local screenshot is a filesystem path, not a web URL.
  const imageUrl = escAttr(model.imageUrl || '');

  const roomUrl = `https://chaturbate.com/in/?tour=${config.affiliateTour}&campaign=${config.affiliateCampaign}&track=${config.affiliateTrack}&room=${model.username}`;

  // Live/offline badges
  const badges = model.isOnline
    ? `<span class="badge-live">LIVE</span><span class="badge-viewers"><svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"/><circle cx="12" cy="12" r="3.5"/></svg>${model.currentViewers.toLocaleString()}</span>`
    : '<span class="badge-offline">OFFLINE</span>';

  const tagPills = model.tags.slice(0, 5)
    .map(t => `<span class="card-tag">${escHtml(t)}</span>`)
    .join('');

  const metaItems: string[] = [];
  if (model.age) metaItems.push(`${model.age}yo`);
  if (model.country) metaItems.push(model.country.toUpperCase());
  if (model.numFollowers > 0) metaItems.push(`${model.numFollowers.toLocaleString()} followers`);
  const metaLine = metaItems.join(' &middot; ');

  // Room subject = unique SEO text + shows what model is doing right now
  const roomSubject = model.roomSubject || '';
  const roomSubjectHtml = roomSubject.length > 5
    ? `<p class="card-bio">${escHtml(roomSubject)}</p>`
    : '';
  const bio = model.bioCached ? `<p class="card-bio">${escHtml(model.bioCached)}</p>` : roomSubjectHtml;

  // data-rank attribute drives top-3 CSS styling
  const dataRank = rank <= 3 ? ` data-rank="${rank}"` : '';

  return `<article class="model-card"${dataRank} id="${escAttr(model.username)}">
      <div class="card-rank">#${rank}</div>
      <div class="card-body">
        <div class="card-content">
          <div class="card-media" data-username="${escAttr(model.username)}">
            <img src="${imageUrl}" alt="${escAttr(displayName)}" loading="lazy">
            <button class="play-btn" aria-label="Watch ${escAttr(displayName)} live">
              <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
            </button>
            <div class="card-badges">${badges}</div>
          </div>
          <div class="card-info">
            <div class="card-name-row">
              <a href="${escAttr(roomUrl)}" target="_blank" rel="noopener" class="card-name">${escHtml(displayName)}</a>
            </div>
            <div class="card-details">${metaLine}</div>
            ${bio}
            <div class="card-tags">${tagPills}</div>
          </div>
        </div>
        <div class="card-actions">
          <a href="${escAttr(roomUrl)}" target="_blank" rel="noopener" class="card-cta">Watch Live <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg></a>
          <button class="vote-btn" data-username="${escAttr(model.username)}" data-category="${escAttr(categorySlug)}" aria-label="Upvote ${escAttr(displayName)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span class="vote-count">${model.upvotes}</span>
          </button>
        </div>
      </div>
    </article>`;
}

// Build related pages section
function buildRelatedPages(config: Config, currentSlug: string): string {
  // Pick 6 categories that aren't the current one, sorted by volume
  const related = CATEGORIES
    .filter(c => c.slug !== currentSlug)
    .slice(0, 6);

  return related.map(c =>
    `<a href="/${c.slug}/" class="related-link">${escHtml(c.title.replace(' Live Now', ''))}</a>`
  ).join('\n        ');
}

// Generate a category description paragraph for SEO
function buildCategoryDescription(category: CategoryDef, modelCount: number): string {
  const tagList = [...category.primaryTags, ...category.secondaryTags.slice(0, 3)]
    .filter(t => t.length > 0)
    .join(', ');
  return `Browse ${modelCount} ${category.title.replace('Hottest ', '').replace('Best ', '').replace(' Live Now', '').toLowerCase()} streaming right now. This page updates every 30 minutes with fresh rankings based on viewer count, community upvotes, and 7-day engagement. ${tagList ? `Showing models tagged: ${tagList}.` : ''} All streams are free to watch.`;
}

// Main render function — produces complete HTML for a listicle page
export async function renderListiclePage(config: Config, data: ListiclePageData): Promise<string> {
  const templatePath = join(__dirname, '..', '..', 'templates', 'listicle-page.html');
  let html = await readFile(templatePath, 'utf-8');

  const { category, models, lastUpdated } = data;

  const modelCardsHtml = models
    .map((m, i) => buildModelCard(config, m, i + 1, category.slug))
    .join('\n\n    ');

  const formattedDate = lastUpdated.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }) + ' at ' + lastUpdated.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  const replacements: Record<string, string> = {
    '{{metaTags}}': buildMetaTags(config, category),
    '{{schemaMarkup}}': buildSchemaMarkup(config, category, models),
    '{{siteName}}': escHtml(config.siteName),
    '{{siteDomain}}': config.siteDomain,
    '{{whitelabelDomain}}': config.whitelabelDomain,
    '{{affiliateCampaign}}': config.affiliateCampaign,
    '{{affiliateTour}}': config.affiliateTour,
    '{{affiliateTrack}}': config.affiliateTrack,
    '{{pageTitle}}': escHtml(category.title),
    '{{categorySlug}}': category.slug,
    '{{categoryDescription}}': buildCategoryDescription(category, models.length),
    '{{modelCards}}': modelCardsHtml,
    '{{totalModels}}': String(models.length),
    '{{lastUpdated}}': formattedDate,
    '{{relatedPages}}': buildRelatedPages(config, category.slug),
    '{{year}}': String(new Date().getFullYear()),
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
