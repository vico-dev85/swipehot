# Research Synthesis: xcam.vip Design & Conversion Playbook

**Sources:** Research 1 (TikTok UX mechanics), Research 2 (conversion psychology & mobile UX), Research 3 (visual design blueprint & trends)

---

## 1. DESIGN SYSTEM (for Lovable prompts)

### Color Palette (consolidated)

| Token | Hex | Usage | Source |
|-------|-----|-------|--------|
| `--bg-primary` | `#000000` | True black, OLED-optimized base | R2 uses `#121212` for backgrounds, R3 uses `#000000`. See Conflicts section. |
| `--bg-elevated` | `#1A1A1A` | Elevated surfaces, cards, skeleton placeholders | R2 + R3 agree |
| `--bg-overlay` | `rgba(0,0,0,0.6)` | Glass panels over video | R3 |
| `--accent-primary` | `#FE2C55` | Hearts, likes, primary CTAs | R3 (TikTok's hot pink). R2 recommends `#FF1744` (Material red). See Conflicts. |
| `--accent-secondary` | `#00F0FF` | Info highlights, secondary actions | R3 (electric cyan) |
| `--accent-gold` | `#FFD740` | Premium/VIP elements | R2 |
| `--accent-purple` | `#BB86FC` | Interactive/social elements | R2 |
| `--accent-success` | `#00F891` (R3) / `#00C853` (R2) | Online indicators, success states | See Conflicts |
| `--text-primary` | `#FFFFFF` | Headlines, usernames | All 3 |
| `--text-secondary` | `rgba(255,255,255,0.7)` | Body text, descriptions | R3. R2 uses `rgba(255,255,255,0.60)` |
| `--text-tertiary` | `rgba(255,255,255,0.5)` | Captions, timestamps | R3 |
| `--border-subtle` | `rgba(255,255,255,0.08)` | Glass panel borders | R3 |
| `--cta-glow` | `rgba(255,23,68,0.4)` | CTA button shadow | R2 |

**60-30-10 rule** (R2): 60% dark background, 30% surface/card colors, 10% accent. CTAs command attention via the Von Restorff isolation effect.

**2025-2026 trend direction** (R3): "Neon Minimal" -- neon as micro-glow accents against dark surfaces, not as primary colors. One dominant neon accent + one secondary accent + neutral dark base.

### Typography

**Font family:** Inter (R2 + R3 agree) or Plus Jakarta Sans (R3 alternative). TikTok Sans is available on Google Fonts under SIL OFL 1.1 (R3) but Inter is the safer cross-platform choice.

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Username | 15-17px | Bold (700) | White + text-shadow |
| Description | 13-14px | Regular (400) | Max 2-3 lines, truncated with "...more" |
| Counter numbers | 12-13px | Semibold (600) | Below right-side icons |
| CTA button text | 15-16px | Bold (700) | ALL-CAPS, letter-spacing 0.04em |
| Tab bar labels | 10-11px | Medium (500) | Below nav icons |
| Tags | 11px | Medium (500) | ALL-CAPS (R2) |
| Model name (overlay) | 20px | Bold (700) | R2 spec |

**Text shadow for ALL overlay text** (R3):
```css
text-shadow: 0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.3);
```

**`font-variant-numeric: tabular-nums`** on all counters to prevent layout shift when digits change (R3 + CLAUDE.md).

### Icon Style & Sizing

- **Style:** Outlined/line-art for default state, filled for active/selected (R3 confirms YouTube Shorts switched to this in 2025, TikTok has always used it)
- **Stroke weight:** 1.5-2px at 24px icon size (R3)
- **Icon visual size:** 32-36px (R3)
- **Touch target:** 48x48px minimum (Material Design standard per R3)
- **Libraries:** Phosphor Icons (most versatile) or Lucide (cleaner, more minimal) (R3)
- **Color:** Monochrome white with drop shadow. Active states fill with accent color (R1 + R3)

### Corner Radius / Shape Language

- **Overlay cards:** 20-24px squircle (R3 -- CSS `corner-shape: squircle` landing in Chrome 139+)
- **Buttons:** 12-14px squircle (R3)
- **Primary CTAs:** Full pill (`border-radius: 9999px` or `28px` for 56px height) (R2 + R3)
- **Avatars:** Full circle (R3)
- **Chat bubbles:** 16px (R3 from BIGO Live pattern)
- **Glass panels:** 20px (R3)
- **Sharp corners:** Avoid entirely -- signals brutalist/editorial, wrong vibe (R3)

### Animation Timing & Easing

**Spring physics are now the standard** for all physical-property animations (position, scale, rotation). CSS ease reserved for non-physical properties (opacity, color). Recommended library: **Motion (formerly Framer Motion)** for React (R3).

| Animation | Duration | Easing | Source |
|-----------|----------|--------|--------|
| Video swipe transition | 300-400ms | Spring (stiffness: 300, damping: 30) | R1 + R3 |
| Button press (down) | 100-150ms | ease-out, scale to 0.95 | R3 |
| Button release | 200-300ms | Spring (stiffness: 300, damping: 15) | R3 |
| Heart pop (double-tap) | 600-800ms | Custom keyframes with overshoot: scale 0->1.2->0.95->1.05->1 | R3 |
| Fade overlay | 200-300ms | ease-in-out | R3 |
| Toast appear/dismiss | 200ms / 150ms | ease-out / ease-in | R3 |
| Icon state change | 200-300ms | Spring (stiffness: 400, damping: 20) | R3 |
| Overlay auto-hide | After 3-5 seconds inactivity | fade-out | R2 (5s), R3 (3s) |
| Chat bubble auto-fade | 5-8 seconds | fade-out | R2 |

**Heart animation recipe** (R3): Appears at tap coordinates, scales 0->1.2->0.95->1.05->1, holds briefly, fades out. Total ~800ms. Color: `#FE2C55`. Size: ~80px.

**Loading state** (R3): Skeleton shimmer -- dark gray placeholder (`#1a1a1a`) with animated gradient shimmer (`#2a2a2a` sweep, 1.5s infinite). Between videos: subtle blur of previous video + centered pulsing ring.

### Glassmorphism / Overlay Specs

**Apple's Liquid Glass (WWDC 2025) validated glassmorphism at the highest level** (R3). Projected to "fully replace Flat Design around 2026-2027."

```css
.glass-panel {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}
```

**Performance note** (R3): `backdrop-filter` is GPU-intensive on mobile. Use sparingly for temporary overlays (modals, toasts, bottom sheets), NOT permanent UI elements.

**Grain/noise texture** (R3): 3-5% opacity noise on dark backgrounds and glass panels adds sophistication. "In 2025, if your gradient doesn't have grain, it reads as unfinished."

---

## 2. LAYOUT & INTERACTION (for Lovable prompts)

### Roulette Overlay Layout

All 3 researches converge on the TikTok overlay architecture. Exact positioning:

**Top bar** (R2):
- Height: 44-56px
- Contents: Back arrow, red "LIVE" pill badge, viewer count with eye icon
- Background: `linear-gradient(rgba(0,0,0,0.6), transparent)`

**Right-side action stack** (R1 + R2 + R3):
- Position: Right edge, vertically centered, ~16px from right edge (R3)
- Icon size: 40-48px circular (R2), 32-36px visual / 48px touch target (R3)
- Background per icon: `rgba(0,0,0,0.3)` + `backdrop-filter: blur(8px)` (R2)
- Spacing: 16-20px gap (R3), 20px between icons (R2)
- Label below each icon: 10px, white, regular weight (R2)
- Rationale: Natural right-thumb reach zone for 67% (R2) to 90% (R1) of users

**Bottom-left info block** (R2 + R3):
- Model name: 20px bold white (R2), 15-17px bold (R3)
- Tags: 11px medium ALL-CAPS (R2)
- Description: 13-14px, max 2-3 lines, truncated (R3)
- Semi-transparent gradient background

**Bottom CTA bar** (R2):
- Fixed position, 16px from bottom edge, centered
- Primary conversion button + optional chat input
- Highest-comfort thumb zone area

**Chat overlay** (R2 + R3):
- Position: Bottom-left, messages float upward
- Style: Semi-transparent pill-shaped bubbles
  ```css
  background: rgba(0,0,0,0.4);
  border-radius: 16px;
  padding: 4px 12px;
  ```
- Auto-fade after 5-8 seconds (R2)
- Maximum 3-5 visible messages (R2)

**Critical rule** (R2): Never exceed 30% screen coverage with UI elements. Video is king. Auto-hide overlays after 3-5 seconds of inactivity; tap anywhere to toggle visibility.

**Safe zones** (R1): Keep key content at least ~10-15% above the bottom edge to avoid caption bar overlap. Top-notch phones have ~30-40pt safe inset at top.

### CTA Button Specs

**Primary CTA (bottom-center, persistent)** (R2):
- Text: "Watch Her Live -->" (personalized with model reference)
- Background: `#FF1744` solid fill
- Text style: `#FFFFFF`, 16px, Bold, ALL-CAPS, `letter-spacing: 0.04em`
- Size: 56px height x 85% screen width
- Shape: Pill (`border-radius: 28px`)
- Shadow: `0 4px 12px rgba(255,23,68,0.4)`
- Position: Fixed, 16px from bottom edge, centered
- Behavior: Fades in after user has watched current model for 60+ seconds; auto-hides with other overlays on inactivity; reappears on tap

**Secondary CTA (bottom-center, contextual)** (R2):
- Text: "Enter Free" or "Join 2,341 Viewers"
- Background: `rgba(255,255,255,0.15)` with `1.5px border rgba(255,255,255,0.3)`
- Text style: `#FFFFFF`, 14px, Semi-bold
- Size: 44px height x 70% screen width
- Shape: Pill (`border-radius: 22px`)
- Appears above primary CTA only after 3+ minutes of engagement

### Right-Rail Action Icons

Specific icons from R2 + R3:
- **Tip** (dollar/coin icon)
- **Like/Heart** (outlined, fills `#FE2C55` on tap)
- **Private** (lock icon)
- **Share** (arrow icon)

Specs:
- Size: 44px diameter circles (R2)
- Background: `rgba(0,0,0,0.3)` + `backdrop-filter: blur(8px)` (R2)
- Icons: 24px, white, with drop shadow (R2)
- Label below each: 10px, white, regular weight (R2)
- Spacing: 20px between icons (R2)
- Position: Right edge, vertically centered (R2)

### Bottom Gradient Overlay CSS

R3 provides the most detailed gradient (3-stop, heavier at bottom for guaranteed text readability):

```css
.video-overlay-bottom {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.5) 40%,
    rgba(0, 0, 0, 0.0) 100%
  );
  height: 35vh;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}
```

R1 references TikTok's gradient as ~50% black at the bottom, fading to transparent. R2 describes it as `linear-gradient(transparent 0%, rgba(0,0,0,0.6) 100%)`. R3's version is the most production-ready (stronger at bottom for white text contrast, lighter overall to avoid crushing video).

### Swipe Gesture Specs

**Threshold** (R1 -- from TikTok-style scroller implementations):
- Distance: ~20% of screen height OR
- Velocity: ~2000 px/s (fast flick succeeds even with less distance)
- If below threshold: snap back with rubber-band effect

**Animation** (R1 + R3):
- Duration: 300-400ms
- Easing: Spring (stiffness: 300, damping: 30)
- Style: Vertical slide (not crossfade) -- old video slides out, new slides in
- Content starts playing immediately as it is revealed

**Haptic feedback** (R1 + R3):
- Short tap vibration when swipe transition completes
- Light vibration on snap-back (rejected swipe)
- Haptic tick on double-tap like

**CSS scroll-snap approach** (R3 -- simplest performant implementation):
```css
.video-container {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}
.video-item {
  height: 100vh;
  scroll-snap-align: start;
  position: relative;
}
```
Combine with `react-swipeable` (675K+ weekly npm downloads) for gesture detection and Intersection Observer for auto-play/pause.

### Start Screen / Onboarding

**Instant content on first launch** (R1 + R2):
- No mandatory tutorial, login gate, or registration before viewing
- Splash screen (if any) < 1-2 seconds, with first stream preloading behind it
- First performer should be popular/engaging to hook immediately ("best stuff first" -- R1)
- Show content within 3 seconds of landing (R2)

**Contextual hints** (R1):
- First hint (double-tap to like) appears after ~8 seconds of viewing
- Subtle arrow animation for "swipe up for next" disappears after a couple swipes
- Login prompts only when user tries to comment, follow, or save -- never on open
- After first like: feedback message ("We'll show you more like this")

**Age verification** (R2):
- Single-tap "I am 18+" branded button on first visit
- Styled consistently with app design (not a jarring modal)
- Remember via cookie for 30+ days
- Never multi-step verification for free browsing

### Gender Filter Placement

Per CLAUDE.md: Everyone / Female / Male / Trans / Couples -- free, no gate. Place in the header area or as a horizontal tab row. Must be accessible but not dominating -- consistent with "barely-there UI" principle (R3). Auto-hide with other overlays on inactivity.

---

## 3. CONTENT PAGES (for Lovable prompts)

### Model Page Layout Recommendations

From R2 + R3 + CLAUDE.md architecture:

- **Dark UI** (`#000000` / `#1A1A1A` background) matching the roulette aesthetic
- **Full-width live embed** when model is online (same embed system as roulette)
- **Offline state:** CTA + similar models + "watch similar on roulette"
- AI-generated bio: 300-500 words, SEO-optimized
- Tags, categories, viewer stats from Chaturbate API
- Related models section (5-8 with overlapping categories)
- **Gradient overlays** (not solid bars) behind text -- consistent with roulette
- **Same font family** (Inter), same text sizes, same icon style
- Chaturbate embed lazy-loaded (not in initial HTML)
- Target: < 2 second full page load on mobile

### Blog Post Page Layout Recommendations

- 1,500-2,500 words, AI-generated
- Dark background matching site theme
- Proper heading hierarchy (H1 + H2s + H3s)
- Heavy internal linking to model pages (~1 link per 100 words)
- Featured model embeds inline (lazy-loaded)
- Same typography system as roulette/model pages
- CTA placement: inline after key sections + bottom of page
- Schema markup: Article with headline, author, datePublished, image

### Blog Listing/Hub Page Recommendations

- Category hub pages (`/latina-cams`, `/asian-cams`, etc.)
- Auto-generated grids of all active models in category
- Re-rendered when models added/removed
- CollectionPage schema markup
- Grid layout with hover-to-preview thumbnails (borrowed from StripChat per R3)
- Dark theme, same visual language

### Brand Cohesion Across All Page Types

From R2: "The click-through to the cam site must feel like continuing the experience, never like leaving it."

- Identical color palette across roulette, model pages, blog posts, and category hubs
- Same font family (Inter), same text-shadow treatment, same icon library
- Same glassmorphism language for modals/overlays
- Same gradient overlay treatment for text over images/video
- Same CTA button style (pill, red, same dimensions)
- Deep links from content pages land users on exact model rooms (not generic homepage)
- Match visual branding between roulette app and white-label site
- Shared CSS custom properties (theme.css) across all page types

---

## 4. CONVERSION PSYCHOLOGY (for CLAUDE.md updates)

### Timing Framework for CTAs

From R2 (the most detailed timing research):

| Session Phase | Timing | What to Show | Rationale |
|---|---|---|---|
| **0-30 seconds** | Nothing | Let user experience first match freely | Build value first |
| **30-60 seconds** | Soft signals only | Viewer count, "LIVE" indicator | Social proof, no ask |
| **1-2 minutes** | Curiosity builders | Activity feed ("X just tipped") | Create curiosity about interaction |
| **2-3 minutes** | First CTA | "Want to chat with her? Enter free -->" | User has demonstrated engagement |
| **3-5 minutes** | Social pressure | "She's popular -- 2,341 viewers" | Urgency + social proof |
| **5+ minutes** | Direct | "See her full show -- Free" | User is clearly invested |
| **Return visit** | Personalized | "Welcome back! [Model] is live now" | Leverage prior engagement |

**Key data points:**
- Timing prompts to peak-value moments yields **2-3x better conversion** vs static placement (Elena Verna, ex-Dropbox)
- Users who achieve at least one meaningful outcome are **5x more likely to convert** (Totango)
- Reducing to a single CTA increased conversion by **266%** in controlled testing
- Emails with a single CTA increase clicks by **371%**

### CTA Copy Recommendations (Ranked)

From R2 (ranked by likely effectiveness for cam roulette click-through):

1. **"Watch Her Live -->"** -- Action-oriented, personal ("her"), implies immediacy. Best as primary CTA on model overlay.
2. **"Enter Free"** -- Eliminates cost objection, action verb, extremely low commitment.
3. **"See Full Show"** -- Curiosity gap; implies they're seeing a partial version.
4. **"Join 2,341 Viewers"** -- Social proof and action combined.
5. **"Continue Watching"** -- Implies continuity, nearly zero friction. Best for session timeout or back-button intercept.

**Avoid:** "Click Here," "Sign Up Now," "Register" (too transactional), "Buy Tokens" (way too early), "Visit [SiteName]" (breaks experience framing).

**Key principle:** Frame the CTA as continuing the experience, not starting a transaction. Personalized CTAs convert **202% more** than untargeted (HubSpot). Action verbs saw **122% increase**. Lower-commitment language beats transactional (111.55% lift changing "Book a Demo" to "Get Started").

### Social Proof Elements

From R2:
- Real-time viewer counts ("2,341 watching") -- increases conversions by **up to 22%**
- Activity feeds ("UserXYZ just tipped 500 tokens") -- normalizes spending behavior
- Tip goal progress bars (gamified collective action)
- "Just joined" toast notifications
- Trending/popular badges on model thumbnails
- When transitioning to cam site: "Join 2,341 viewers watching [Model]" maintains momentum

**93% of consumers** read reviews before purchasing; social proof increases purchase likelihood by **270%** (CrazyEgg).

### Parasocial Bonding Insights

From R2:
- Live streaming creates "one-and-a-half sided" relationships -- stronger than traditional one-sided parasocial bonds because performer can respond
- People rate parasocial relationships with creators as *more effective at fulfilling emotional needs* than in-person acquaintances (Nature study)
- Viewers who feel connection develop loyalty "often involving financial support"
- **The roulette format accelerates this:** Brief encounters create micro-connections, being rotated away triggers **loss aversion** -- user *needs* to get back
- The **Zeigarnik Effect** (people remember uncompleted experiences 2x better) creates open loops that registration resolves
- Tinder exploits this with blurred likes, driving **~8% conversion to Gold** at $20/month

### What NOT to Do

**Design antipatterns** (R2 + R3):
- Any popup, interstitial, or overlay before user sees live content (including splash screens, mandatory registration, aggressive age gates, ad walls)
- Multiple competing CTAs simultaneously ("Sign Up" + "Watch Live" + "Get Tokens")
- Fake urgency: countdown timers that reset, fake "someone in your area" notifications, fabricated scarcity
- Sound auto-playing without consent (start muted always)
- Light/white UI themes (eye strain, signals amateur/dated)
- Desktop-first design (95%+ mobile traffic)
- Aggressive monetization before value delivery (no token displays, upgrade badges, or premium gating before 2+ minutes)
- Banner/display ads (86% banner blindness, 0.05% CTR)
- Excessive on-screen text (R1)
- Progress bars or replay indicators (R1 -- live streams are continuous, not fixed-length)
- Solid-color navigation bars (R3 -- use frosted glass or transparent)
- Filled/heavy icons over video (R3)
- CSS ease for interactive animations (R3 -- feels "robotic" vs spring)
- Neumorphism (R3 -- declining, wrong aesthetic)
- Pure `#000` background with pure `#FFF` text (R3 -- creates halation)

**Trust killers** (R2): Excessive popups, misleading redirects, cluttered outdated design, no HTTPS, fake location notifications, hidden pricing, broken UI elements.

---

## 5. ENGAGEMENT SIGNALS (for CLAUDE.md updates)

### Like/Heart Mechanics

**Double-tap to like** (R1 + R3):
- Standard gesture from TikTok
- Heart appears at tap coordinates, scales 0->1.2->0.95->1.05->1, fades out in ~800ms
- Color: `#FE2C55` (hot pink), size ~80px
- Haptic tick on registration
- Introduce contextually: show faint heart icon or tooltip "Double-tap to like" after ~8 seconds of watching (R1)
- After first like, pop feedback: "We'll show you more videos like this" (R1)
- Icon on right-rail toggles from outlined to filled on like

### What Signals to Track

From CLAUDE.md (already defined) + R2 additions:

| Signal | Strength | How |
|---|---|---|
| Watch < 2s then skip | Negative | JS timer |
| Watch 2-10s | Neutral | JS timer |
| Watch 10-30s | Positive | JS timer |
| Watch 30+ seconds | Strong positive | JS timer |
| Double-tap like | Strong positive | Tap event |
| Click "Enter Room" CTA | Strongest positive | Click event |
| Gender filter selection | Explicit preference | Filter change |
| Swipe velocity | Engagement signal | Fast = browsing, slow = considering |
| Return visit to same model | Retention signal | Session comparison |
| Time of day patterns | Context signal | Event timestamps |

### Micro-Interactions That Boost Engagement

From R2: Well-designed micro-interactions increase conversion by **up to 40%**, engagement by **27%**, and button CTR by **up to 45%**.

Specific implementations:
- **Pulsing red "LIVE" indicator** -- draws eye without distracting
- **Haptic feedback on swipe-to-next** -- reinforces interactivity
- **Smooth zoom/fade transitions** entering a room (not abrupt page changes)
- **Heart-burst animation on double-tap** -- rewards engagement
- **Animated tip effects** visible to all viewers -- normalizes tipping
- **Button states with hover/tap effects** -- scale to 0.95 on press, spring back on release
- **Swipe snap-back** with rubber-band effect for rejected swipes
- **Skeleton shimmer loading** -- dark gray with animated gradient sweep
- **Counter animations** with `tabular-nums` so numbers don't shift width
- **Subtle grain texture** (3-5% opacity) on gradients and glass (R3)

---

## 6. NUMBERS & BENCHMARKS (for CLAUDE.md updates)

### Specific Metrics

**Transition & Load Times:**
- Swipe animation: 300-400ms (R1 + R3)
- Swipe trigger threshold: ~20% screen height or ~2000 px/s velocity (R1)
- Stream start time: under 2 seconds from swipe to live video (R2)
- Time to Interactive: under 2.5 seconds (Google Core Web Vitals LCP) (R2)
- Initial page weight: under 500KB; defer non-critical JS (R2)
- First content visible: within 3 seconds of landing (R2)
- Splash screen (if any): under 1-2 seconds (R1)
- WebRTC interactive latency: under 1 second (R2)

**Bounce Rate Data:**
- Sites loading < 2s: **9% average bounce rate** (Pingdom) (R2)
- Sites loading 5s: **38% bounce rate** (R2)
- Bounce probability: +32% at 3s, +90% at 5s, +123% at 10s vs 1s (Google/SOASTA) (R2)
- 53% of mobile users leave if loading > 3 seconds (Google) (R2)
- Each additional second drops conversion by **4.42%** (Portent) (R2)
- 0.1s improvement in mobile speed reduced bounce by **8.3%** (Deloitte) (R2)

**Conversion Benchmarks:**
- SaaS freemium: 2-5% (R2)
- Mobile gaming: 0.5-2% (R2)
- Dating apps: ~8% (R2)
- Top cam affiliate SEO traffic: 8-10% (R2)
- Mobile e-commerce: 1.3-2% (R2)
- Desktop e-commerce: 2.5-3.5% (R2)
- Live stream shopping: up to 30% (R2)
- Single CTA improvement: +266% (R2)
- Red CTAs vs green: +21% clicks (HubSpot via R2)
- Personalized CTAs: +202% (HubSpot via R2)

**Engagement Stats:**
- TikTok users: ~46 min/day, ~180 videos (R1)
- 75% of mobile interactions are thumb-driven (R2)
- 49% of users hold phone with one hand (R2)
- 82% of mobile users prefer dark mode (Nielsen Norman via R3)
- 75% judge credibility on visual design alone (Stanford/CXL via R2)
- 94% of first impressions are design-related (CXL via R2)
- Users form aesthetic judgments in 50 milliseconds (Google via R2)
- 86% of users exhibit banner blindness (Infolinks via R2)

**Mobile Traffic:**
- Pornhub: ~96% mobile (Statista 2024 via R2)
- General adult content via smartphone: >65% (R2)
- Android: 67.7% of mobile traffic, iOS: 33.1% (R2)

### Performance Targets (consolidated)

| Metric | Target | Source |
|--------|--------|--------|
| Time to first stream playing | < 2 seconds | R2 |
| Swipe-to-next-stream latency | < 1 second perceived | R1 |
| Page weight (initial) | < 500KB | R2 |
| LCP (Largest Contentful Paint) | < 2.5 seconds | R2 |
| Animation frame rate | 60fps minimum, 120fps on capable | R3 |
| Overlay auto-hide | 3-5 seconds inactivity | R2/R3 |
| Pre-buffer | Next 1-2 streams always ready | R2 |
| WebRTC latency | < 1 second | R2 |
| Content page load (model/blog) | < 2 seconds on mobile | CLAUDE.md |

---

## 7. CONFLICTS & DISAGREEMENTS BETWEEN RESEARCHES

### 1. Primary Background Color: `#000000` vs `#121212`

- **R2** recommends `#121212` (Material Design recommendation to avoid harsh contrast on non-OLED screens)
- **R3** recommends `#000000` (true black, OLED-optimized, battery savings)
- **R3 also notes:** The trending 2025-2026 shade is "tinted dark" (`#0A0A12` deep blue-black) to reduce halation on white text

**Recommendation:** Use `#000000` for the video area (maximizes video contrast, saves OLED battery) and `#1A1A1A` for elevated surfaces/cards (both researches agree on this). The video IS the interface, so true black behind video makes sense. For non-video pages (blog, model profiles), consider `#0A0A12` tinted dark per R3's trend guidance.

### 2. Primary Accent Color: `#FE2C55` vs `#FF1744`

- **R2** recommends `#FF1744` (Material Design vibrant red -- "passion, urgency, desire")
- **R3** recommends `#FE2C55` (TikTok's hot pink -- "blends TikTok familiarity with Cherry.tv aesthetic")

**Recommendation:** Use `#FE2C55` (TikTok hot pink). The product IS a TikTok-style roulette -- users will subconsciously associate the familiar accent with the familiar UX pattern. It's also slightly warmer/more playful than Material red, which suits an entertainment/adult context better than a corporate one. The difference is subtle (both are vibrant pinkish-red) but `#FE2C55` has stronger brand alignment with the product concept.

### 3. Online/Success Indicator: `#00F891` vs `#00C853`

- **R2** recommends `#00C853` (standard Material green, "go" association)
- **R3** recommends `#00F891` (neon green, fits "Neon Minimal" trend)

**Recommendation:** Use `#00F891` (neon green). Consistent with the overall neon-accent-on-dark design language. `#00C853` is a perfectly fine green but reads more "corporate Material" than "premium entertainment."

### 4. Secondary Text Opacity: 0.7 vs 0.6

- **R2** uses `rgba(255,255,255,0.60)` for secondary text
- **R3** uses `rgba(255,255,255,0.7)` for secondary text

**Recommendation:** Use `rgba(255,255,255,0.7)` for body text/descriptions. It provides slightly better readability on dark backgrounds over video content, which is more important than strict Material Design compliance. Use `rgba(255,255,255,0.5)` for truly tertiary content (timestamps, captions) per R3.

### 5. Overlay Auto-Hide Timing: 3 seconds vs 5 seconds

- **R2** says auto-hide overlays after 5 seconds of inactivity
- **R3** says auto-hide after 3 seconds ("visible on interaction, fades after 3 seconds")

**Recommendation:** Use **5 seconds for the roulette** (users are watching live video and may not interact for longer periods -- 3 seconds is too aggressive and would frustrate users who want to glance at info). The CTA is the exception: it should persist longer or reappear on interaction. **3 seconds** is fine for model/blog content pages where overlays are less critical.

### 6. Bottom Gradient Strength

- **R1** references TikTok's gradient as ~50% black at bottom, lighter than Instagram
- **R2** describes `rgba(0,0,0,0.6)` at bottom
- **R3** provides a 3-stop gradient: 85% at 0%, 50% at 40%, 0% at 100% over 35vh

**Recommendation:** Use R3's 3-stop gradient. It's the most production-ready specification and provides the strongest text readability guarantee while still being lighter in the mid-range to avoid crushing the video. The 35vh height ensures text in the bottom third is always legible regardless of video content.

### 7. CTA Button Height: 44-48px (R3) vs 48-56px (R2)

- **R2** specifies 48-56px height for primary CTA, 56px in the detailed spec
- **R3** specifies 44-48px height

**Recommendation:** Use **48px as default, 56px for the primary "Watch Her Live" CTA** on the roulette screen. The roulette's primary CTA should be prominent (R2's larger spec) since it's the conversion driver. Secondary CTAs and buttons on content pages can use 44-48px (R3's spec). All touch targets should maintain 48px minimum tap area regardless of visual size.

