// AI content generation — supports Claude, ArliAI, and OpenAI providers.
// Same prompts, angle rotation, and quality standards for all providers.
// ArliAI uses OpenAI-compatible API (recommended for NSFW keywords).
// Research sources: 07 (competitor analysis), 08 (prompt engineering), 09 (intent mapping).

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { Config, AIProvider } from '../config.js';
import type { CBRoom } from './chaturbate.js';

// --- Provider clients (lazy-initialized) ---

let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

function getAnthropicClient(apiKey: string): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

function getOpenAIClient(apiKey: string, baseURL?: string): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey, baseURL });
  }
  return openaiClient;
}

// Reset clients (useful for testing or provider switching)
export function resetClients(): void {
  anthropicClient = null;
  openaiClient = null;
}

export interface GeneratedContent {
  bio: string;            // 400-500 word unique bio with H2 subheadings
  metaDescription: string; // 120-160 chars
  categories: string[];    // 3-5 category tags
}

export interface MiniBio {
  text: string;           // 50-80 word plain text mini-bio for listicle cards
}

// --- Angle Rotation System (12 angles from Research 08) ---

export const ANGLES = [
  {
    name: 'girl-next-door',
    label: 'The Girl/Boy-Next-Door',
    description: 'Friendly, down-to-earth, approachable persona. Warm greeting, personal hobbies/quirks, casual sincere voice.',
    voice: 'casual, sincere, relatable',
    focus: 'authenticity and comfort',
  },
  {
    name: 'sultry-seductress',
    label: 'The Sultry Seductress',
    description: 'Sensual, teasing, sexually confident. Provocative hook, enticing features, flirty call-to-action.',
    voice: 'alluring, bold, confident',
    focus: 'erotic appeal and fantasy',
  },
  {
    name: 'comedian',
    label: 'The Comedian',
    description: 'Playful, witty, goofy side. Light jokes, fun facts, tongue-in-cheek humor.',
    voice: 'tongue-in-cheek, upbeat, witty',
    focus: 'entertainment and personality',
  },
  {
    name: 'myth-buster',
    label: 'The Myth-Buster',
    description: 'Not your stereotypical cam model. Surprising statement, unexpected traits/talents, one-of-a-kind positioning.',
    voice: 'assertive yet friendly, surprising',
    focus: 'breaking expectations',
  },
  {
    name: 'storyteller',
    label: 'The Storyteller',
    description: 'Personal narrative journey. Day-in-the-life anecdote, challenge or dream, current chapter inviting viewers in.',
    voice: 'engaging, narrative, first-person',
    focus: 'emotional connection and backstory',
  },
  {
    name: 'vip-club',
    label: 'The VIP Club',
    description: 'Exclusive, glamorous. Virtual red carpet, premium content offerings, inner circle vibe.',
    voice: 'enthusiastic, enticing, luxurious',
    focus: 'exclusivity and FOMO',
  },
  {
    name: 'tech-gamer',
    label: 'The Tech/Gamer Geek',
    description: 'Hobbyist/niche interest focus. Gaming, cosplay, music, fitness — passion tied into cam content.',
    voice: 'passionate, quirky, niche jargon',
    focus: 'hobbies and niche appeal',
  },
  {
    name: 'teacher-mentor',
    label: 'The Teacher/Mentor',
    description: 'Experienced guide. Inviting question, shares expertise, encourages viewers to explore safely.',
    voice: 'warm, confident, slightly authoritative',
    focus: 'expertise and viewer growth',
  },
  {
    name: 'dreamer',
    label: 'The Dreamer',
    description: 'Aspirational, adventurous. Big dreams, creativity, travel themes tied to cam experience.',
    voice: 'inspirational, open-hearted, deep',
    focus: 'personal aspirations and emotional depth',
  },
  {
    name: 'dominant-sub',
    label: 'The Dominant/Submissive Persona',
    description: 'Strong BDSM or role-specific vibe. Jumps into character, describes dynamics, sets boundaries alluringly.',
    voice: 'authoritative/coy depending on role',
    focus: 'fantasy role-play and power dynamic',
  },
  {
    name: 'party-starter',
    label: 'The Party Starter',
    description: 'High energy, social. Vibrant invitation, interactive games, multi-model shows, hype.',
    voice: 'exuberant, playful, welcoming',
    focus: 'interactive fun and community',
  },
  {
    name: 'secret-siren',
    label: 'The Secret Siren',
    description: 'Mysterious, teasing. Cryptic opening, enticing hints without giving everything away, seductive cliffhanger.',
    voice: 'hypnotic, whispery, sensory language',
    focus: 'curiosity and suspense',
  },
] as const;

