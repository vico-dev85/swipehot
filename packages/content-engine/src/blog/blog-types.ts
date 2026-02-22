// Blog post type definitions — 5 content types with generation parameters.
// Each type has target word counts, required sections, tone guidance, and FAQ requirements.

export type BlogType = 'safety_guide' | 'methods_guide' | 'how_to_guide' | 'platform_review' | 'payment_guide';

export interface BlogTypeDef {
  type: BlogType;
  label: string;
  targetWordCount: [number, number]; // [min, max]
  sections: string[];                // Required H2 section titles (flexible matching)
  toneGuide: string;
  ctaStyle: 'soft' | 'medium' | 'direct';
  faqCount: [number, number];        // [min, max] FAQ items
  internalLinkDensity: number;       // target links per 100 words
}

export const BLOG_TYPES: Record<BlogType, BlogTypeDef> = {
  safety_guide: {
    type: 'safety_guide',
    label: 'Safety Guide',
    targetWordCount: [1500, 2000],
    sections: ['Overview', 'Risk Assessment', 'Safety Tips', 'Verdict'],
    toneGuide: 'Reassuring but honest. Like a knowledgeable friend explaining risks without being preachy. Use facts and specifics, not vague warnings.',
    ctaStyle: 'soft',
    faqCount: [4, 6],
    internalLinkDensity: 0.8,
  },
  methods_guide: {
    type: 'methods_guide',
    label: 'Methods Guide',
    targetWordCount: [1500, 2500],
    sections: ['Introduction', 'Methods', 'Step-by-Step', 'Warnings'],
    toneGuide: 'Practical and direct. List concrete methods with clear steps. Be upfront about what works and what is a scam. No fluff.',
    ctaStyle: 'medium',
    faqCount: [4, 6],
    internalLinkDensity: 1.0,
  },
  how_to_guide: {
    type: 'how_to_guide',
    label: 'How-To Guide',
    targetWordCount: [1200, 1800],
    sections: ['Introduction', 'Requirements', 'Steps', 'Tips'],
    toneGuide: 'Clear and instructional. Numbered steps, screenshots-friendly structure. Get to the point fast — readers want to accomplish a task.',
    ctaStyle: 'soft',
    faqCount: [3, 5],
    internalLinkDensity: 0.6,
  },
  platform_review: {
    type: 'platform_review',
    label: 'Platform Review',
    targetWordCount: [2000, 2500],
    sections: ['Overview', 'Features', 'Pricing', 'Pros and Cons', 'Alternatives', 'Verdict'],
    toneGuide: 'Balanced reviewer voice. Give honest pros AND cons. Compare to alternatives. Include specific numbers (prices, token values). Sound like someone who actually used the platform.',
    ctaStyle: 'direct',
    faqCount: [5, 8],
    internalLinkDensity: 1.2,
  },
  payment_guide: {
    type: 'payment_guide',
    label: 'Payment Guide',
    targetWordCount: [1500, 2000],
    sections: ['Overview', 'Payment Methods', 'Step-by-Step', 'Fees and Limits', 'Tips'],
    toneGuide: 'Precise and factual. Readers want exact numbers, deadlines, and processes. Use tables for comparisons. Be the definitive resource.',
    ctaStyle: 'medium',
    faqCount: [4, 6],
    internalLinkDensity: 0.8,
  },
};

// The 15 planned blog posts with their assignments
export interface BlogQueueItem {
  slug: string;
  keyword: string;
  type: BlogType;
  volume: number;
  difficulty: number;
  title: string; // suggested H1
}

export const BLOG_QUEUE: BlogQueueItem[] = [
  {
    slug: 'is-chaturbate-safe',
    keyword: 'is chaturbate safe',
    type: 'safety_guide',
    volume: 1000,
    difficulty: 0,
    title: 'Is Chaturbate Safe? Honest Safety Guide for 2026',
  },
  {
    slug: 'free-chaturbate-tokens',
    keyword: 'free chaturbate tokens',
    type: 'methods_guide',
    volume: 1000,
    difficulty: 2,
    title: 'Free Chaturbate Tokens: What Actually Works (And What\'s a Scam)',
  },
  {
    slug: 'how-to-delete-chaturbate-account',
    keyword: 'how to delete chaturbate account',
    type: 'how_to_guide',
    volume: 1000,
    difficulty: 0,
    title: 'How to Delete Your Chaturbate Account (Step-by-Step)',
  },
  {
    slug: 'chaturbate-payout-guide',
    keyword: 'chaturbate payout',
    type: 'payment_guide',
    volume: 640,
    difficulty: 1,
    title: 'Chaturbate Payout Guide: Methods, Minimums, and How to Get Paid',
  },
  {
    slug: 'chaturbate-review',
    keyword: 'chaturbate review',
    type: 'platform_review',
    volume: 390,
    difficulty: 4,
    title: 'Chaturbate Review 2026: Features, Pricing, and Is It Worth It?',
  },
  {
    slug: 'make-money-on-chaturbate',
    keyword: 'make money on chaturbate',
    type: 'methods_guide',
    volume: 320,
    difficulty: 18,
    title: 'How to Make Money on Chaturbate: Real Strategies That Work',
  },
  {
    slug: 'livejasmin-review',
    keyword: 'livejasmin review',
    type: 'platform_review',
    volume: 320,
    difficulty: 1,
    title: 'LiveJasmin Review 2026: Premium Cams Worth the Price?',
  },
  {
    slug: 'how-much-do-cam-models-earn',
    keyword: 'how much do cam models earn',
    type: 'payment_guide',
    volume: 260,
    difficulty: 4,
    title: 'How Much Do Cam Models Earn? Real Numbers Breakdown',
  },
  {
    slug: 'camsoda-review',
    keyword: 'camsoda review',
    type: 'platform_review',
    volume: 170,
    difficulty: 5,
    title: 'CamSoda Review 2026: Features, Pricing, and Honest Verdict',
  },
  {
    slug: 'how-to-become-a-cam-model',
    keyword: 'how to become a cam model',
    type: 'how_to_guide',
    volume: 140,
    difficulty: 27,
    title: 'How to Become a Cam Model: Complete Beginner\'s Guide',
  },
  {
    slug: 'cam-site-alternatives',
    keyword: 'chaturbate alternative',
    type: 'platform_review',
    volume: 140,
    difficulty: 10,
    title: 'Best Chaturbate Alternatives: 7 Cam Sites Compared',
  },
  {
    slug: 'cam4-review',
    keyword: 'cam4 review',
    type: 'platform_review',
    volume: 70,
    difficulty: 2,
    title: 'CAM4 Review 2026: Free Cams, Features, and Is It Any Good?',
  },
  {
    slug: 'how-to-become-a-chaturbate-model',
    keyword: 'how to become a chaturbate model',
    type: 'how_to_guide',
    volume: 50,
    difficulty: 14,
    title: 'How to Become a Chaturbate Model: Sign-Up to First Stream',
  },
  {
    slug: 'chaturbate-streaming-guide',
    keyword: 'chaturbate streaming',
    type: 'how_to_guide',
    volume: 480,
    difficulty: 5,
    title: 'Chaturbate Streaming Guide: Equipment, Settings, and Tips',
  },
];

// Helper to look up a blog type by slug
export function getBlogDef(slug: string): BlogQueueItem | undefined {
  return BLOG_QUEUE.find(b => b.slug === slug);
}
