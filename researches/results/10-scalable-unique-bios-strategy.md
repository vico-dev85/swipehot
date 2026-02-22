# Research 10: Strategy for Scalable, Unique Cam Model Bios

## Overview

Generating 2,500+ unique model profile bios that pass both AI detection and human quality checks requires systematic variation at every level: angle, structure, tone, vocabulary, and detail. This research covers the complete strategy from prompt engineering through quality assurance.

---

## 1. Angle Rotation System

### The Problem
If every bio follows the same structure ("Meet [Name], a [age]-year-old from [country] who loves..."), readers and Google both notice the pattern by page 20. AI detectors flag it even sooner.

### The Solution: Rotating Bio Angles
Define 8-12 distinct "angles" — each one a different narrative approach to introducing a performer. The content engine randomly assigns an angle to each model, ensuring no two consecutive bios feel alike.

### Angle Definitions

| # | Angle Name | Opening Style | Focus | Example Opening |
|---|---|---|---|---|
| 1 | **The Hook** | Start with what makes them unique | Standout trait or show style | "Most cam performers stick to one thing. [Name] built her following by..." |
| 2 | **The Vibe** | Describe the atmosphere of their room | Energy, mood, chat culture | "Walking into [Name]'s room feels like..." |
| 3 | **The Journey** | How they got here | Background, career arc | "[Name] started streaming in [year] as a way to..." |
| 4 | **The Community** | Their fans and regulars | Chat dynamic, loyalty | "There's a reason [Name]'s regulars call themselves..." |
| 5 | **The Specialist** | What they're known for | Niche, signature shows | "If you're searching for [specific thing], [Name] is the name that keeps coming up." |
| 6 | **The Contrast** | Unexpected combination | Subvert expectations | "Don't let the [trait] fool you — [Name] is..." |
| 7 | **The Insider Tip** | Written like a recommendation | Second-person, direct | "Looking for something different tonight? [Name] streams most evenings and..." |
| 8 | **The Stats** | Lead with impressive numbers | Followers, hours, ratings | "With [X] followers and counting, [Name] has quietly become one of..." |
| 9 | **The Schedule** | When to catch them | Timezone, consistency | "[Name] is one of the most consistent streamers on the platform, going live nearly every..." |
| 10 | **The Evolution** | How their content has changed | Growth, new directions | "Regulars who've followed [Name] since the early days have watched her evolve from..." |

### Implementation
```typescript
const ANGLES = ['hook', 'vibe', 'journey', 'community', 'specialist', 'contrast', 'insider_tip', 'stats', 'schedule', 'evolution'];

function assignAngle(modelIndex: number, totalModels: number): string {
  // Ensure even distribution across angles
  // Add randomness within batches to avoid predictable sequences
  const batchSize = ANGLES.length;
  const batchIndex = modelIndex % batchSize;
  const shuffledBatch = shuffleWithSeed(ANGLES, Math.floor(modelIndex / batchSize));
  return shuffledBatch[batchIndex];
}
```

### Angle-Specific Prompt Fragments
Each angle gets its own system prompt addition that guides Claude/ArliAI toward the right structure:

```
ANGLE: hook
Write the bio leading with what makes this performer stand out from others.
Open with their most distinctive trait or show element — NOT their name or age.
The first sentence should make someone curious enough to keep reading.

ANGLE: vibe
Write the bio as if describing the atmosphere of their room to a friend.
Focus on energy, mood, and what it feels like to be in their stream.
Use sensory language. The reader should feel the vibe before knowing the details.

ANGLE: community
Write the bio focusing on the performer's relationship with their audience.
Mention chat culture, inside jokes if known, what regulars say about them.
Frame the performer through the lens of the community they've built.
```

### Distribution Rules
- No two models generated in the same batch get the same angle
- Track angle usage in the `models` table (`bio_angle` column)
- Dashboard shows angle distribution to catch imbalances
- If one angle produces lower quality scores, reduce its frequency

---

## 2. Few-Shot Examples

### Why Few-Shot Matters
Zero-shot generation ("write a bio for this model") produces generic output. Few-shot prompting ("here are 3 examples of great bios, now write one for this model") dramatically improves quality, variety, and adherence to brand voice.

### Example Bank (3 per angle, 30 total)
Maintain a curated bank of hand-written example bios — 3 per angle. The content engine includes 2-3 relevant examples in each generation prompt.