export type AngleName = typeof ANGLES[number]['name'];

// Pick the best angle for a model based on tags/username, or use the provided one.
export function selectAngle(
  username: string,
  tags: string[],
  assignedAngle?: AngleName,
): typeof ANGLES[number] {
  if (assignedAngle) {
    return ANGLES.find(a => a.name === assignedAngle) || ANGLES[0];
  }

  const tagSet = new Set(tags.map(t => t.toLowerCase()));
  const nameLower = username.toLowerCase();

  if (tagSet.has('dominatrix') || tagSet.has('bdsm') || tagSet.has('bondage') ||
      tagSet.has('femdom') || tagSet.has('submissive') ||
      nameLower.includes('mistress') || nameLower.includes('domme') ||
      nameLower.includes('master') || nameLower.includes('sub')) {
    return ANGLES.find(a => a.name === 'dominant-sub')!;
  }

  if (tagSet.has('cosplay') || tagSet.has('gamer') || tagSet.has('gaming') ||
      tagSet.has('anime') || tagSet.has('nerd') ||
      nameLower.includes('gamer') || nameLower.includes('cosplay') ||
      nameLower.includes('nerd') || nameLower.includes('geek')) {
    return ANGLES.find(a => a.name === 'tech-gamer')!;
  }

  if (tagSet.has('dance') || tagSet.has('party') || tagSet.has('reggaeton') ||
      nameLower.includes('party') || nameLower.includes('dance')) {
    return ANGLES.find(a => a.name === 'party-starter')!;
  }

  if (tagSet.has('fitness') || tagSet.has('muscles') || tagSet.has('athletic') ||
      nameLower.includes('fit') || nameLower.includes('muscle') ||
      nameLower.includes('gym')) {
    return ANGLES.find(a => a.name === 'teacher-mentor')!;
  }

  if (tagSet.has('tease') || tagSet.has('mysterious') ||
      nameLower.includes('secret') || nameLower.includes('mystery') ||
      nameLower.includes('shy')) {
    return ANGLES.find(a => a.name === 'secret-siren')!;
  }

  return ANGLES[0]; // fallback
}

// --- Username Inference (Research 08 - Offline Model Strategy) ---

interface UsernameInference {
  likelyEthnicity?: string;
  likelyGender?: string;
  interests?: string[];
  persona?: string;
  ageCue?: string;
}

