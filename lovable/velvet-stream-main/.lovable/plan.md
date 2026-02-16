

# Content Pages — Updated Plan

This is the same plan as before with two additions highlighted below. Everything else remains unchanged.

---

## Addition 1: Model Listing / Category Hub Page

### Route: `/models` (all models) and `/models?category=latina` (filtered)
### File: `src/pages/ModelListing.tsx`

**Sections:**

1. **Header**: Page title "Live Cam Models" (28px bold), subtitle "Discover performers streaming live right now", online count with green dot ("12 models online now").

2. **Filter Pills**: Horizontal scroll row of sub-category pills -- "All" | "Latina" | "Asian" | "Blonde" | "Couples" | "Trans" | "MILF". Active pill uses `#FE2C55` background, others use `rgba(255,255,255,0.15)`. 32px height, pill shape.

3. **Model Grid**: 
   - 2-col on mobile, 3-col on tablet (md), 4-col on desktop (lg)
   - 12px gap
   - Each card: square aspect ratio, 16px border-radius, dark gradient background
   - Bottom overlay: model name (14px bold), top tag (10px, text-tertiary)
   - If online: green pulsing "LIVE" badge in top-right corner (same pulse animation as roulette)
   - Hover/tap: scale 1.0 to 1.03
   - Links to `/models/:slug`

4. **Pagination**: "Load More" ghost button at bottom.

Uses `ContentLayout` wrapper. Data comes from the extended `models.ts` file (needs 8-10 models total to fill the grid).

---

## Addition 2: Blog Listing Desktop Sidebar

### Updates to `src/pages/BlogListing.tsx`

At the `lg` breakpoint, the blog listing switches to a two-column layout:
- **Left (wide)**: The existing 3-col article card grid
- **Right sidebar (280px)**:
  - **"Trending Now" widget**: Glass-style card with 5 model entries. Each: small circular avatar (40px), name, "LIVE" badge if online. Links to model profile.
  - **"Popular Tags" cloud**: Below the trending widget. Tags as small pill chips in varying sizes/opacity to suggest popularity. Tags like "latina", "lovense", "couples", "asian", "blonde", etc. Each links to `/models?category=tag`.

---

## Reminders for Implementation Quality

- **Model profile hero online vs offline**: Online state gets a vibrant gradient, pulsing green "LIVE NOW" badge, and a video embed placeholder. Offline state gets a desaturated/dimmed gradient, grayscale avatar, and "Currently Offline" text in text-tertiary. The contrast should be dramatic and immediately obvious.

- **Blog post hero aurora gradient**: Keep it extremely subtle -- brand colors (`#FE2C55`, `#00F0FF`) at 5-8% opacity, with slow animation. It should add warmth, not dominate.

- **Blog post right sidebar**: The "Popular Models" widget on desktop is confirmed for implementation -- sticky positioned, shows 4-5 models with avatars and LIVE status.

---

## Updated Route Table

```text
/              ->  Index (Age Gate -> Start Screen -> Roulette)
/models        ->  ModelListing (grid of all models)
/models/:slug  ->  ModelProfile (individual model page)
/blog          ->  BlogListing (article grid + sidebar on desktop)
/blog/:slug    ->  BlogPost (article + TOC + sidebar on desktop)
```

---

## Updated Data: `src/data/models.ts`

Needs 8-10 models (not just the original 5 performers) to properly fill the grid page. Add 4-5 more with varied tags, online/offline status, and unique slugs.

---

Everything else from the previous plan (ContentLayout, ContentNavbar, ContentFooter, all page sections, responsive breakpoints, styling) remains exactly the same.