### Example: "The Hook" Angle

**Example A:**
> Most streamers ease into their shows. Scarlett_Blaze opens with a countdown and a dare — and her chat loves every second of it. Known for her high-energy performances and an infectious laugh that cuts through even the most chaotic tip floods, she's built a loyal following that shows up rain or shine. Her room subject usually hints at the night's theme, and regulars know to arrive early before the room fills up. Streaming primarily in the evenings (EST), Scarlett brings a mix of playful teasing and genuine conversation that keeps viewers coming back long after the show ends.

**Example B:**
> There are performers who go live, and then there's Mila_Soft — someone who turns every stream into an event. Her signature? A room so chill it feels like a late-night hangout with a friend who happens to be stunning. Don't expect loud countdowns or aggressive tip menus. Mila's appeal is in the slow burn: the eye contact, the whispered conversations, the way she remembers returning viewers by name. Fluent in English and Spanish, she draws a genuinely international crowd most afternoons.

**Example C:**
> You'll hear her playlist before you see her face. Alexa_Vibes curates her stream like a DJ set — the music shifts with the mood, and the mood shifts with the chat. It's a surprisingly immersive experience for a webcam room. A self-described night owl streaming from somewhere in Eastern Europe, Alexa has carved out a niche as the performer you watch when you want something that feels less like a show and more like stumbling into someone's world at 2 AM.

### Example: "The Vibe" Angle

**Example A:**
> Soft lo-fi beats. Warm amber lighting. A smile that says "I've been waiting for you." That's what you walk into when Luna_Dreams is live. Her room has a reputation for being one of the most relaxed spaces on the platform — regulars describe it as "the chill corner of the internet." Luna streams 4-5 nights a week from her cozy setup, and the consistency shows: her chat is friendly, her regulars protective, and new visitors tend to stick around longer than they planned.

**Example B:**
> Bright ring light, pop music, and energy that doesn't quit — CherryBomb's room hits you like a Friday night. She's the kind of performer who thrives on a packed room, and her viewers feed off her enthusiasm just as much as she feeds off theirs. Expect games, challenges, and the kind of spontaneous chaos that makes live streaming unpredictable in the best way. She's been at it for over two years, and the stamina shows in her marathon weekend streams.

### Selection Logic
```typescript
function selectExamples(angle: string, currentModel: ModelData): string[] {
  const angleExamples = EXAMPLE_BANK[angle]; // 3 examples per angle
  // Pick 2 random examples (not always the same 2)
  const selected = shuffleArray(angleExamples).slice(0, 2);
  // If model has specific traits (e.g., non-English), prefer examples with similar traits
  if (currentModel.spoken_languages !== 'English') {
    const intlExamples = angleExamples.filter(e => e.hasInternationalElement);
    if (intlExamples.length > 0) selected[0] = intlExamples[0];
  }
  return selected;
}
```

### Prompt Structure with Examples
```
You are writing a profile bio for a live cam performer on {siteName}.

ANGLE: {angle}
{angle_specific_instructions}

Here are two examples of excellent bios in this style:

---
EXAMPLE 1:
{example_bio_1}
---
EXAMPLE 2:
{example_bio_2}
---

Now write a bio for this performer:
- Username: {username}
- Tags: {tags}
- Age: {age}
- Country/Region: {country}
- Spoken Languages: {languages}
- Followers: {num_followers}
- Typical viewer count: {num_users}
- Room subject: {room_subject}
- Currently online: {is_online}
- New performer: {is_new}

Requirements:
- 300-500 words
- Match the angle and tone of the examples
- Do NOT copy phrases from the examples
- Include the performer's username naturally 3-5 times
- Mention at least 2 of their tags organically
- If they speak multiple languages, mention it
- End with something that motivates the reader to watch
```

### Refreshing the Example Bank
- Review example effectiveness quarterly
- Replace examples that lead to too-similar outputs
- Add new examples when new angles are introduced
- Track which examples are most frequently used and rotate

---

## 3. Offline Model Strategy

### The Problem
Chaturbate has millions of registered performers, but only ~4,000-6,000 are online at any given time. Many models in our keyword list (2,505 model names) may be offline when we generate their pages. Some may be permanently inactive.

### Tiered Approach