export function inferFromUsername(username: string): UsernameInference {
  const name = username.toLowerCase();
  const result: UsernameInference = {};

  if (/latin|latina|latino|colombian|mexican|brazilian|spanish/.test(name)) {
    result.likelyEthnicity = 'Latina/Latino';
  } else if (/asian|japanese|korean|chinese|thai|filipina|tokyo/.test(name)) {
    result.likelyEthnicity = 'Asian';
  } else if (/ebony|african|black/.test(name)) {
    result.likelyEthnicity = 'Ebony/Black';
  } else if (/indian|desi/.test(name)) {
    result.likelyEthnicity = 'South Asian';
  } else if (/russian|ukrainian|slavic|euro/.test(name)) {
    result.likelyEthnicity = 'Eastern European';
  }

  if (/girl|queen|goddess|princess|lady|miss|mrs|mama|milf|babe/.test(name)) {
    result.likelyGender = 'female';
  } else if (/boy|king|mister|mr|stud|daddy|dude/.test(name)) {
    result.likelyGender = 'male';
  } else if (/couple|duo|pair|and/.test(name)) {
    result.likelyGender = 'couple';
  }

  const interests: string[] = [];
  if (/gamer|gaming|play/.test(name)) interests.push('gaming');
  if (/cosplay|anime|manga|otaku/.test(name)) interests.push('cosplay/anime');
  if (/dance|salsa|twerk/.test(name)) interests.push('dancing');
  if (/music|dj|rock|punk/.test(name)) interests.push('music');
  if (/fit|gym|muscle|sport/.test(name)) interests.push('fitness');
  if (/cook|chef|food/.test(name)) interests.push('cooking');
  if (/art|paint|draw|creative/.test(name)) interests.push('art');
  if (/travel|adventure|wanderlust/.test(name)) interests.push('travel');
  if (interests.length > 0) result.interests = interests;

  if (/mistress|domme|dom\b/.test(name)) result.persona = 'dominatrix';
  if (/kitten|kitty|cat|pup|bunny/.test(name)) result.persona = 'playful/cute';
  if (/angel|sweet|honey|sugar/.test(name)) result.persona = 'sweet/angelic';
  if (/wild|crazy|naughty|bad/.test(name)) result.persona = 'wild/naughty';
  if (/hot|sexy|seductive/.test(name)) result.persona = 'seductive';
  if (/shy|quiet|soft/.test(name)) result.persona = 'shy/mysterious';

  const yearMatch = name.match(/(?:19|20)(\d{2})$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    if (year >= 1985 && year <= 2006) {
      const approxAge = new Date().getFullYear() - year;
      if (approxAge >= 18 && approxAge <= 45) {
        result.ageCue = `likely around ${approxAge} years old`;
      }
    }
  }

  return result;
}

// --- Few-Shot Examples (trimmed from Research 08) ---

const FEW_SHOT_EXAMPLES = `
EXAMPLE 1 — "Life of the Party" angle for a Latina model:
Username: LatinaDaily | Age: 24 | Gender: Female | Country: Colombia | Tags: #Latina, #Curvy, #Dance
<h2>Meet Your Daily Dose of Latina Sunshine</h2>
<p>Hola amores! Camila here — your warm Bogota party girl who brings salsa moves, reggaeton beats, and a smile as sweet as tres leches cake every time she goes live. By day she's a bubbly International Business student; by night LatinaDaily swaps textbooks for turntables and becomes the dancing queen of cam.</p>
<p>Step into her room and expect a non-stop fiesta. Body rolls, hip-hop grooves, and interactive games — truth or dare, dance battles, even Spanish lessons if you want to learn some naughty words. She speaks English and Spanish fluently, so she'll flirt in two languages.</p>
<h2>Why Viewers Keep Coming Back</h2>
<p>LatinaDaily remembers your name and your favorite song. Feeling down? Come for the infectious energy. Feeling frisky? She's got moves that'll make your jaw drop. From playful twerking to slow, sensual dancing — she lives to tease and please.</p>
<p>Join the party crew and turn your daily routine into a celebration. The night is young, the music's hot… all that's missing is you.</p>

EXAMPLE 2 — "Dominant & Empowered" angle for a BDSM model:
Username: MistressMiaX | Age: 30 | Gender: Female | Country: Germany | Tags: #Dominatrix, #Gothic, #Bondage
<h2>Enter Mistress Mia's Domain</h2>
<p>Kneel. You've found MistressMiaX's realm, and your life is about to get interesting. A 30-year-old German Dominatrix standing 5'10" in bare feet — raven-black hair, piercing blue eyes, a closet full of latex and leather. She lives to tantalize and discipline in equal measure.</p>
<p>Her sessions begin with ritual: dimmed gothic lighting, a slow strut to camera, riding crop in hand. Respect is mandatory; rudeness earns a one-way ticket out. But the polite, eager-to-please? Mistress rewards generously. She combines pleasure with pain, sweetness with sadism, and hosts weekly "Mistress Class" segments on BDSM technique.</p>
<h2>Empowerment Through Submission</h2>
<p>Despite the strict persona, MistressMiaX is no cruel person — she's an empowered woman who guides others to find their limits. Her viewers confess they feel oddly safe in her hands, even as she pushes their boundaries. That trust? She cherishes it with aftercare and praise.</p>
<p>Enter her realm if you dare. By the time you're done, you'll discover parts of yourself you never knew existed.</p>
`.trim();

