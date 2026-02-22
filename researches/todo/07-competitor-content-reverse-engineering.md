# Research: Competitor Content Reverse-Engineering for Cam Model Pages

## Context

I'm building an SEO content engine that generates static HTML model profile pages (like `/models/latina_daily`) and blog posts for a live cam roulette platform. The goal is thousands of indexable pages driving organic Google traffic.

**My current approach:**
- AI-generated 400-500 word bios per model
- Dark theme HTML pages with live embed (when online), thumbnail (when offline)
- Tags, related models grid, single CTA button
- JSON-LD schema (ProfilePage + BreadcrumbList), full meta tags

**The problem:** I'm designing these pages in a vacuum. I don't know what's actually ranking for my target keywords right now. Competitors like yescams.com, uncams.com, camseek.tv, and similar sites already rank for thousands of cam model keywords. I need to understand exactly what they're doing — not to copy, but to identify the minimum viable page structure that Google rewards in this niche and the gaps I can exploit.

**My keyword tiers:**
- Tier 1: Model names (2,505 keywords, e.g. "latina_daily", "akura_01's cam")
- Tier 2: Long-tail niche (43,819 keywords, e.g. "live cam big ass", "latina webcam group")
- Tier 3: Category pages (5,752 keywords, e.g. "ebony cam girls", "russian webcam models")

---

## Research Questions

### 1. Model Profile Page Analysis
Pick 10-15 model name keywords from this list and analyze what currently ranks #1-5 on Google:
- "latina_daily chaturbate"
- "asianqueen93 cam"
- "tasty_hot_latinas"
- "247asians"
- Any 5-10 popular chaturbate model names you can find with search volume

For each ranking page, document:
- **URL structure** — what's the URL pattern?
- **Word count** — how much text is on the page? (use a word counter tool)
- **Page structure** — what sections are present? (bio, stats, tags, related models, embed, gallery, social links?)
- **Heading hierarchy** — what H1/H2/H3 structure do they use?
- **Schema markup** — do they have JSON-LD? What type? (check via View Source or schema validator)
- **Internal links** — how many? Where do they point? (related models, categories, homepage?)
- **External links** — any outbound links?
- **Images** — thumbnails? Galleries? How many?
- **Video embed** — do they embed the live stream? Or just a thumbnail?
- **Online vs offline handling** — what does the page look like when the model is offline?
- **CTA design** — what's the call to action? How prominent? What copy?
- **Ads** — what ad placements exist?
- **Page speed** — rough estimate (fast/medium/slow)
- **Mobile experience** — is it mobile-first? How does the layout change?

**Search queries:**
- "[model_username] chaturbate" (try 10+ names)
- "site:yescams.com" + model names
- "site:uncams.com" + model names
- "site:camseek.tv" + model names
- "site:bongacams.com" + model names
- "[model_username] cam" (Google, check top 5 results)

### 2. Category/Hub Page Analysis
Search for 10 category keywords and analyze ranking pages:
- "ebony cam girls"
- "latina cam girls"
- "asian webcam models"
- "milf live cams"
- "teen cam girls" (18+)
- "blonde webcam girls"
- "russian cam girls"
- "colombian webcam models"
- "british cam girls"
- "brunette cam girls"

For each ranking page:
- Is it a directory/grid listing or a content article?
- How many models are listed?
- Is there any editorial content or just a grid?
- Word count of any editorial content
- Internal linking structure
- Does it have pagination?
- Filter/sort options?
- Schema markup?

**Search queries:**
- Each of the 10 keywords above
- "best [category] cams 2025"
- "[category] webcam models list"

### 3. Blog Post / Long-tail Content Analysis
Search for 10 long-tail keywords and analyze:
- "how much do cam models earn"
- "best latina cams"
- "free asian sex webcam"
- "chaturbate guide"
- "live cam tips"
- "cam girl earnings 2025"

For each ranking page:
- Word count
- Content structure (listicle, guide, review, comparison?)
- Number of internal links to model pages or categories
- Number of images/videos
- Author attribution?
- Publish date shown?
- Comment section?
- Schema markup (Article, FAQ, etc.?)
- How do they monetize? (affiliate links, ads, embeds?)

### 4. Technical SEO Patterns
Across all competitor sites analyzed, identify:
- **Sitemap structure** — can you find their sitemap.xml? How many URLs?
- **Robots.txt** — what's blocked vs allowed?
- **Canonical tags** — are they using canonicals correctly?
- **Hreflang** — any international targeting?
- **Page speed** — test 3-5 pages via PageSpeed Insights (just report the scores)
- **Core Web Vitals** — any obvious issues?
- **Indexing volume** — "site:domain.com" to estimate indexed pages
- **Internal link depth** — how many clicks from homepage to a model page?

**Search queries:**
- "site:yescams.com" (count pages)
- "site:uncams.com" (count pages)
- yescams.com/robots.txt
- yescams.com/sitemap.xml
- uncams.com/robots.txt
- PageSpeed Insights for sample pages

### 5. Content Gaps & Opportunities
Looking at what competitors are doing, identify:
- What sections/features do their model pages have that mine doesn't?
- What do they do poorly that I could do better?
- Are there content types they're NOT creating that I could own?
- What keywords are they ranking for that seem easy to outrank?
- Any broken or thin pages that represent an opportunity?

---

## Output Format

### Site: [competitor domain]
**Indexed pages:** ~N
**Model page example:** [URL]
**Structure breakdown:**
- Word count: X
- Sections present: [list]
- Schema: [yes/no, what type]
- Internal links: N
- CTA: [description]
- Embed: [yes/no, how handled]
- Offline handling: [description]

**Screenshots if possible:** Desktop + mobile view of a model page

---

## Summary I Need

1. **Model page blueprint** — The minimum viable page structure that Google rewards for model name keywords. What MUST be on the page.
2. **Word count benchmark** — What's the typical word count for ranking model pages? Are longer bios better?
3. **Category page blueprint** — Grid listing or editorial content? How many models per page?
4. **Content gap list** — 5-10 specific things competitors do poorly or skip that I can exploit.
5. **Schema markup standard** — What structured data are competitors using? What should I use?
6. **Internal linking benchmark** — How many internal links per page type? Where do they point?
7. **Red flags** — Any patterns competitors use that might trigger penalties (thin content, cloaking, doorway pages)?

---

**Estimated research time:** 90-120 minutes (lots of SERP analysis)
**Priority:** CRITICAL — This directly shapes the template, prompt, and page structure. Do this FIRST.