#### Tier 1: Currently Online (Best Case)
- Full data available from CB API: tags, age, country, languages, viewers, room subject
- Generate rich bio with all details
- Embed their live stream on the page
- "LIVE NOW" badge

#### Tier 2: Recently Online (Within 7 Days)
- Cached data from our last pool fetch when they were online
- Store a snapshot in the `models` table when first seen online
- Generate bio from cached data — mark with `data_source: 'cached'`
- Page shows: "Currently Offline — Check Back Soon" + similar online models
- Schedule re-check: daily cron updates `last_online_at`

#### Tier 3: Known but Not Recently Seen (7-30 Days)
- May have partial data from initial keyword import
- Verify model exists: `GET https://chaturbate.com/{username}/` returns 200 vs 404
- If exists: generate bio from whatever data we have (username, tags from keyword source)
- Page shows: "This performer is currently away" + "Watch Similar Models" CTA
- Mark `status: 'inactive'` but keep page live (SEO value in the URL)

#### Tier 4: Unknown / Never Seen
- Model name from keyword list but never appeared in our API polls
- Verify existence via profile page check
- If 404: mark `status: 'removed'`, do NOT generate page, mark keyword `skipped`
- If exists but never online during our polls: generate minimal page from username + any tags from keyword source
- Low priority — generate last, after all Tier 1-2 models done

### Data Enrichment for Offline Models
When we can't get full API data, supplement with:

1. **Username parsing** — Many usernames contain hints: `latina_lucy` (ethnicity), `sweet_18` (age range), `uk_emma` (country)
2. **Keyword source data** — Some keyword CSVs include category/niche context
3. **Tag inference from category** — If keyword was categorized as "latina" during processing, inject that tag
4. **Profile page scraping** (careful, respect rate limits) — Bio text, profile photo, last broadcast date

### Implementation: Model Data Snapshot
```sql
-- Add columns to models table for cached data
ALTER TABLE models ADD COLUMN cached_tags JSON NULL;
ALTER TABLE models ADD COLUMN cached_age INT NULL;
ALTER TABLE models ADD COLUMN cached_country VARCHAR(10) NULL;
ALTER TABLE models ADD COLUMN cached_languages VARCHAR(255) NULL;
ALTER TABLE models ADD COLUMN cached_num_followers INT NULL;
ALTER TABLE models ADD COLUMN cached_room_subject TEXT NULL;
ALTER TABLE models ADD COLUMN data_source ENUM('live', 'cached', 'partial', 'minimal') DEFAULT 'minimal';
ALTER TABLE models ADD COLUMN last_verified_at DATETIME NULL;
ALTER TABLE models ADD COLUMN existence_verified TINYINT(1) DEFAULT 0;
```

### Cron Job: Model Status Updater
```
Every 6 hours:
1. Fetch all 5 gender pools from CB API (already doing this for roulette)
2. For each online model that exists in our models table:
   - Update last_online_at = NOW()
   - Update cached_* fields with fresh data
   - Set is_currently_online = 1
   - Set data_source = 'live'
3. For models in our table NOT in current pool:
   - Set is_currently_online = 0
   - If last_online_at > 30 days: set status = 'inactive'
```

### Page Rendering by Status
| Model Status | Embed | Badge | CTA | Similar Models |
|---|---|---|---|---|
| Online | Live stream | "LIVE NOW" (green) | "Watch [Name] Live" | "You Might Also Like" |
| Offline (recent) | Thumbnail/preview | "Currently Offline" | "Watch Similar Models" | "Online Now in [Category]" |
| Inactive (30d+) | Thumbnail only | "Away" | "Explore Live Cams" | "Popular in [Category]" |
| Removed | N/A (page 410/redirect) | N/A | N/A | N/A |

### SEO Considerations for Offline Models
- Offline model pages still have SEO value — they rank for the model's name
- Include enough content (300+ words) even for offline models
- "Currently offline" messaging is honest and builds trust
- Related/similar models section provides value even when target model is away
- If model is confirmed removed (404), return HTTP 410 (Gone) — tells Google to deindex
- Never show empty/broken pages — always have a CTA and alternative content

---

## 4. AI Slop Blocklist

### The Problem
AI-generated content has telltale patterns that readers, Google, and AI detectors recognize. These phrases are the "uncanny valley" of AI writing — technically correct but unmistakably artificial.

### Blocklist: Words and Phrases to Reject