// --- System & User Prompt Construction ---

function buildSystemPrompt(config: Config, angle: typeof ANGLES[number]): string {
  return `You are a creative writer crafting a cam model profile bio for "${config.siteName}".

ANGLE FOR THIS BIO: "${angle.label}"
- Description: ${angle.description}
- Voice: ${angle.voice}
- Focus: ${angle.focus}

WRITING RULES:
1. Write 400-500 words. Use <h2> for exactly 2-3 subheadings. Use <p> tags for paragraphs.
2. The site is "${config.siteName}" (tagline: "${config.siteTagline}"). ONLY use this exact name. NEVER invent or reference any other site name.
3. Write in THIRD PERSON about the performer (not first person).
4. Include the model's username naturally 3-5 times throughout the bio.
5. Keep content suggestive but tasteful — think "dating profile meets entertainment preview", NOT pornographic.
6. Include concrete details from the live data when available (tags, languages, country, viewers).
7. Address the reader directly with "you/your" to create engagement. End with an invitation or call-to-action like "join", "follow", "come watch".
8. Use contractions (she's, you'll, don't) — write conversationally, not formally.
9. Each sentence should vary in length and structure. Mix short punchy lines with longer flowing ones.

ABSOLUTELY FORBIDDEN — your bio will be rejected if it contains any of these:
- "In the world of..." / "In the realm of..."
- "Let's dive in" / "Let's delve into"
- "Whether you're ___ or ___"
- "Look no further" / "you've come to the right place"
- "A plethora of" / "boasts a plethora"
- "At the end of the day" / "In conclusion"
- "In today's [adjective] world/age/era"
- "Harnessing the power of" / "Unlock the potential"
- "The heart of [anything]" / "X is a game-changer"
- "Has taken the world by storm" / "Catapulted to new heights"
- "Imagine this:" / "Picture this:" / "Buckle up"
- "Ever-evolving landscape" / "cutting-edge" / "state-of-the-art"
- "From all walks of life" / "across the globe"
- "Now, more than ever" / "Without further ado"
- "This is a testament to" / "Let's embark on a journey"
- "It is important to note" / "One might argue"
- "X is not just... it's also..."
- Starting multiple consecutive sentences with "I" or "She"
- Any site name other than "${config.siteName}"

QUALITY STANDARDS:
- Every bio must feel like it was written by a human who actually watched this performer
- Use the assigned ANGLE to shape voice, structure, and focus — don't just write generic content
- Include at least one specific, memorable detail that makes this bio stand out
- If using cultural references (Spanish phrases, gaming terms, etc.), make them authentic`;
}

