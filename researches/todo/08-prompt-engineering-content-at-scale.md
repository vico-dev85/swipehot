# Research: Prompt Engineering for Differentiated Content at Scale

## Context

I'm using Claude Haiku to generate 2,500+ model profile bios (400-500 words each) and eventually 5,000+ blog posts for a live cam platform. Each model page needs a unique bio that doesn't feel templated.

**My current prompt approach:**
- System prompt: "You are a content writer for [siteName]. Write SEO-optimized profile content."
- User prompt: provides model data (username, tags, age, gender, viewers, country) and asks for JSON with bio + meta description + categories
- Single prompt, no examples, no angle variation
- Haiku model (cheap, fast)

**The problem:** When you generate 2,500 bios with the same prompt structure, they all come out sounding like the same template with names swapped:
- "Known for her captivating presence..."
- "What sets [model] apart is her genuine warmth..."
- "Fans love [model] for her engaging personality..."

I need a system that produces genuinely varied content at scale — different angles, structures, tones, and hooks for each model. This is the core quality problem for the entire content engine.

**Additional constraint:** ~60% of models will be offline when generated, so many bios have only a username to work with (no tags, no live data). These are the hardest to differentiate.

---

## Research Questions

### 1. Angle Rotation Systems
- How do content-at-scale companies (Bankrate, NerdWallet, large affiliate sites) keep AI content varied?
- What's an "angle rotation" system? How does it work in practice?
- Can you provide a concrete list of 10-15 different bio "angles" for a cam model page? (e.g., "the journey angle", "the community angle", "the Q&A angle", "the day-in-the-life angle")
- How do you systematically prevent two pages from using the same angle?
- Template libraries vs random selection vs round-robin — what works?

**Search queries:**
- "AI content differentiation at scale techniques"
- "avoiding repetitive AI generated content"
- "content angle rotation system"
- "programmatic SEO content variation"
- "how to make AI content unique at scale"
- "content templates vs AI generation which is better SEO"

### 2. Few-Shot Examples for Quality Control
- How many examples should a few-shot prompt include for best results?
- Should examples be diverse (showing different angles) or consistent (showing one quality bar)?
- What makes a good few-shot example for content generation?
- Is it better to show full examples or partial examples with annotations?
- How do you prevent the model from copying the examples too closely?
- Example libraries: should they rotate per call or stay fixed?

**Search queries:**
- "few shot prompting best practices content generation"
- "how many examples for few shot prompting"
- "preventing LLM from copying few shot examples"
- "few shot vs zero shot content quality comparison"
- "prompt engineering for varied content output"

### 3. Structural Variation Techniques
- Beyond varying the text, how do you vary the HTML structure itself? (different heading arrangements, section order, sidebar callouts, FAQ sections, etc.)
- What structural elements make content feel "hand-written" vs "generated"?
- Should every bio have the same H2 pattern, or should H2s vary?
- Paragraph length variation — does it matter?
- Incorporating different content blocks: pull quotes, stat callouts, comparison tables, FAQ sections

**Search queries:**
- "content structure variation programmatic SEO"
- "making AI content look human written"
- "content layout variation at scale"
- "HTML structure variation SEO impact"
- "dynamic content templates with AI"

### 4. Generating From Minimal Data (Offline Models)
- When you only have a username (e.g., "latina_daily"), how do you generate 400 words of unique content?
- Techniques for inferring content from username patterns (nationality, physical attributes, personality hints from name)
- Should offline pages have a different content strategy than online ones?
- What "default" information is safe to include vs what would be obviously fabricated?
- How do competitors handle pages for offline/inactive models?
- Is it better to generate shorter but honest content, or longer speculative content?

**Search queries:**
- "generating content from limited data AI"
- "content generation with minimal input"
- "programmatic SEO thin content prevention"
- "placeholder content strategies SEO"
- "how to write about someone you don't know"

### 5. Temperature, Top-p, and Model Selection
- What temperature and top-p settings produce the most creative yet coherent content?
- Is Claude Haiku genuinely good enough for SEO content, or does Sonnet produce noticeably better quality?
- Cost-quality tradeoff: at $0.25/1K tokens (Haiku) vs $3/1K (Sonnet), when is Sonnet worth it?
- Does generating at higher temperature then filtering for quality beat generating at lower temperature?
- Should you generate multiple candidates and pick the best one?

**Search queries:**
- "LLM temperature setting for content generation"
- "Claude Haiku vs Sonnet content quality comparison"
- "AI content generation cost optimization"
- "generate and select vs single generation approach"
- "LLM top-p temperature creative writing"

### 6. Post-Processing and Quality Gates
- What automated checks catch "AI slop" (repetitive phrases, generic filler, clichés)?
- Lists of overused AI phrases to filter for (e.g., "delve into", "it's important to note", "in the world of")
- How to score content "naturalness" programmatically
- Readability scoring (Flesch-Kincaid, etc.) — what levels work for this audience?
- Should you have a human review step, or can quality gates be fully automated?

**Search queries:**
- "detecting AI generated content patterns"
- "AI slop detection automated"
- "overused AI phrases list 2025"
- "automated content quality scoring"
- "readability scoring for web content"
- "AI content post processing pipeline"

### 7. NSFW Content Generation
- My keyword set is split: 94% safe (Claude handles fine) and 6% NSFW (explicit terms that Claude refuses)
- What alternative APIs handle NSFW content generation? (ArliAI, local models, others?)
- How do you maintain consistent quality between safe and NSFW content from different models?
- Prompt strategies for suggestive-but-not-explicit content (the sweet spot for SEO)
- What's the SEO impact of explicit vs suggestive content? Does Google penalize explicit text?

**Search queries:**
- "NSFW content generation API alternatives 2025"
- "ArliAI API content generation review"
- "adult content SEO explicit vs suggestive"
- "LLM alternatives for adult content"
- "Google ranking explicit content pages"

---

## Output Format

### Technique: [Name]
**What it is:** [1-2 sentence description]
**How to implement:** [Specific steps, code patterns, or prompt snippets]
**Expected impact:** [How much it improves variation/quality]
**Example:** [Before/after if possible]

---

## Summary I Need

1. **Angle rotation system** — A concrete list of 12-15 bio angles with example H2 structures for each. Something I can encode as an array and cycle through.
2. **Few-shot example library** — 3-5 gold-standard example bios I can include in prompts, each showing a different angle.
3. **The offline model strategy** — Exactly how to handle models with username-only data. Template? Shorter format? Different page type?
4. **AI slop blocklist** — List of 30-50 overused AI phrases to detect and reject.
5. **Optimal generation settings** — Temperature, top-p, model choice, and whether to generate-and-select.
6. **NSFW routing recommendation** — Which API for the 6% NSFW keywords, and how to keep quality consistent.
7. **Quality gate pipeline** — Ordered list of automated checks to run on every generated bio before publishing.

---

**Estimated research time:** 60-90 minutes
**Priority:** CRITICAL — This is the difference between content that ranks and content that gets deindexed as spam.