#### Overused Filler Phrases (Immediate Reject)
```
- "delve into"
- "it's important to note"
- "it's worth noting"
- "in the realm of"
- "in today's digital landscape"
- "at the end of the day"
- "without further ado"
- "navigate the complexities"
- "a testament to"
- "serves as a reminder"
- "it goes without saying"
- "the world of [noun]"
- "embark on a journey"
- "tapestry of"
- "multifaceted"
- "myriad"
- "plethora"
- "utilize" (use "use" instead)
- "leverage" (as a verb, in non-financial context)
- "foster" (unless about children)
- "facilitate"
- "elevate your experience"
- "curated experience"
- "vibrant community"
- "a testament to her dedication"
- "seamlessly blends"
- "captivating presence"
- "exudes confidence"
- "radiate warmth"
- "infectious energy"
- "undeniable charm"
- "leaves nothing to the imagination"
- "feast for the eyes"
- "tantalizing"
- "alluring"
- "mesmerizing"
- "breathtaking"
- "sultry"
- "sizzling"
- "scintillating"
```

#### Structural Patterns (Flag for Review)
```
- Starting 3+ sentences with "She" in a row
- "Whether you're looking for X or Y, [Name] has you covered"
- "From X to Y, [Name] does it all"
- "[Name] is not just a [noun], she's a [noun]"
- "What sets [Name] apart is..."
- "But don't take our word for it"
- Any sentence starting with "Boasting"
- Any sentence starting with "Featuring"
- Ending with "...and she's just getting started"
- Ending with "...what are you waiting for?"
```

#### Cliche Descriptors Specific to Adult Content
```
- "goddess" (unless it's literally in their username/brand)
- "enchantress"
- "temptress"
- "vixen"
- "bombshell" (sparingly OK if fits)
- "smoking hot"
- "jaw-dropping"
- "drop-dead gorgeous"
- "curves in all the right places"
- "a sight to behold"
- "easy on the eyes"
```

### Implementation: Post-Generation Filter
```typescript
interface SlopCheck {
  pattern: string | RegExp;
  severity: 'reject' | 'flag';
  replacement?: string;
  category: 'filler' | 'structure' | 'cliche' | 'adult_cliche';
}

const SLOP_CHECKS: SlopCheck[] = [
  { pattern: /\bdelve\b/i, severity: 'reject', category: 'filler' },
  { pattern: /it'?s (important|worth) to note/i, severity: 'reject', category: 'filler' },
  { pattern: /tapestry of/i, severity: 'reject', category: 'filler' },
  { pattern: /\butilize\b/i, severity: 'flag', replacement: 'use', category: 'filler' },
  { pattern: /captivating presence/i, severity: 'reject', category: 'adult_cliche' },
  { pattern: /exudes? confidence/i, severity: 'reject', category: 'adult_cliche' },
  { pattern: /infectious energy/i, severity: 'reject', category: 'adult_cliche' },
  // ... full list
];

function checkForSlop(bio: string): { pass: boolean; issues: SlopCheck[]; score: number } {
  const found = SLOP_CHECKS.filter(check => {
    const regex = typeof check.pattern === 'string'
      ? new RegExp(check.pattern, 'i')
      : check.pattern;
    return regex.test(bio);
  });

  const rejects = found.filter(f => f.severity === 'reject');
  const flags = found.filter(f => f.severity === 'flag');

  // Score: 100 = clean, -20 per reject, -5 per flag
  const score = Math.max(0, 100 - (rejects.length * 20) - (flags.length * 5));

  return {
    pass: rejects.length === 0 && score >= 70,
    issues: found,
    score
  };
}
```

### Prompt-Level Prevention
Include in the system prompt:
```
WRITING RULES (strict):
- Never use these words: delve, myriad, plethora, tapestry, multifaceted, utilize, leverage, foster, facilitate
- Never use these phrases: "it's worth noting", "at the end of the day", "captivating presence", "exudes confidence", "infectious energy", "undeniable charm"
- Never start 3+ consecutive sentences with the same word
- Never use the structure "Whether you're looking for X or Y"
- Never end with "what are you waiting for?" or "she's just getting started"
- Write like a human music journalist or lifestyle blogger — not like a product listing
- Vary sentence length. Mix short punchy sentences with longer descriptive ones.
- Use specific details over generic praise. "Her Thursday night dance shows" beats "her amazing performances."
```

