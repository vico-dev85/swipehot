# Lovable Prompt 2: Content Pages (Model Page, Blog Post, Blog Listing)

We already have the roulette app designed. Now add three new page types that share the exact same design system — same colors, fonts, icons, glassmorphism, and brand feel. Users moving between the roulette and these pages should feel like they're in one cohesive app.

These are SEO content pages — they'll be indexed by Google, so they need proper structure (headings, meta, readable content). But they must still feel like part of xcam.vip's premium dark experience, not a generic blog template.

---

## Shared Design Notes (carry forward from the roulette)

- **Same color palette** — #000000 / #1A1A1A / #FE2C55 / #00F0FF / #FFD740 / #00F891
- **Same font** — Inter, same size scale, same text-shadow on overlay text
- **Same icons** — Lucide, outlined default / filled active
- **Same shape language** — 20-24px radius cards, pill buttons, circle avatars
- **Background:** Use `#0A0A12` (tinted dark) for these pages instead of pure black — it's warmer for reading long content and reduces halation on white text
- **No grain texture** on content pages (only on roulette/start screen)
- **Responsive:** Mobile-first, but these pages should also look great on desktop (people find them via Google on any device)

---

## Page 1: Model Profile Page

**URL pattern:** `/models/scarlet-live`

This is an individual performer's SEO page. Users find it via Google ("ScarletLive cam" searches). It should make them want to watch her live — either in the roulette or by clicking through to the white label.

### Layout (Mobile)