### 8. Icon Column Spacing: 16-20px (R3) vs 20px (R2)

- **R3** says 16-20px gap between right-rail icons
- **R2** says 20px between icons

**Recommendation:** Use **20px**. Both sources include it in their range. Slightly more generous spacing reduces accidental taps on adjacent icons, which matters on a full-screen video interface where precision is lower.

### 9. No Real Disagreements on Core Principles

All 3 researches strongly agree on:
- Full-screen video with minimal overlay UI
- Dark theme (non-negotiable)
- TikTok-style vertical swipe with spring physics
- Right-rail action icons in thumb zone
- Bottom gradient for text readability
- Content-first onboarding (no gates)
- Variable-ratio reinforcement (slot machine psychology)
- Single CTA per screen
- Behavioral timing over static placement
- Pre-buffering next streams
- Outlined icons > filled for overlay
- Spring animations > CSS ease for physical properties
- Mobile-first always

The disagreements are all in specific implementation values (hex codes, pixel values, timing) rather than directional decisions. The overall design vision is remarkably consistent across all three documents.

---

## Quick Reference: Recommended Final Values

```
Background (video):     #000000
Background (surfaces):  #1A1A1A
Background (tinted):    #0A0A12  (content pages)
Primary accent:         #FE2C55  (CTAs, hearts, likes)
Secondary accent:       #00F0FF  (info, highlights)
Gold/VIP:               #FFD740
Purple/social:          #BB86FC
Success/online:         #00F891
Text primary:           #FFFFFF
Text secondary:         rgba(255,255,255,0.7)
Text tertiary:          rgba(255,255,255,0.5)
Glass border:           rgba(255,255,255,0.08)
CTA glow:               rgba(254,44,85,0.4)

Font:                   Inter
Primary CTA:            56px h, 85% w, pill, #FE2C55, bold 16px ALL-CAPS
Secondary CTA:          44px h, 70% w, pill, rgba(255,255,255,0.15)
Icon size:              32-36px visual, 48px touch target
Icon spacing:           20px gap
Corner radius:          20-24px cards, 12-14px buttons, pill CTAs, circle avatars

Swipe threshold:        20% screen height or 2000 px/s
Swipe animation:        300-400ms, spring(300, 30)
Heart animation:        800ms, scale 0->1.2->0.95->1.05->1
Overlay auto-hide:      5 seconds (roulette), 3 seconds (content pages)
Stream preload:         Next 1-2 streams buffered
Page load target:       < 2 seconds
LCP target:             < 2.5 seconds
Initial bundle:         < 500KB
```