### Maintaining the Blocklist
- Review generated bios monthly for new emerging AI patterns
- Add new slop phrases as LLM outputs evolve (they change with model updates)
- Track rejection rates — if >30% of bios fail slop check, tighten the prompt rather than loosening the filter
- Keep the blocklist in a separate JSON file for easy updates without code changes

---

## 5. Optimal Generation Settings

### Claude API Settings (for safe/SFW content)

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "temperature": 0.85,
  "top_p": 0.92,
  "stop_sequences": ["---", "END BIO"],
  "system": "You are a lifestyle and entertainment writer..."
}
```

#### Parameter Rationale

**Temperature: 0.85** (higher than default 0.7)
- Default (0.7) produces safe but repetitive output across 2,500 bios
- 0.85 introduces enough randomness for genuine variety
- Above 0.9 risks incoherence and factual errors
- Sweet spot for creative writing that still follows instructions

**Top-p: 0.92**
- Works with temperature to control vocabulary diversity
- Lower values (0.8) reuse the same word choices too often
- 0.92 allows uncommon but appropriate word choices
- Combined with temperature 0.85, produces natural-feeling variation

**Max tokens: 1024**
- 300-500 word bio = ~400-650 tokens
- 1024 gives headroom for longer bios without truncation
- Also accounts for any preamble/framing the model adds

**Model: claude-sonnet-4-20250514**
- Best balance of quality and cost for 2,500+ generations
- Claude Opus is higher quality but 5x the cost — not justified for short bios
- Claude Haiku is too terse and repetitive for creative content

**Stop sequences**
- `---` and `END BIO` prevent the model from generating extra content after the bio
- Without stop sequences, Claude often adds meta-commentary ("I hope this bio captures...")

### ArliAI Settings (for NSFW content)

```json
{
  "model": "Mistral-Nemo-12B-Instruct-2407",
  "max_tokens": 1024,
  "temperature": 0.9,
  "top_p": 0.95,
  "repetition_penalty": 1.15,
  "top_k": 50
}
```

#### ArliAI-Specific Notes
- Higher temperature (0.9) because ArliAI models tend to be more formulaic at lower temps
- `repetition_penalty: 1.15` is critical — without it, ArliAI models repeat phrases within a single bio
- `top_k: 50` provides additional diversity control alongside top_p
- Mistral-Nemo-12B is the recommended model for adult content — uncensored but coherent
- Alternative: `Llama-3.1-70B-Instruct` for higher quality (slower, more expensive)

### Batch Generation Settings

```typescript
const BATCH_CONFIG = {
  // Generation
  batchSize: 20,              // Generate 20 bios per batch
  delayBetweenBatches: 5000,  // 5s pause between batches (rate limit respect)
  delayBetweenRequests: 500,  // 500ms between individual API calls
  maxConcurrent: 3,           // Max 3 simultaneous API calls

  // Retry
  maxRetries: 2,              // Retry failed generations up to 2 times
  retryDelay: 2000,           // 2s before retry
  retryWithHigherTemp: true,  // Bump temperature +0.05 on retry (more variety)

  // Quality
  minWordCount: 300,
  maxWordCount: 600,
  minSlopScore: 70,           // Reject below 70/100
  maxSimilarity: 0.30,        // Reject if >30% similar to any existing bio

  // Cost tracking
  trackTokenUsage: true,      // Log input/output tokens per generation
  estimatedCostPerBio: 0.003, // ~$0.003 per bio with Sonnet
  budgetAlert: 10.00,         // Alert if batch cost exceeds $10
};
```

### Cost Estimates
| Model | Cost per Bio | 2,500 Bios | Notes |
|---|---|---|---|
| Claude Sonnet | ~$0.003 | ~$7.50 | Best quality/cost ratio |
| Claude Opus | ~$0.015 | ~$37.50 | Overkill for short bios |
| Claude Haiku | ~$0.0005 | ~$1.25 | Too repetitive |
| ArliAI Mistral-Nemo | ~$0.001 | ~$2.50 | NSFW content only |

**Recommended split:** ~2,350 bios via Claude Sonnet ($7.05) + ~150 NSFW bios via ArliAI ($0.15) = **~$7.20 total**

---

## 6. NSFW Content Routing

### The Problem
Mainstream LLMs (Claude, GPT-4) refuse to generate explicit sexual content. Approximately 53% of long-tail keywords and 6% of model name keywords are flagged NSFW. These need an alternative generation path.

### NSFW Classification (Already Done in Keyword Processing)

The keyword processing script (`process-keywords.py`) flags keywords as `nsfw` based on:
- Explicit sexual terms in the keyword itself
- Adult act descriptions
- Fetish/kink terminology that mainstream LLMs reject

Safe keywords (~94% of model names, ~47% of long-tail) go through Claude.
NSFW keywords (~6% of model names, ~53% of long-tail) go through ArliAI.

### Routing Logic

```typescript
async function generateBio(model: ModelData, keyword: KeywordData): Promise<string> {
  const isNSFW = keyword.nsfw_flag === true || containsExplicitContent(model.tags);

  if (isNSFW) {
    return generateViaArliAI(model, keyword);
  } else {
    return generateViaClaude(model, keyword);
  }
}

