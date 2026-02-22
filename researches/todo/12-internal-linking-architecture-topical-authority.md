# Research: Internal Linking Architecture for Topical Authority at Scale

## Context

I'm building a content site that will eventually have:
- **~2,500 model profile pages** at `/models/{username}`
- **~5,000 blog posts** at `/blog/{keyword-slug}`
- **~100 category hub pages** at `/{category}-cams` (e.g., `/latina-cams`, `/asian-cams`)
- **1 roulette app** at `/` (the homepage and core product)

All pages are static HTML served by nginx. Internal links are baked into the HTML at generation time. When new pages are added, affected pages can be re-rendered to update their links.

**Current internal linking:**
- Model pages have a "Related Models" grid with 5-8 links to other model pages (matched by overlapping categories)
- Blog posts will have inline links to model pages where model names are mentioned
- Category hubs will list all models in that category
- All pages link to homepage (roulette) via nav bar

**The problem:** With 7,600+ pages, the internal linking graph is potentially the single biggest SEO lever. But I'm winging it — linking related models by tag overlap and hoping for the best. I need to understand how to architect the internal linking graph for maximum topical authority and crawl efficiency.

---

## Research Questions

### 1. Site Architecture Models
- **Hub-and-spoke** — category hubs as central nodes, model pages as spokes. How exactly does this work at scale?
- **Flat architecture** — every page is 2-3 clicks from homepage. Achievable with 7,600 pages?
- **Silo structure** — strict topical silos where pages only link within their category. Does this still work in 2025?
- **Topic clusters** — pillar pages + cluster pages. How does this apply to model pages?
- Which architecture does Google currently favor for large sites?
- What do successful large affiliate sites use?

**Search queries:**
- "internal linking architecture SEO 2025"
- "hub and spoke site structure"
- "topic cluster pillar page strategy"
- "silo structure SEO still works 2025"
- "flat vs deep site architecture SEO"
- "large affiliate site internal linking strategy"
- "programmatic SEO site architecture"

### 2. Optimal Links Per Page
- How many internal links should a model page have? (5? 15? 30?)
- How many internal links should a blog post have? (10? 20? 50?)
- How many internal links should a category hub have?
- Is there a point of diminishing returns (too many links per page)?
- Does Google value all links on a page equally, or do higher links carry more weight?
- Contextual links (within content) vs navigational links (nav, sidebar, footer) — which pass more authority?

**Search queries:**
- "optimal internal links per page SEO"
- "too many internal links Google"
- "contextual links vs navigational links SEO value"
- "internal link placement SEO impact"
- "link position on page SEO weight"
- "how many internal links blog post"

### 3. Anchor Text Strategy at Scale
- With 2,500 model pages linking to each other, anchor text variety is a real challenge
- What's the optimal anchor text distribution? (exact match, partial match, branded, generic)
- How to programmatically generate varied anchor text that doesn't look spammy?
- Should related model links always use the model's name, or vary it? ("Check out [model]" vs "[model]'s live cam" vs "watch [model]")
- At what point does repetitive anchor text trigger over-optimization filters?
- How do large sites with programmatic content handle anchor text?

**Search queries:**
- "anchor text distribution internal links"
- "anchor text variation programmatic SEO"
- "over optimization anchor text internal links"
- "programmatic anchor text generation"
- "internal link anchor text best practices 2025"
- "anchor text diversity requirement"

### 4. Bidirectional and Cross-linking Patterns
- Model A links to Model B as "related" — should Model B also link back to Model A?
- Does bidirectional linking between related models help or is it redundant?
- How to handle cross-linking at scale when new models are added daily? (re-render all affected pages?)
- Blog posts linking to model pages AND model pages linking to blog posts — circular OK?
- Should category hubs link to blog posts, or only to model pages?
- How to prevent "link juice" dilution when every page links to every other page?

**Search queries:**
- "bidirectional internal linking SEO"
- "reciprocal internal links help or hurt"
- "cross linking between sections site"
- "internal link equity dilution"
- "circular internal linking SEO impact"
- "link juice distribution internal links"

### 5. Programmatic Linking Implementation
- How to algorithmically decide which pages should link to which?
- Category overlap scoring vs more sophisticated methods (semantic similarity, keyword overlap)
- How often should link graphs be recalculated when new pages are added?
- Tools or algorithms for optimizing internal link distribution across large sites
- How to identify orphan pages (pages with no internal links pointing to them)
- How to identify pages that need more link equity (close to ranking but need a boost)

**Search queries:**
- "programmatic internal linking algorithm"
- "automated internal link optimization"
- "orphan pages detection SEO"
- "internal link distribution algorithm"
- "which pages need more internal links"
- "content interlinking automation"
- "internal linking graph optimization tool"

### 6. Category Hub Pages as Authority Nodes
- How should category hubs be structured to pass maximum authority to child pages?
- Should hubs have editorial content (500+ words) or just be model grids?
- How many models should a category hub link to before it becomes a "link farm"?
- Should hubs be paginated (page 1, page 2) or infinite scroll?
- Do hubs need unique content to rank themselves, or are they just authority distributors?
- How to handle models that belong to multiple categories?

**Search queries:**
- "category page SEO best practices 2025"
- "hub page content requirements SEO"
- "pagination vs infinite scroll SEO"
- "category page internal linking authority"
- "faceted navigation SEO"
- "tag page vs category page SEO"

### 7. Link Velocity and Maintenance
- When I add 50 new model pages, how many existing pages need updated links?
- Is there a risk in changing internal links on hundreds of pages at once?
- Should internal links be added gradually or in batches?
- How to maintain link freshness — removing links to inactive/removed models?
- Dead internal links — how fast do they hurt rankings?
- Redirect strategy for removed model pages (404 vs 301 to category)

**Search queries:**
- "internal link changes at scale SEO"
- "updating internal links bulk SEO impact"
- "dead internal links SEO penalty"
- "removed page redirect strategy"
- "internal link maintenance large site"
- "content removal internal linking update"

---

## Output Format

### Strategy: [Internal linking approach]
**What it is:** [Description]
**How competitors implement it:** [Examples from real sites]
**Recommended implementation:** [Specific steps for my site]
**Page types affected:** [model pages, blog posts, hubs]

---

## Summary I Need

1. **Architecture recommendation** — Which site architecture model fits a 7,600-page cam content site? Hub-and-spoke, flat, silos, or hybrid?
2. **Links-per-page targets** — Exact recommended numbers for model pages, blog posts, and category hubs.
3. **Anchor text playbook** — How to programmatically generate varied anchor text at scale. Include a list of 10-15 anchor text templates I can use.
4. **Category hub blueprint** — How to structure category pages: word count, how many models to list, editorial content, pagination.
5. **Link graph algorithm** — How to decide which models link to which. Beyond simple tag overlap — what signals matter?
6. **Re-rendering strategy** — When a new model is added, what's the minimum set of pages that need re-rendered links? (all in same category? all related? global recalc?)
7. **Orphan page prevention** — How to ensure every page has at least N internal links pointing to it. Monitoring approach.

---

**Estimated research time:** 60-90 minutes
**Priority:** HIGH — Internal linking is the #1 lever for topical authority on a new domain with no backlinks.
