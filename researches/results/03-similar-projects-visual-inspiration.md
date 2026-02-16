# Visual design blueprint for a TikTok-style cam roulette app

**No live cam platform has implemented a TikTok-style vertical swipe interface — this is a genuine whitespace opportunity.** The ideal design merges TikTok's full-screen overlay UX with Cherry.tv's modern cam-site aesthetic and spring-physics interactions that feel native to 2025-2026 mobile standards. Below is a comprehensive design research report spanning cam sites, mainstream apps, visual specifications, open source code, and current trends — everything needed to build a premium, addictive experience.

---

## 1. Modern cam sites are ripe for disruption

The cam industry is stuck in a 2010s grid-browse paradigm. After analyzing six major platforms, **not a single one offers vertical swipe discovery**. This makes a TikTok-style roulette app a first-mover play. Here's what each site reveals:

**Cherry.tv**
- Visual style: Black background with vibrant pink/purple accents. The most modern cam site — feels like a dating app crossed with a gaming platform. Sans-serif typography, no ads, clean layout.
- What works: Gamification (levels, challenges, rewards), carousel content discovery, fan clubs, social media–style follow system, ad-free clean interface
- What doesn't work: Smaller model pool; can overwhelm first-time users with feature density
- Steal this: **The black + pink/purple color scheme, gamification system, and "dating app meets streaming" identity** — proof that Gen-Z design works in this space

**StripChat**
- Visual style: Deep charcoal (#1a1a2e) with warm red/pink accents. "Modern nightclub" mood. Clean sans-serif typography, sophisticated dark UI.
- What works: Advanced multi-filter search, hover-to-preview thumbnails, VR category, well-spaced responsive grid, polished mobile layout
- What doesn't work: Still a traditional grid-browse model; left sidebar feels heavy on mobile; token purchase UI is generically "adult site"
- Steal this: **The multi-filter search system and dark UI color scheme** that makes video thumbnails pop

**Chaturbate**
- Visual style: Light/white background with blue/orange links. Visually the most dated — early-2010s web aesthetic. No dark mode. Allows limited HTML customization creating MySpace-era visual chaos.
- What works: Sheer scale, zero-friction free viewing (no registration required), robust tagging
- What doesn't work: Entire visual design feels 10-15 years behind; no responsive CSS support for bios; overwhelming wall of thumbnails
- Steal this: **The tip goal progress bar** (communal gamification mechanic) and zero-friction entry

**CamSoda**
- Visual style: Pink and blue "girlish and dreamy" palette. Mobile-first since 2014 — the lightest and most playful of the group.
- What works: Mobile-first DNA makes it load fast; gamification elements (Spin the Wheel, dice games, slot machine); WYSIWYG bio editor
- What doesn't work: Color scheme can feel juvenile; unregulated tagging creates inconsistency; aggressive upsells
- Steal this: **Gamification mechanics (spin wheel, dice games)** and mobile-first architecture philosophy

**Flirt4Free**
- Visual style: Premium and polished — rich tones, high-quality photography, "upscale lounge" positioning.
- What works: State-of-the-art UI per reviewers; "Show Offer" (user-proposed pricing, Uber-style negotiation); prominent VIP program; automatic 24-hour replay; cam-to-cam on mobile
- What doesn't work: Smaller model pool (~400-600 online); premium pricing feels exclusionary; still follows grid patterns
- Steal this: **The "Show Offer" negotiation mechanic and the proof that better UX justifies premium pricing**

**BongaCams**
- Visual style: Mixed light/dark with orange accent. Functional and utilitarian — designed for efficiency, not beauty. 30+ language support.
- What works: Comprehensive navigation, 2024 mobile profile redesign with modern styling, ℹ️ quick-access performer profiles during streams
- What doesn't work: Notorious aggressive advertising and pop-ups; cluttered homepage; doesn't feel premium
- Steal this: **The ℹ️ in-stream performer info access** — view details without leaving the video

**Key insight from cam site analysis:** Cherry.tv's design philosophy (gaming + social + dark aesthetic) is the closest to our target, but even it uses traditional grid/carousel browse. The **recommended design direction combines Cherry.tv's aesthetic with CamSoda's mobile-first DNA, Chaturbate's tip gamification, and TikTok's swipe mechanic**.

---

## 2. TikTok and its peers define the overlay UI gold standard

Seven mainstream apps reveal the exact interaction patterns needed. The convergence across all of them points to a clear design system.

**TikTok — the blueprint**
- Visual style: Dark-dominant, minimal chrome. The video IS the interface. Bottom gradient (~30-40% black opacity) ensures text legibility in the lower third. White icons with subtle drop shadows float over everything.
- Overlay approach: No solid backgrounds on the feed screen. Icons are **outlined/line-art style** (not filled) to reduce visual weight. Right-sidebar icon column positioned for right-thumb one-handed use.
- Layout: "For You | Following" tabs top-center; **right sidebar** with profile avatar, heart, comment, bookmark, share, spinning music disc — icons ~40-44pt, spaced ~24px apart, 16px from right edge; **bottom-left** shows username (bold), description (2-3 lines), music ticker with marquee; bottom nav with frosted glass.
- Micro-interactions: Double-tap heart (scales up from tap point, floats upward, fades in ~800ms with spring overshoot). Swipe uses spring physics with velocity-aware snapping (~300-400ms with slight bounce). Long-press pauses with haptic. Swipe left opens creator profile.
- Steal this: **The bottom gradient technique** — `linear-gradient(transparent 0%, rgba(0,0,0,0.6) 100%)` covering bottom 35% of viewport. Combined with white text + text-shadow, it makes ALL overlay text readable regardless of video content.

**YouTube Shorts — the refined follower**
- Visual style: Mirrors TikTok but with Material Design DNA. Recent 2025 update switched sidebar icons from filled to **hollow/outlined** for cleaner look. YouTube red accent used sparingly.
- What works: Frosted glass bottom nav bar with `backdrop-filter: blur(20px)`. The icon style switch validates that outlined > filled for overlay UI.
- What doesn't work: Right sidebar more cluttered (6+ items vs TikTok's 5). Feels "bolted on" — less fluid transitions than TikTok.
- Steal this: **The frosted glass/backdrop-blur bottom navigation** — maintains spatial awareness while providing clear navigation.