**Hero Section (above the fold):**
- Full-width area, ~50vh height
- If model is ONLINE: show a video embed placeholder (dark area with a "▶ LIVE NOW" badge pulsing in accent-success green, blurred/gradient placeholder behind it)
- If model is OFFLINE: show a stylized placeholder with her avatar centered, dimmed, with text "Currently Offline"
- Bottom gradient overlay (same as roulette) for text readability
- Over the gradient, bottom-left: Model name large (24px bold), verified badge, "LIVE" pill badge (if online)
- Tags below name as small pill chips: `latina` `bigboobs` `lovense` — outlined style, #FE2C55 border, 10px text
- Primary CTA button floating at bottom of hero: **"Watch Her Live →"** (same style as roulette CTA — 56px, pill, #FE2C55). If offline: **"Watch Random Live →"** linking to roulette

**Stats Bar (just below hero):**
- Horizontal row of stats in a subtle glass-style card
- "👁 2,341 viewers" | "❤ 12.4K likes" | "⭐ 4.8 rating" | "📅 Online 4h ago"
- Each stat: icon + number + label, evenly spaced
- Background: `rgba(255,255,255,0.05)` with subtle border

**About Section:**
- Section heading: "About ScarletLive" — 20px bold
- AI-generated bio text: 3-4 paragraphs, 300-500 words
- Use this placeholder text:

> "ScarletLive is one of the most popular Latina cam models on the platform, known for her engaging personality and high-energy shows. Broadcasting regularly from Colombia, she's built a dedicated following of thousands of viewers who return for her interactive Lovense shows and genuine connection with her audience.
>
> With a focus on creating an intimate, fun atmosphere, ScarletLive's room is always buzzing with activity. Her shows typically feature goal-based events, interactive toys, and plenty of conversation — making every visit feel personal.
>
> She's most active during evening hours (EST) and has been streaming consistently for over two years, making her one of the most reliable performers to catch live."

- Text color: text-secondary (rgba(255,255,255,0.7))
- Line height: 1.7 for readability
- Max-width: 720px, centered on desktop

**Tags Section:**
- Section heading: "Categories & Tags"
- Tags as tappable pill chips, 3-4 per row, wrapped
- Style: outlined border in text-tertiary, 12px text, 32px height, 12px radius
- Tapping a tag would go to a category page (just link to # for now)

**Related Models Section:**
- Section heading: "Similar Models You'll Love"
- Horizontal scroll row of 5-6 model cards
- Each card: square aspect ratio (~140px), rounded corners (16px), dark background
- Placeholder image area (dark gradient), model name below (13px bold), one top tag (11px, text-tertiary)
- If online: small green dot + "LIVE" in tiny text
- Cards have subtle hover/tap scale effect (1.0 → 1.03)

**Schedule Section (simple):**
- Section heading: "When She's Usually Online"
- Simple visual: 7-day grid (Mon-Sun) with time blocks highlighted in accent-primary at low opacity
- Placeholder data: show highlighted blocks for Mon/Wed/Fri evenings

**Bottom CTA Section:**
- Full-width dark card with gradient background
- Text: "Don't miss her next show"
- CTA: **"Watch Live Now →"** or **"Explore More Models →"**
- Same button style as hero CTA

### Layout (Desktop — 1024px+)
- Hero becomes 60vh with video area on left (60%) and info on right (40%) in a two-column layout
- Stats bar spans full width below hero
- About section: centered column, max-width 720px
- Related models: grid instead of horizontal scroll (3 across)
- Sidebar appears on right: "More Live Models" with a vertical list of 4-5 models

---

## Page 2: Blog Post Page

**URL pattern:** `/blog/best-latina-cam-models-2026`

SEO article page. Users find these via Google for long-tail queries. The design should be a dark, premium reading experience — think Medium but dark mode and on-brand.

### Layout (Mobile)

**Hero Section:**
- Full-width, ~40vh
- Background: dark gradient with subtle mesh/aurora effect (not a real image — use a CSS gradient in brand colors at very low opacity)
- Over gradient: Category pill badge ("Cam Models" or "Tips & Guides") in glass style at top
- Article title: 28px bold, white, max 2-3 lines. Example: "Best Latina Cam Models to Watch in 2026"
- Below title: Author line "By xcam.vip Team • Feb 15, 2026 • 8 min read" in text-tertiary, 12px
- Bottom gradient for readability

**Article Body:**
- Max-width: 720px, centered
- Background: #0A0A12 (tinted dark)
- Padding: 20px horizontal on mobile, 0 on desktop (naturally centered)

- **Headings:**
  - H2: 22px bold, white, 32px margin-top
  - H3: 18px semibold, white, 24px margin-top
- **Body text:** 16px, text-secondary (rgba(255,255,255,0.7)), line-height 1.8
- **Links:** #00F0FF (electric cyan), underline on hover
- **Bold text:** White (text-primary) for emphasis
- **Blockquotes:** Left border 3px #FE2C55, padding-left 20px, italic, text-secondary
- **Lists:** Bullet style using accent-primary color for bullets

**Inline Model Callout Card (appears within article body):**
- Embedded between paragraphs
- Dark elevated card (#1A1A1A), 20px radius
- Left: circular avatar placeholder (60px)
- Right: Model name (bold, 15px), top tag (11px, text-tertiary), "🟢 LIVE" badge if online
- Bottom of card: small CTA "Watch Her Live →" in accent-primary text (not a full button — just a text link with arrow)
- These break up the article and drive clicks

**Table of Contents (sticky on desktop, collapsed on mobile):**
- Glass-style floating panel
- Lists H2 headings as clickable links
- Current section highlighted with accent-primary
- On mobile: collapsible "Table of Contents" button at top of article

**Related Articles Section (bottom):**
- Section heading: "More to Explore"
- Grid of 3 article cards (stacked on mobile, 3-across on desktop)
- Each card: dark elevated background, subtle gradient top area, category pill, title (16px bold), excerpt (13px, text-secondary, 2 lines), date
- Hover: subtle lift effect (translateY -2px + shadow increase)

**Bottom CTA Banner:**
- Full-width dark card with accent-primary gradient at low opacity
- Text: "Ready to explore?" — 20px bold
- Subtext: "Watch live performers right now — free, no signup" — 14px, text-secondary
- CTA: **"Start Watching →"** — pill button, #FE2C55, links to roulette
- This converts blog readers into roulette users

### Layout (Desktop — 1024px+)
- Hero: taller (50vh), title can be larger (36px)
- Article body: centered column, max-width 720px
- Sticky table of contents floats on the left side (200px wide)
- Right sidebar: "Popular Models" widget (4-5 models with avatars)
- Related articles: 3-column grid

---

## Page 3: Blog Listing / Category Hub Page

**URL pattern:** `/blog` (main listing) or `/latina-cams` (category hub)

Grid of articles or models within a category. Users land here from Google or internal navigation.

### Layout (Mobile)

**Header Area:**
- Page title large: "Latina Cam Models" or "xcam.vip Blog" — 28px bold, white
- Subtitle/description: "Discover the hottest Latina cam performers streaming live right now." — 14px, text-secondary
- If category page: show "X models online now" with accent-success dot
- Optional: horizontal scroll filter row of sub-categories as pill chips ("Colombian" | "Mexican" | "Brazilian" | etc.)

**Content Grid:**

*For Blog listing:*
- Cards stacked vertically on mobile (one per row)
- Each card: dark elevated (#1A1A1A), 20px radius
  - Top: gradient/color area (150px height) with category pill badge overlay
  - Title: 18px bold, white, max 2 lines
  - Excerpt: 13px, text-secondary, max 2 lines
  - Bottom: "Feb 15, 2026 • 8 min read" in text-tertiary
  - Hover/tap: subtle lift effect
- 16px gap between cards

*For Model category hub:*
- Grid: 2 columns on mobile, 3 on tablet, 4 on desktop
- Each card: square aspect ratio, dark background, 16px radius
  - Placeholder image area (gradient)
  - Overlay at bottom: model name (14px bold), top tag (10px, text-tertiary)
  - If online: green "LIVE" badge in top-right corner, pulsing
  - Hover/tap: scale 1.0 → 1.03
- 12px gap between cards

**Pagination:**
- Simple "Load More" button (ghost style: rgba(255,255,255,0.15) background, white text, pill shape)
- Or infinite scroll with loading shimmer at bottom
- Page numbers as fallback for SEO: small text links at very bottom

### Layout (Desktop — 1024px+)
- Blog cards: 3-column grid
- Model cards: 4-column grid
- Sidebar: "Trending Now" widget with 5 models, "Popular Tags" cloud
- Header area gets more horizontal space

---

## Navigation (Shared Across All Content Pages)

Design a minimal, consistent navigation bar for content pages:

### Mobile Nav
- **Top bar:** Fixed, 56px height, glassmorphism background (`rgba(0,0,0,0.3)` + blur)
- Left: xcam.vip mini logo/wordmark (14px, white)
- Right: Hamburger menu icon
- **Hamburger menu** (when opened): full-screen glass overlay with links:
  - "🎰 Roulette" (links to the main app)
  - "👤 Models" (model listing)
  - "📝 Blog" (blog listing)
  - "🔥 Live Now" (highlighted in accent-primary)
  - Each as a large tappable row (56px height), with icon and label

### Desktop Nav
- Fixed top bar, full width, glassmorphism background
- Left: xcam.vip wordmark
- Center: Nav links — "Roulette" | "Models" | "Blog" | "Live Now"
- Right: Online counter "🟢 4,287 live now"
- Active page has accent-primary underline or text color
- Subtle border-bottom in border-subtle color

### Footer (Content Pages Only — NOT on roulette)
- Dark background (#0A0A12)
- 4-column grid (stacked on mobile):
  - **Explore:** Roulette, Models, Blog, Categories
  - **Categories:** Latina, Asian, Blonde, Couples, Trans (top tags)
  - **About:** About xcam.vip, Privacy Policy, Terms, 18 USC 2257, Contact
  - **Follow:** Placeholder social icons (Twitter/X, Instagram, Reddit)
- Bottom bar: "© 2026 xcam.vip — All rights reserved" in text-tertiary
- Very subtle, not attention-grabbing — it's there for SEO and trust

---

## Placeholder Content for Blog Posts

Use these for the blog listing cards:

1. "Best Latina Cam Models to Watch in 2026" — Category: Cam Models — Feb 15, 2026
2. "How to Get the Most Out of Live Cam Shows: A Beginner's Guide" — Category: Tips & Guides — Feb 10, 2026
3. "Top 10 Interactive Cam Shows with Lovense Toys" — Category: Tech & Toys — Feb 8, 2026
4. "Asian Cam Models: Our Top Picks for 2026" — Category: Cam Models — Feb 5, 2026
5. "Cam Site Etiquette: 7 Things Every Viewer Should Know" — Category: Tips & Guides — Feb 1, 2026
6. "Couples Cam Shows: Why They're Trending in 2026" — Category: Trends — Jan 28, 2026

---

## Brand Cohesion Checklist

Make sure ALL pages share:
- ✅ Same color palette (use CSS custom properties)
- ✅ Same Inter font with same size scale
- ✅ Same icon library (Lucide) and outlined/filled behavior
- ✅ Same CTA button style (pill, #FE2C55, 56px for primary, 44px for secondary)
- ✅ Same glassmorphism treatment for overlays/panels
- ✅ Same gradient overlay technique for text over images/video
- ✅ Same corner radius scale (20-24px cards, 12px buttons, pill CTAs)
- ✅ Same hover/tap animations (scale 0.95 press, spring release)
- ✅ Same text-shadow on any text over images/video
- ✅ Dark everywhere — no white/light sections on any page
- ✅ A user navigating from blog post → model page → roulette should feel like ONE app

---

## Summary

These three page types + the roulette = the complete xcam.vip user experience. Someone finds a blog post on Google, reads it, clicks a model callout, lands on her profile page, taps "Watch Live," enters the roulette. Every step feels seamless, premium, and on-brand. That journey — from Google to roulette — should feel like one continuous, darkly beautiful experience.
