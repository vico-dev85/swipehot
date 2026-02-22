// JSON-LD schema markup for model pages and blog posts.
// Generates ProfilePage, Article, FAQPage, and BreadcrumbList schemas.

import type { Config } from '../config.js';

export interface SchemaInput {
  username: string;
  displayName: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  tags: string[];
}

export interface BlogSchemaInput {
  title: string;
  description: string;
  canonicalUrl: string;
  publishDate: string;       // ISO date string
  modifiedDate?: string;     // ISO date string
  faqItems?: Array<{ question: string; answer: string }>;
}

export function generateModelSchema(config: Config, input: SchemaInput): string {
  const profilePage = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: input.displayName,
    description: input.description,
    url: input.canonicalUrl,
    image: input.imageUrl,
    mainEntity: {
      '@type': 'Person',
      name: input.displayName,
      alternateName: input.username,
      image: input.imageUrl,
      url: input.canonicalUrl,
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: config.siteName,
        item: `https://${config.siteDomain}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Models',
        item: `https://${config.siteDomain}/models/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: input.displayName,
        item: input.canonicalUrl,
      },
    ],
  };

  return `<script type="application/ld+json">${JSON.stringify(profilePage)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;
}

export function generateBlogSchema(config: Config, input: BlogSchemaInput): string {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    url: input.canonicalUrl,
    datePublished: input.publishDate,
    dateModified: input.modifiedDate || input.publishDate,
    author: {
      '@type': 'Organization',
      name: config.siteName,
      url: `https://${config.siteDomain}/`,
    },
    publisher: {
      '@type': 'Organization',
      name: config.siteName,
      url: `https://${config.siteDomain}/`,
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: config.siteName,
        item: `https://${config.siteDomain}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `https://${config.siteDomain}/blog/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: input.title,
        item: input.canonicalUrl,
      },
    ],
  };

  let schemas = `<script type="application/ld+json">${JSON.stringify(article)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;

  // Add FAQPage schema if FAQ items exist
  if (input.faqItems && input.faqItems.length > 0) {
    const faqPage = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: input.faqItems.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    };
    schemas += `\n    <script type="application/ld+json">${JSON.stringify(faqPage)}</script>`;
  }

  return schemas;
}