function buildUserPrompt(
  config: Config,
  username: string,
  modelData: CBRoom | null,
  angle: typeof ANGLES[number],
): string {
  let modelContext: string;

  if (modelData) {
    modelContext = `LIVE DATA for ${username}:
- Display name: ${modelData.display_name}
- Age: ${modelData.age ?? 'unknown'}
- Gender: ${modelData.gender === 'f' ? 'Female' : modelData.gender === 'm' ? 'Male' : modelData.gender === 't' ? 'Trans' : modelData.gender === 'c' ? 'Couple' : modelData.gender}
- Tags: ${modelData.tags.join(', ') || 'none'}
- Room subject: ${modelData.room_subject || 'none'}
- Current viewers: ${modelData.num_users}
- Followers: ${modelData.num_followers}
- Languages: ${modelData.spoken_languages || 'unknown'}
- Country: ${modelData.country || 'unknown'}
- HD stream: ${modelData.is_hd ? 'yes' : 'no'}
- Is new performer: ${modelData.is_new ? 'yes' : 'no'}
- Status: ONLINE`;
  } else {
    const inference = inferFromUsername(username);
    const hints: string[] = [];
    if (inference.likelyEthnicity) hints.push(`Likely ethnicity: ${inference.likelyEthnicity}`);
    if (inference.likelyGender) hints.push(`Likely gender: ${inference.likelyGender}`);
    if (inference.interests?.length) hints.push(`Interests from name: ${inference.interests.join(', ')}`);
    if (inference.persona) hints.push(`Persona vibe: ${inference.persona}`);
    if (inference.ageCue) hints.push(`Age hint: ${inference.ageCue}`);

    modelContext = `NO LIVE DATA — model "${username}" is currently OFFLINE.
${hints.length > 0 ? `Username analysis suggests:\n${hints.map(h => `- ${h}`).join('\n')}` : 'No clear hints from username — use a general friendly tone.'}

OFFLINE MODEL RULES:
- Write a slightly shorter bio (300-400 words) focused on persona and voice rather than specific facts
- Do NOT fabricate specific details (exact measurements, hometown, life story) that could be wrong
- DO make plausible general inferences (personality type, vibe, one or two hobbies that fit the name)
- Use more direct address to the reader ("you") to compensate for fewer factual details
- It's OK to lean into mystery: "new here" or "still discovering" turns lack of info into intrigue`;
  }

  return `Write a profile bio for the cam model "${username}" on ${config.siteName}.

${modelContext}

ASSIGNED ANGLE: "${angle.label}" — ${angle.description}
Voice should be: ${angle.voice}. Focus on: ${angle.focus}.

Here are examples of the quality and style we want (different angles):

${FEW_SHOT_EXAMPLES}

Now write the bio for "${username}" using the "${angle.label}" angle.

Return your response as JSON with this exact structure:
{
  "bio": "<h2>...</h2><p>...</p> (the full bio with HTML formatting)",
  "metaDescription": "120-160 character meta description including the model name and a compelling hook",
  "categories": ["3-5 category tags like 'latina', 'asian', 'milf', 'teen', 'ebony', 'blonde', etc."]
}

Return ONLY the JSON, no other text.`;
}

// --- Provider-specific API calls ---

async function callClaude(
  config: Config,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const client = getAnthropicClient(config.aiApiKey);
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    temperature: 0.8,
    top_p: 0.9,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('');
}