**Instagram Reels — the heaviest overlay**
- Visual style: More curated, higher visual density. More text and UI elements than TikTok.
- What works: Inline profile photo + username + follow button cluster in bottom-left. Audio attribution linking to original sound.
- What doesn't work: Most cluttered of the three — dense bottom area with profile pic, username, follow, caption, hashtags, audio all overlapping. Interstitial ads are jarring.
- Steal this: **The inline profile photo + username + follow button cluster** — shows performer avatar, name, and action without leaving video.

**Tinder — the swipe pioneer**
- Visual style: Warm coral gradient (#FE3C72 to #FF6B6B). Full-bleed photo cards with bottom gradient for name/age. Action buttons below card.
- What works: Card rotation that follows swipe direction (tilts up to ~20°). "LIKE/NOPE" stamps appear as visual feedback before release. Stacked card depth effect creates anticipation. Spring snap-back at ~300ms with slight bounce.
- Steal this: **The intent-feedback overlay stamps** — show "SKIP" or "CONNECT" as user begins swiping for clear visual feedback before action completes.

**Bumble — the polished alternative**
- Visual style: Warm yellow (#FFC629) on clean white. More information-dense cards than Tinder.
- What works: Background video tutorial on first launch teaches UI without explicit instructions. Tap-to-cycle photos within a card with progress bar. Interest badge chips for quick decisions.
- Steal this: **Tap-to-cycle between video feed and profile info** — toggle between live video and a profile overlay card.

**BIGO Live — the maximalist streamer**
- Visual style: Vibrant, busy, Asian-market influenced. Heavy gradients (pink/purple/blue), animated gift effects, multiple overlapping layers. Gold and pink for premium elements.
- What works: Virtual gift economy creates vibrant interaction. Live chat bubbles scrolling up from bottom-left feel spatially intuitive (like bubbles rising). TikTok-style vertical swipe between live streams in discovery.
- What doesn't work: Extremely cluttered — gift animations completely obscure streamers. Casino-like monetization density alienates Western users.
- Steal this: **Scrolling live chat overlay** — semi-transparent pill-shaped bubbles at bottom-left: `background: rgba(0,0,0,0.4); border-radius: 16px; padding: 4px 12px;` with auto-scroll and 5-second fade.

**Ome.tv / Chatroulette — closest to our use case**
- Visual style: Functional, utilitarian, dated. Dark theme for video chat. Basic flat buttons. Minimal overlay.
- What works: Single-focus simplicity — one screen with video + controls. PIP self-view in corner. One-tap "Next" to cycle. No account required.
- What doesn't work: No transitions between connections (abrupt cuts). No gradient overlays, no animations, no haptic feedback. Massive design gap vs modern app standards.
- Steal this: **The core mechanic itself** — one-tap "Next" to instantly cycle — must be preserved but elevated with TikTok-quality UI.

### Universal patterns across all apps

Every successful full-screen video app shares these non-negotiable patterns: **bottom-to-top gradient overlay** (transparent → 30-60% black over bottom 25-35%); **right-sidebar vertical icon column** for one-handed use; **outlined icons over filled** to reduce visual weight; **spring-based swipe physics** not duration-based easing; **white text + drop shadow + bottom gradient** as the "readability trinity"; and **haptic feedback** on key actions. The difference between amateur and professional is entirely in these micro-details.

---

## 3. Exact visual specifications for every design element

### Color system

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#000000` | True black (OLED optimized) |
| `--bg-elevated` | `#1A1A1A` | Elevated surfaces, cards |
| `--bg-overlay` | `rgba(0,0,0,0.6)` | Glass panels over video |
| `--accent-primary` | `#FE2C55` | Hearts, likes, primary CTAs (TikTok's hot pink) |
| `--accent-secondary` | `#00F0FF` | Info highlights, secondary actions (electric cyan) |
| `--accent-success` | `#00F891` | Online indicators, success states |
| `--text-primary` | `#FFFFFF` | Headlines, usernames |
| `--text-secondary` | `rgba(255,255,255,0.7)` | Body text, descriptions |
| `--text-tertiary` | `rgba(255,255,255,0.5)` | Captions, timestamps |
| `--border-subtle` | `rgba(255,255,255,0.08)` | Glass panel borders |

The **2025-2026 dominant trend is "Neon Minimal"** — neon used as micro-glow accents against dark surfaces, not as primary colors. One dominant neon accent + one secondary accent + neutral dark base. Hot pink (`#FE2C55`) as primary action + cyan (`#00F0FF`) as secondary/info creates a palette that blends TikTok familiarity with Cherry.tv's proven cam-site aesthetic.

**Gradient overlay for text on video (critical):**
```css
.video-overlay-bottom {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.5) 40%,
    rgba(0, 0, 0, 0.0) 100%
  );
  height: 35vh;
}
```

### Typography

**TikTok Sans** (custom font released May 2023, available free on Google Fonts under SIL OFL 1.1) is purpose-built for mobile video readability with larger openings, clearer strokes, and increased line height. The best Google Fonts alternatives are **Inter** (clean, modern, excellent screen readability) and **Plus Jakarta Sans** (geometric, friendly).

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Username | **15-17px** | Bold (700) | White + text-shadow for readability |
| Description | 13-14px | Regular (400) | Max 2-3 lines, truncated with "…more" |
| Counter numbers | 12-13px | Semibold (600) | Below right-side icons |
| CTA button text | 15-16px | Bold (700) | On accent-colored pill buttons |
| Tab bar labels | 10-11px | Medium (500) | Below nav icons |

Text shadow for all overlay text: `text-shadow: 0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.3)`. Long usernames truncate with ellipsis after ~15 characters. Music/sound labels use horizontal scrolling marquee.

### Icons and buttons

The 2025 standard is **outlined icons for default state, filled for active/selected** — TikTok has always used this, YouTube Shorts explicitly switched to it in 2025. Icon stroke weight: **1.5-2px at 24px icon size**. Best libraries: **Phosphor Icons** (most versatile with multiple weight options) or **Lucide** (cleaner, more minimal).

TikTok's right-side column specs: icon visual size **32-36px**, touch target **48×48px**, vertical spacing **16-20px gap**, positioned **~16px from right edge**. Touch target minimums per WCAG 2.2: **24×24px** (Level AA), **44×44px** (Apple HIG), **48×48px** (Material Design).

CTA buttons: pill/capsule shape with `border-radius: 9999px`, height **44-48px**, padding `12px 24px`. Primary CTA uses accent color with white text. Secondary uses `rgba(255,255,255,0.15)` with 1px white border at 20% opacity.

### Animations and timing

**Spring physics are now the standard** for all physical property animations (position, scale, rotation) in 2025. CSS ease is reserved for non-physical properties (opacity, color). Apple doubled down on this with iOS. The recommended library is **Motion (formerly Framer Motion)** for React — it defaults to spring for physical properties.

| Animation | Duration | Easing |
|-----------|----------|--------|
| Button press (down) | 100-150ms | ease-out, scale to 0.95 |
| Button release | 200-300ms | Spring (stiffness: 300, damping: 15) |
| Video swipe transition | 300-400ms | Spring (stiffness: 300, damping: 30) |
| Heart pop (double-tap) | 600-800ms | Custom keyframes with overshoot |
| Fade overlay | 200-300ms | ease-in-out |
| Toast appear/dismiss | 200ms / 150ms | ease-out / ease-in |
| Icon state change | 200-300ms | Spring (stiffness: 400, damping: 20) |

**Heart animation recipe:** Appears at tap coordinates, scales 0→1.2→0.95→1.05→1, holds briefly, fades out. Total ~800ms. Color: `#FE2C55`. Size: ~80px. Use `tabular-nums` for counter animations so numbers don't shift width.

**Loading states:** Skeleton loading with shimmer effect — dark gray placeholder (`#1a1a1a`) with animated gradient shimmer (`#2a2a2a` sweep, 1.5s infinite). For between-video transitions, show a subtle blur of the previous video with a centered pulsing ring indicator.

### Glassmorphism (confirmed still critical in 2025-2026)

Apple's **Liquid Glass** at WWDC 2025 validated glassmorphism at the highest level. The Aesthetics Wiki projects it will "fully replace Flat Design around 2026-2027." For dark-mode video overlays:

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

Performance note: `backdrop-filter` is GPU-intensive on mobile. Use sparingly for temporary overlays (modals, toasts, bottom sheets), not permanent UI elements.

---

## 4. Open source projects worth studying

Ten projects were evaluated across TikTok clones, video chat, and WebRTC implementations. Five stand out as genuinely useful:

**mirotalkc2c (Cam-2-Cam WebRTC)**
- GitHub URL: https://github.com/miroslavpejic85/mirotalkc2c
- Stars: ~487
- Tech stack: JavaScript, Node.js, WebRTC P2P, Socket.IO
- Visual quality: 7/10
- Worth studying: **YES — CRITICAL.** This is essentially the video infrastructure needed. Production-ready 1-on-1 cam-to-cam with E2E encryption, STUN/TURN configuration, REST API for room management, Docker deployment. Actively maintained as of February 2026. Embeddable via iframe for rapid prototyping. The C2C model, room creation API, and signaling logic map directly to random matching + video display needs.

**mirotalk P2P**
- GitHub URL: https://github.com/miroslavpejic85/mirotalk
- Stars: **4,200+**
- Tech stack: JavaScript, Node.js, WebRTC, Socket.IO
- Visual quality: 8/10
- Worth studying: **YES.** Most battle-tested open-source WebRTC video system. Supports video up to 8K/60fps, adaptive quality, mobile camera switching, 133 languages, PWA. Not designed for roulette matching, but the video pipeline (stream handling, quality adaptation, error recovery) is production-grade reference code.

**omegleMeet (Random Matching Engine)**
- GitHub URL: https://github.com/rohitsx/omegleMeet
- Stars: ~13
- Tech stack: React, Node.js, Express, WebRTC, Socket.IO, Redis, Docker
- Visual quality: 5/10
- Worth studying: **YES.** Provides the exact random-stranger-matching architecture: Redis queue for waiting users, Socket.IO pairing events, room lifecycle management, and "next" functionality. The matching algorithm and queue system can be lifted almost directly. Basic UI, but the backend logic is the prize.

**tiktok-clone-nextjs (John Weeks Dev)**
- GitHub URL: https://github.com/John-Weeks-Dev/tiktok-clone-nextjs
- Stars: ~100+
- Tech stack: Next.js, React, TypeScript, Tailwind CSS, AppWrite
- Visual quality: 8/10
- Worth studying: **YES.** Built with the exact target stack. Best Next.js TikTok clone for component architecture, Tailwind overlay patterns, video card layout, and responsive design. The overlay UI pattern for action buttons (like, comment, share on right side) is directly applicable.

**flutter-tiktok (salvadordeveloper)**
- GitHub URL: https://github.com/salvadordeveloper/flutter-tiktok
- Stars: **1,200+**
- Tech stack: Flutter, Dart, Firebase
- Visual quality: 7/10
- Worth studying: **YES for UX reference only** (Flutter, not web). Highest-starred TikTok clone with the best vertical swipe implementation using PageView. The overlay UI composition — gradient values, icon positioning, animation curves, rotating music disc — serves as a pixel-perfect design reference even though the code isn't directly portable.

### Key technical pattern: CSS scroll-snap

The simplest, most performant approach for TikTok-style snapping on the web requires **no JavaScript library**:

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

Combine with `react-swipeable` (675K+ weekly npm downloads) for gesture detection and Intersection Observer API for auto-play/pause of the visible video.

---

## 5. The 2025-2026 design landscape favors this exact product

Several converging trends make a premium cam roulette app perfectly timed.

**Glassmorphism hit its apex.** Apple's Liquid Glass at WWDC 2025 deployed real-time refraction across all platforms. Samsung's One UI 7 adopted frosted glass. The Aesthetics Wiki projects glassmorphism will "fully replace Flat Design around 2026-2027." For a full-screen video app, the video itself provides the "something to distort" that makes glass effects work beautifully — this is the ideal use case.

**Dark mode is non-negotiable.** **82% of mobile users prefer dark mode** (Nielsen Norman). Entertainment apps "prioritize dark mode for long viewing sessions and nighttime usage." The trending shade is **tinted dark** (#0A0A12 deep blue-black) rather than pure black — it reduces halation on white text while maintaining OLED battery benefits. Off-white text (#E0E0E0) for body copy reduces glare versus pure #FFFFFF.

**Squircles are the emerging shape language.** The new CSS `corner-shape: squircle` property is landing in Chrome 139+. Apple-style continuous curves feel "more natural and less boxy." For the app: 20-24px squircle for overlay cards, 12-14px for buttons, full pill for primary CTAs, full circle for avatars. Sharp corners signal brutalist/editorial aesthetics — wrong vibe for social entertainment.

**Spring physics replaced CSS easing as the standard.** iOS and Android platforms built spring physics into their animation frameworks. CSS ease-in-out now feels "robotic" by comparison. The recommended setup: Motion (Framer Motion) for React with spring configs of stiffness 300-400, damping 25-40 for snappy UI transitions.

**"Barely-there UI" is the premium aesthetic.** The dominant 2025 philosophy is interfaces that feel "light, almost invisible." One font family, limited color, calm spacing. For a cam roulette app, this means: full-screen video with minimal contextual overlays that appear on tap and auto-hide after 3 seconds. The UI should feel like it doesn't exist until needed, then be beautiful when it appears.

**Grainy gradients signal craft.** "In 2025, if your gradient doesn't have grain, it reads as unfinished." Subtle noise (3-5% opacity) on dark backgrounds and glass panels adds sophistication and analog warmth. Aurora and mesh gradients with grain are the premium choice over flat linear gradients.

---

## Summary and recommendations

### Top 5 visual design inspirations

1. **TikTok** — Borrow the entire overlay layout system: bottom gradient, right-side icon column, outlined icons, spring swipe physics, double-tap heart animation, and the principle that the video IS the interface
2. **Cherry.tv** — Borrow the black + pink/purple cam-site color scheme, gamification system (levels, challenges, rewards), and the proof that Gen-Z design works in the adult space
3. **Tinder** — Borrow the intent-feedback stamps (LIKE/NOPE appearing during swipe), spring-based card physics with rotation, and the dopamine of the match celebration animation
4. **BIGO Live** — Borrow the scrolling chat bubble overlay (semi-transparent pills rising from bottom-left) and the virtual gift economy's visual language
5. **Apple Music / Spotify** — Borrow the dark-first + glassmorphism + gradient accent aesthetic as the benchmark for "premium entertainment app" in 2025

### Color palette recommendation

For a dark-mode cam roulette app, use TikTok-adjacent energy on a true-black base:

- **Background:** `#000000` (true black for OLED) with `#1A1A1A` for elevated surfaces
- **Primary accent:** `#FE2C55` (hot pink — hearts, likes, primary CTAs)
- **Secondary accent:** `#00F0FF` (electric cyan — info highlights, online indicators)
- **Glass surfaces:** `rgba(0,0,0,0.3)` + `backdrop-filter: blur(24px)`
- **Text:** `#FFFFFF` (primary), `rgba(255,255,255,0.7)` (secondary)
- **Borders:** `rgba(255,255,255,0.08)` (subtle glass edges)

### The "modern premium" checklist

Every element that separates polished from amateur in 2025:

- Spring-based animations for all interactive movement (not CSS ease)
- Outlined icons (default) → filled (active), never all-filled
- Bottom gradient overlay on video (non-negotiable for text readability)
- Text shadows on ALL overlay text (`0 1px 3px rgba(0,0,0,0.8)`)
- Glassmorphism panels with `backdrop-filter: blur(20px+)` for overlays
- Haptic feedback paired with visual micro-interactions
- Squircle-radius corners (20-24px cards, 12px buttons, pill CTAs)
- 60fps animations everywhere, targeting 120fps on capable devices
- Subtle grain/noise texture (3-5% opacity) on gradients and glass panels
- Auto-hiding contextual UI — visible on interaction, fades after 3 seconds
- `tabular-nums` for counters so digits don't shift width during animations
- Consistent 16px edge padding from screen margins
- Frosted glass bottom nav (never solid-color bars)

### Anti-inspiration — what to avoid at all costs

- **Chaturbate's entire aesthetic:** Light backgrounds, no dark mode, wall-of-thumbnails grid, HTML-era bio customization, zero modern design patterns
- **BongaCams-style advertising:** Aggressive pop-ups destroy mobile UX; the app must be ad-free in the core experience
- **Ome.tv/Chatroulette's abrupt cuts:** Zero-feedback transitions between connections — every transition needs animation and visual interest
- **Filled/heavy icons over video:** YouTube Shorts explicitly switched away from this in 2025 — outlined icons let more video show through
- **Solid-color navigation bars:** Look dated; use frosted glass or transparent overlays
- **Desktop-first responsive design:** Must be mobile-first; responsive adaptations always feel compromised
- **Pure black (#000) text backgrounds with pure white (#FFF) text:** Creates halation; use tinted darks and off-white
- **Linear/ease CSS animations for interactive elements:** Feel robotic vs spring physics
- **Neumorphism:** Declining trend, wrong aesthetic for video overlay
- **Sharp corners:** Signal brutalist/editorial, wrong vibe for social entertainment

### Open source gems

1. **mirotalkc2c** (https://github.com/miroslavpejic85/mirotalkc2c) — The cam-to-cam WebRTC engine. Production-ready, maintained Feb 2026, E2E encrypted. Extract the entire signaling + video pipeline.
2. **omegleMeet** (https://github.com/rohitsx/omegleMeet) — The random matching queue. Redis + Socket.IO pairing logic is directly liftable.
3. **tiktok-clone-nextjs** (https://github.com/John-Weeks-Dev/tiktok-clone-nextjs) — The UI shell. Next.js + React + TypeScript + Tailwind component architecture for TikTok-style overlay layout.
4. **mirotalk P2P** (https://github.com/miroslavpejic85/mirotalk) — Production WebRTC reference (4.2K stars). Study for adaptive video quality, mobile camera handling, and error recovery.
5. **CSS `scroll-snap-type: y mandatory`** — No library needed. Native browser API for TikTok-style vertical snapping. Pair with `react-swipeable` for gesture detection.

### Design mood board direction

**"Invisible. Electric. Cinematic."**

The app should feel like holding a window into someone's world — the UI vanishes, the connection is everything, and when interface elements appear, they glow with restrained neon energy against glass. Think: a premium nightclub viewed through a rain-streaked window at midnight. Dark, warm, alive.