function containsExplicitContent(tags: string[]): boolean {
  const EXPLICIT_TAGS = [
    'anal', 'squirt', 'deepthroat', 'bdsm', 'femdom', 'findom',
    'footfetish', 'bondage', 'dildo', 'orgasm', 'cumshow',
    'dp', 'fisting', 'gag', 'spank', 'whip'
    // ... extended list
  ];
  return tags.some(tag => EXPLICIT_TAGS.includes(tag.toLowerCase()));
}
```

### ArliAI Integration

```typescript
const ARLIAI_CONFIG = {
  apiUrl: 'https://api.arliai.com/v1/chat/completions',
  apiKey: process.env.ARLIAI_API_KEY,
  model: 'Mistral-Nemo-12B-Instruct-2407',
  // Fallback models in order of preference
  fallbackModels: [
    'Llama-3.1-70B-Instruct',
    'Llama-3.1-8B-Instruct'
  ]
};

async function generateViaArliAI(model: ModelData, keyword: KeywordData): Promise<string> {
  const prompt = buildNSFWPrompt(model, keyword);

  const response = await fetch(ARLIAI_CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ARLIAI_CONFIG.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: ARLIAI_CONFIG.model,
      messages: [
        { role: 'system', content: NSFW_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.9,
      top_p: 0.95,
      repetition_penalty: 1.15
    })
  });

  return response.json().then(r => r.choices[0].message.content);
}
```

### NSFW Prompt Differences
The NSFW prompt is more permissive but still has quality standards:

```
NSFW SYSTEM PROMPT:
You are an adult entertainment writer for {siteName}. You write explicit but
tasteful performer profiles. Your writing is direct and confident — not coy,
not euphemistic, but also not gratuitously crude.

Rules:
- Be explicit where appropriate but never degrading
- Use adult terminology naturally (not clinical, not slang-heavy)
- Still follow all angle/structure/quality rules
- Still avoid AI slop phrases
- Mention specific show types, fetishes, or specialties from their tags
- Frame everything as the performer's choice and expertise
- Never imply anything non-consensual
```

### Quality Parity
NSFW bios go through the exact same quality pipeline as SFW bios:
- Same word count requirements (300-500)
- Same slop detection
- Same similarity checking
- Same angle rotation
- Additional check: verify no slurs, no degrading language, no non-consent implications

### Fallback: Claude for Borderline Content
Some content is borderline — tags like `lovense`, `bigboobs`, `teen` (18-19, legal) are technically safe for Claude if framed carefully. The routing logic has three tiers:

1. **Definitely safe** (no explicit tags) → Claude
2. **Borderline** (suggestive but not explicit tags) → Try Claude first, fall back to ArliAI if refused
3. **Definitely NSFW** (explicit act tags) → ArliAI directly

```typescript
function classifyContent(tags: string[]): 'safe' | 'borderline' | 'nsfw' {
  if (tags.some(t => EXPLICIT_TAGS.includes(t))) return 'nsfw';
  if (tags.some(t => BORDERLINE_TAGS.includes(t))) return 'borderline';
  return 'safe';
}