async function callArli(
  config: Config,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const client = getOpenAIClient(config.aiApiKey, 'https://api.arliai.com/v1');
  const response = await client.chat.completions.create({
    model: config.arliModel,
    max_tokens: 2000,
    temperature: 0.8,
    top_p: 0.9,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

async function callOpenAI(
  config: Config,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const client = getOpenAIClient(config.aiApiKey);
  const response = await client.chat.completions.create({
    model: config.openaiModel,
    max_tokens: 2000,
    temperature: 0.8,
    top_p: 0.9,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

// Route to the correct provider
export async function callProvider(
  config: Config,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  switch (config.aiProvider) {
    case 'claude': return callClaude(config, systemPrompt, userPrompt);
    case 'arli':   return callArli(config, systemPrompt, userPrompt);
    case 'openai': return callOpenAI(config, systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown AI provider: ${config.aiProvider}`);
  }
}

// --- Main Generation Function ---

export async function generateModelBio(
  config: Config,
  username: string,
  modelData: CBRoom | null,
  angleName?: AngleName,
): Promise<GeneratedContent> {
  // Select angle
  const tags = modelData?.tags || [];
  const angle = angleName
    ? (ANGLES.find(a => a.name === angleName) || ANGLES[0])
    : selectAngle(username, tags);

  const systemPrompt = buildSystemPrompt(config, angle);
  const userPrompt = buildUserPrompt(config, username, modelData, angle);

  console.log(`[ai] Provider: ${config.aiProvider}${config.aiProvider === 'arli' ? ` (${config.arliModel})` : ''}`);

  const text = await callProvider(config, systemPrompt, userPrompt);

  // Parse JSON response — handle markdown code fences
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let parsed: GeneratedContent;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${text.slice(0, 300)}`);
  }

  if (!parsed.bio || !parsed.metaDescription || !Array.isArray(parsed.categories)) {
    throw new Error('AI response missing required fields (bio, metaDescription, categories)');
  }

  // Validate no hardcoded brand names leaked
  const lowerBio = parsed.bio.toLowerCase();
  const forbidden = ['xcam.vip', 'xcam vip', 'strangerflip', 'strangerswipe', 'swipe.hot', 'swipehot', 'chaturbate'];
  const siteLower = config.siteName.toLowerCase();
  for (const term of forbidden) {
    if (term !== siteLower && lowerBio.includes(term)) {
      throw new Error(`Generated content contains hardcoded brand "${term}" — must use only "${config.siteName}"`);
    }
  }

  return parsed;
}

// --- Mini-Bio Generation (50-80 words for listicle cards) ---

function buildMiniBioSystemPrompt(config: Config): string {
  return `You write ultra-short model bios (50-80 words) for "${config.siteName}" listicle pages.

RULES:
1. Exactly 50-80 words. Not a single word more.
2. Plain text only — no HTML, no markdown.
3. Third person ("She streams...", "He brings...").
4. Include 1-2 specific details from the live data (tags, country, vibe).
5. End with something that makes the reader want to click.
6. Conversational, punchy, no fluff.

FORBIDDEN PHRASES: "In the world of", "Let's dive in", "Whether you're", "Look no further", "A plethora of", "game-changer", "cutting-edge", "has taken by storm".

Return ONLY the bio text. Nothing else.`;
}

function buildMiniBioUserPrompt(username: string, modelData: CBRoom): string {
  const genderLabel = modelData.gender === 'f' ? 'Female' : modelData.gender === 'm' ? 'Male' : modelData.gender === 't' ? 'Trans' : modelData.gender === 'c' ? 'Couple' : modelData.gender;
  return `Write a 50-80 word mini-bio for: ${username}
- Display name: ${modelData.display_name}
- Age: ${modelData.age ?? 'unknown'}
- Gender: ${genderLabel}
- Tags: ${modelData.tags.slice(0, 8).join(', ') || 'none'}
- Room subject: ${modelData.room_subject || 'none'}
- Country: ${modelData.country || 'unknown'}
- Viewers: ${modelData.num_users}
- New performer: ${modelData.is_new ? 'yes' : 'no'}`;
}

export async function generateMiniBio(
  config: Config,
  username: string,
  modelData: CBRoom,
): Promise<MiniBio> {
  const systemPrompt = buildMiniBioSystemPrompt(config);
  const userPrompt = buildMiniBioUserPrompt(username, modelData);

  const text = await callProvider(config, systemPrompt, userPrompt);
  let bio = text.trim();

  // Strip any accidental markdown/HTML
  bio = bio.replace(/<[^>]+>/g, '').replace(/[*_#`]/g, '');

  // Validate word count — reject if way outside range
  const wordCount = bio.split(/\s+/).length;
  if (wordCount < 20 || wordCount > 150) {
    throw new Error(`Mini-bio word count out of range: ${wordCount} words`);
  }

  return { text: bio };
}
