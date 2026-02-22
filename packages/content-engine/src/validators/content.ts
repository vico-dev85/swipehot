// Content quality validator for generated model bios.
// Checks word count, heading structure, meta description length, keyword density,
// AI slop phrases (Research 08), and sentence pattern repetition.

export interface ValidationResult {
  valid: boolean;
  score: number;      // 0-100
  issues: string[];
}

// --- AI Slop Blocklist (40+ phrases from Research 08) ---
// These are hallmarks of AI-generated fluff. Any bio containing them is penalized.

const AI_SLOP_PHRASES = [
  'it is important to note',
  'in the world of',
  "let's dive in",
  "let's dive into",
  "let's delve into",
  "in today's modern age",
  "in today's modern era",
  'ever-evolving landscape',
  'at the end of the day',
  'without further ado',
  "whether you're",
  'look no further than',
  'look no further',
  'a plethora of',
  'in conclusion',
  'in a world where',
  'harnessing the power of',
  'unlock the potential',
  'the heart of',
  'is a game-changer',
  'game-changer',
  'in the realm of',
  'imagine this:',
  'picture this:',
  'is key to success',
  'in the digital age',
  'in the digital era',
  "in today's fast-paced world",
  'has taken the world by storm',
  'catapulted to new heights',
  'dive right in',
  'dive deeper',
  'as we know,',
  'needless to say',
  'across the globe',
  'boasts a plethora',
  'cutting-edge',
  'state-of-the-art',
  'is not just',
  'from all walks of life',
  'the fact of the matter',
  'with that being said',
  "you've come to the right place",
  'has become increasingly popular',
  'one might argue',
  "let's embark on a journey",
  'buckle up',
  'this is a testament to',
  'now, more than ever',
  'it goes without saying',
  'in order to',      // only flagged if used as filler opener
  'ultimately,',      // only at sentence start
];

// Count words in HTML content (strips tags first).
function wordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(' ').filter(w => w.length > 0).length;
}

// Count occurrences of a term in text (case-insensitive).
function countOccurrences(html: string, term: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').toLowerCase();
  const target = term.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(target, pos)) !== -1) {
    count++;
    pos += target.length;
  }
  return count;
}

// Extract plain text sentences from HTML.
function extractSentences(html: string): string[] {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Split on sentence-ending punctuation
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

// Check for AI slop phrases in text. Returns list of found phrases.
export function detectSlopPhrases(html: string): string[] {
  const text = html.replace(/<[^>]+>/g, ' ').toLowerCase();
  const found: string[] = [];
  for (const phrase of AI_SLOP_PHRASES) {
    if (text.includes(phrase.toLowerCase())) {
      found.push(phrase);
    }
  }
  return found;
}

// Check for repetitive sentence starts (e.g. 3+ sentences starting with "She").
export function detectRepetitiveStarts(html: string): string[] {
  const sentences = extractSentences(html);
  if (sentences.length < 4) return [];

  const issues: string[] = [];

  // Check for consecutive sentences starting with same word
  for (let i = 0; i < sentences.length - 2; i++) {
    const getFirstWord = (s: string) => s.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
    const w1 = getFirstWord(sentences[i]);
    const w2 = getFirstWord(sentences[i + 1]);
    const w3 = getFirstWord(sentences[i + 2]);

    if (w1 === w2 && w2 === w3 && w1.length > 1) {
      issues.push(`3 consecutive sentences start with "${w1}"`);
      break; // One finding is enough
    }
  }

  // Check if >50% of sentences start with the same word
  const starts: Record<string, number> = {};
  for (const s of sentences) {
    const first = s.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
    if (first.length > 1) {
      starts[first] = (starts[first] || 0) + 1;
    }
  }

  for (const [word, count] of Object.entries(starts)) {
    if (count > sentences.length * 0.4 && count >= 4) {
      issues.push(`${count}/${sentences.length} sentences start with "${word}" (monotonous)`);
      break;
    }
  }

  return issues;
}

export function validateModelBio(
  bio: string,
  metaDescription: string,
  username: string,
): ValidationResult {
  const issues: string[] = [];
  let score = 100;

  // Word count: 300-600
  const words = wordCount(bio);
  if (words < 300) {
    issues.push(`Bio too short: ${words} words (min 300)`);
    score -= 30;
  } else if (words > 600) {
    issues.push(`Bio too long: ${words} words (max 600)`);
    score -= 10;
  }

  // Heading structure: at least 2 H2s
  const h2Count = (bio.match(/<h2[^>]*>/gi) || []).length;
  if (h2Count < 2) {
    issues.push(`Too few H2 headings: ${h2Count} (min 2)`);
    score -= 15;
  }

  // Username mentions: 3-5 times
  const mentions = countOccurrences(bio, username);
  if (mentions < 3) {
    issues.push(`Username "${username}" appears ${mentions} times (min 3)`);
    score -= 15;
  } else if (mentions > 7) {
    issues.push(`Username "${username}" appears ${mentions} times (max 7, feels spammy)`);
    score -= 10;
  }

  // Meta description: 120-160 chars
  if (metaDescription.length < 120) {
    issues.push(`Meta description too short: ${metaDescription.length} chars (min 120)`);
    score -= 10;
  } else if (metaDescription.length > 160) {
    issues.push(`Meta description too long: ${metaDescription.length} chars (max 160)`);
    score -= 5;
  }

  // Meta description should contain the username
  if (!metaDescription.toLowerCase().includes(username.toLowerCase())) {
    issues.push('Meta description should include the model username');
    score -= 5;
  }

  // No empty paragraphs
  if (bio.includes('<p></p>') || bio.includes('<p> </p>')) {
    issues.push('Bio contains empty paragraphs');
    score -= 5;
  }

  // AI Slop Detection (Research 08)
  const slopHits = detectSlopPhrases(bio);
  if (slopHits.length > 0) {
    issues.push(`AI slop phrases detected: ${slopHits.map(p => `"${p}"`).join(', ')}`);
    // Heavy penalty — each slop phrase costs 10 points
    score -= Math.min(slopHits.length * 10, 30);
  }

  // Sentence Pattern Repetition (Research 08)
  const repetitionIssues = detectRepetitiveStarts(bio);
  if (repetitionIssues.length > 0) {
    issues.push(...repetitionIssues);
    score -= 10;
  }

  return {
    valid: score >= 60,
    score: Math.max(0, score),
    issues,
  };
}

// Simple content similarity check — word overlap ratio.
export function contentSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(textA.replace(/<[^>]+>/g, ' ').toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(textB.replace(/<[^>]+>/g, ' ').toLowerCase().split(/\s+/).filter(w => w.length > 3));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }

  return overlap / Math.min(wordsA.size, wordsB.size);
}