const BORDERLINE_TAGS = [
  'lovense', 'bigboobs', 'bigass', 'curvy', 'thick', 'petite',
  'teen', 'young', 'milf', 'mature', 'smoking', 'tattoo',
  'piercing', 'latex', 'leather', 'stockings', 'lingerie'
];
```

---

## 7. Quality Gate Pipeline

### Overview
Every generated bio passes through a multi-stage quality pipeline before being published. The pipeline catches AI slop, duplicates, structural issues, and SEO problems before they reach production.

### Pipeline Stages

```
GENERATE → VALIDATE STRUCTURE → SLOP CHECK → SIMILARITY CHECK → SEO CHECK → HUMAN REVIEW QUEUE → PUBLISH
```

### Stage 1: Structure Validation
```typescript
interface StructureCheck {
  wordCount: { min: 300, max: 600 };
  paragraphCount: { min: 2, max: 6 };
  sentenceCount: { min: 8, max: 30 };
  avgSentenceLength: { min: 8, max: 25 }; // words
  usernameCount: { min: 3, max: 5 };       // mentions of performer name
  hasNoHeadings: true;                      // bios shouldn't have H2/H3
  hasNoBulletLists: true;                   // bios should be prose
  hasNoMarkdown: true;                      // output should be plain text
}

function validateStructure(bio: string, username: string): ValidationResult {
  const words = bio.split(/\s+/).length;
  const paragraphs = bio.split(/\n\n+/).length;
  const sentences = bio.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const nameCount = (bio.match(new RegExp(username, 'gi')) || []).length;

  const issues: string[] = [];

  if (words < 300) issues.push(`Too short: ${words} words (min 300)`);
  if (words > 600) issues.push(`Too long: ${words} words (max 600)`);
  if (nameCount < 3) issues.push(`Username mentioned only ${nameCount} times (min 3)`);
  if (nameCount > 5) issues.push(`Username mentioned ${nameCount} times (max 5, feels spammy)`);
  if (bio.includes('##') || bio.includes('**')) issues.push('Contains markdown formatting');
  if (bio.includes('- ') && bio.split('- ').length > 3) issues.push('Contains bullet list');

  return { pass: issues.length === 0, issues };
}
```

### Stage 2: Slop Check
(Detailed in Section 4 above)
- Run the full blocklist against the bio
- Score 0-100
- Reject if score < 70 or any "reject" severity items found

### Stage 3: Similarity Check
Prevent duplicate or near-duplicate content across the 2,500+ bio corpus.

```typescript
import { compareTwoStrings } from 'string-similarity'; // Dice coefficient

