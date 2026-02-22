// Meta tag generation for model pages and blog posts.
// Returns the full <head> meta block as an HTML string.

import type { Config } from '../config.js';

export interface MetaInput {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  type?: string; // og:type, defaults to 'profile'
}

export interface BlogMetaInput {
  title: string;
  description: string;
  canonicalUrl: string;
  publishDate: string;   // ISO date string
  section?: string;      // article category/section
}

export function generateMetaTags(config: Config, input: MetaInput): string {
  const { title, description, canonicalUrl, imageUrl } = input;
  const ogType = input.type || 'profile';

  return `<title>${escHtml(title)}</title>
    <meta name="description" content="${escAttr(description)}">
    <link rel="canonical" href="${escAttr(canonicalUrl)}">

    <!-- Open Graph -->
    <meta property="og:title" content="${escAttr(title)}">
    <meta property="og:description" content="${escAttr(description)}">
    <meta property="og:image" content="${escAttr(imageUrl)}">
    <meta property="og:url" content="${escAttr(canonicalUrl)}">
    <meta property="og:type" content="${ogType}">
    <meta property="og:site_name" content="${escAttr(config.siteName)}">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escAttr(title)}">
    <meta name="twitter:description" content="${escAttr(description)}">
    <meta name="twitter:image" content="${escAttr(imageUrl)}">`;
}

export function generateBlogMetaTags(config: Config, input: BlogMetaInput): string {
  const { title, description, canonicalUrl, publishDate, section } = input;

  let meta = `<title>${escHtml(title)}</title>
    <meta name="description" content="${escAttr(description)}">
    <link rel="canonical" href="${escAttr(canonicalUrl)}">

    <!-- Open Graph -->
    <meta property="og:title" content="${escAttr(title)}">
    <meta property="og:description" content="${escAttr(description)}">
    <meta property="og:url" content="${escAttr(canonicalUrl)}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="${escAttr(config.siteName)}">
    <meta property="article:published_time" content="${escAttr(publishDate)}">`;

  if (section) {
    meta += `\n    <meta property="article:section" content="${escAttr(section)}">`;
  }

  meta += `

    <!-- Twitter -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escAttr(title)}">
    <meta name="twitter:description" content="${escAttr(description)}">`;

  return meta;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