async function checkSimilarity(newBio: string, modelSlug: string): Promise<SimilarityResult> {
  // Get all existing published bios
  const existingBios = await db.query(
    'SELECT model_name, bio FROM models WHERE status = "active" AND bio IS NOT NULL'
  );

  let maxSimilarity = 0;
  let mostSimilarModel = '';

  for (const existing of existingBios) {
    const similarity = compareTwoStrings(
      newBio.toLowerCase(),
      existing.bio.toLowerCase()
    );
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilarModel = existing.model_name;
    }
  }

  return {
    pass: maxSimilarity < 0.30,
    maxSimilarity,
    mostSimilarModel,
    message: maxSimilarity >= 0.30
      ? `${(maxSimilarity * 100).toFixed(1)}% similar to ${mostSimilarModel}`
      : null
  };
}
```

#### Optimization for Large Corpus
Comparing every new bio against 2,500 existing bios is O(n). For scale:
- **Fingerprinting**: Store 3-gram fingerprints per bio, compare fingerprint overlap first (fast reject)
- **Batch processing**: Pre-compute fingerprints for all existing bios, store in memory during generation batch
- **Threshold shortcut**: If first 200 characters already >40% similar, skip full comparison

### Stage 4: SEO Validation
```typescript
function checkSEO(bio: string, model: ModelData): SEOResult {
  const issues: string[] = [];

  // Check tag coverage (at least 2 tags mentioned organically)
  const tagsMentioned = model.tags.filter(tag =>
    bio.toLowerCase().includes(tag.toLowerCase())
  );
  if (tagsMentioned.length < 2) {
    issues.push(`Only ${tagsMentioned.length} tags mentioned (min 2)`);
  }

  // Check for keyword stuffing (same word >5 times, excluding articles/prepositions)
  const wordFreq = getWordFrequency(bio);
  const stuffedWords = Object.entries(wordFreq)
    .filter(([word, count]) => count > 5 && word.length > 4)
    .map(([word, count]) => `"${word}" appears ${count} times`);
  if (stuffedWords.length > 0) {
    issues.push(`Possible keyword stuffing: ${stuffedWords.join(', ')}`);
  }

  // Check readability (Flesch-Kincaid Grade Level)
  const gradeLevel = calculateFleschKincaid(bio);
  if (gradeLevel > 12) {
    issues.push(`Reading level too high: grade ${gradeLevel} (target: 8-12)`);
  }
  if (gradeLevel < 6) {
    issues.push(`Reading level too low: grade ${gradeLevel} (target: 8-12)`);
  }

  return { pass: issues.length === 0, issues, tagsCovered: tagsMentioned };
}
```

### Stage 5: Human Review Queue (Optional)
For the first 100 bios, all go through manual review. After that, only flagged bios:

```typescript
function shouldQueueForReview(results: PipelineResults): boolean {
  // Always review first 100 bios (calibration period)
  if (totalPublished < 100) return true;

  // Review if any stage had warnings (not rejections — those get auto-retried)
  if (results.slopScore < 85) return true;
  if (results.similarityScore > 0.20) return true;
  if (results.seoIssues.length > 0) return true;

  // Random sample: review 10% of auto-approved bios
  if (Math.random() < 0.10) return true;

  return false;
}
```

### Retry Logic
When a bio fails any quality gate:

```typescript
async function generateWithRetry(model: ModelData, keyword: KeywordData): Promise<GenerationResult> {
  let lastBio = '';
  let lastIssues: string[] = [];

  for (let attempt = 1; attempt <= 3; attempt++) {
    const temperature = 0.85 + (attempt - 1) * 0.03; // Slightly higher temp each retry
    const angle = attempt === 1
      ? assignAngle(model)
      : getAlternateAngle(model, attempt); // Different angle on retry

    const bio = await generate(model, keyword, { temperature, angle });
    const results = await runPipeline(bio, model);

    if (results.pass) {
      return { success: true, bio, attempt, results };
    }

    lastBio = bio;
    lastIssues = results.allIssues;

    // If slop check failed, add the specific failures to the prompt as "avoid" instructions
    if (!results.slopCheck.pass) {
      keyword.extraInstructions = `AVOID: ${results.slopCheck.issues.map(i => i.pattern).join(', ')}`;
    }
  }

  // All 3 attempts failed
  return {
    success: false,
    bio: lastBio,
    attempt: 3,
    issues: lastIssues,
    action: 'flag_for_manual'
  };
}
```

### Pipeline Metrics Dashboard
Track these in the dashboard:

| Metric | Target | Alert If |
|---|---|---|
| First-attempt pass rate | >75% | <60% |
| Average slop score | >85 | <75 |
| Average similarity to corpus | <15% | >25% |
| Rejection rate (all retries failed) | <5% | >10% |
| Average word count | 350-450 | <300 or >500 |
| Tags covered per bio | >2.5 | <2.0 |
| Generation cost per bio | <$0.005 | >$0.01 |
| Time per bio (incl. retries) | <10s | >30s |

### Full Pipeline Summary

```
1. ASSIGN ANGLE          → Rotate through 10 angles, even distribution
2. SELECT EXAMPLES       → Pick 2 few-shot examples matching angle
3. BUILD PROMPT          → Combine angle + examples + model data + rules
4. ROUTE                 → Safe → Claude, NSFW → ArliAI, Borderline → try Claude first
5. GENERATE              → API call with optimized temperature/top_p
6. VALIDATE STRUCTURE    → Word count, paragraphs, username mentions, no markdown
7. SLOP CHECK            → 40+ blocked phrases, structural patterns, cliche filter
8. SIMILARITY CHECK      → Dice coefficient vs all existing bios, reject >30%
9. SEO CHECK             → Tag coverage, keyword density, readability grade
10. REVIEW QUEUE         → First 100 all manual, then flagged + 10% random sample
11. RETRY (if failed)    → Up to 2 retries with different angle + higher temperature
12. PUBLISH or FLAG      → Write HTML + update DB, or mark for manual review
```

---

## Summary

The combination of angle rotation (10 angles), few-shot examples (30 curated), slop detection (40+ patterns), similarity checking (30% threshold), NSFW routing (Claude/ArliAI split), and optimized generation settings produces a scalable pipeline capable of generating 2,500+ unique, high-quality bios at approximately $7-8 total API cost. The quality gate pipeline ensures every published bio meets structural, stylistic, and SEO standards with a target first-attempt pass rate above 75%.
