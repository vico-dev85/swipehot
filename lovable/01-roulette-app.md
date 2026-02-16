# Lovable Prompt 1: xcam.vip Roulette App

Build a mobile-first, full-screen TikTok-style live cam roulette web app called **xcam.vip**. This is the core experience — users see one live performer at a time, full-screen, and swipe through them. All UI floats transparently over the video. The goal is a premium, modern, addictive dark-mode experience that feels like TikTok meets a high-end nightclub.

This is a **design prototype only** — use placeholder images/videos instead of real streams, and fake data for all numbers. No real API calls. Focus entirely on making it look and feel incredible.

---

## Brand Identity

**Name:** xcam.vip
**Tagline:** (optional, keep it subtle if used)
**Mood:** "Invisible. Electric. Cinematic." — The app should feel like holding a window into someone's world. The UI vanishes, the connection is everything, and when interface elements appear, they glow with restrained neon energy against glass. Think premium nightclub viewed through a rain-streaked window at midnight. Dark, warm, alive.

**Logo:** Clean modern wordmark "xcam.vip" — use Inter font, bold weight, with the accent color on "vip" or as a subtle glow. Keep it minimal. Place it on the start screen only.

---

## Design System

### Color Palette (use as CSS custom properties)

```
--bg-primary:       #000000     (true black — OLED optimized, video area)
--bg-elevated:      #1A1A1A     (elevated surfaces, cards, panels)
--bg-tinted:        #0A0A12     (tinted dark for non-video pages)
--bg-overlay:       rgba(0,0,0,0.6)    (glass panels over video)
--accent-primary:   #FE2C55     (hot pink — hearts, likes, primary CTAs)
--accent-secondary: #00F0FF     (electric cyan — info highlights, secondary actions)
--accent-gold:      #FFD740     (premium/VIP elements)
--accent-success:   #00F891     (online indicators, live badges)
--text-primary:     #FFFFFF     (headlines, usernames)
--text-secondary:   rgba(255,255,255,0.7)   (body text, descriptions)
--text-tertiary:    rgba(255,255,255,0.5)    (captions, timestamps)
--border-subtle:    rgba(255,255,255,0.08)   (glass panel edges)
```

**Rule:** 60% dark background, 30% surface/card colors, 10% accent. "Neon Minimal" — neon as micro-glow accents, not overwhelming.

### Typography

- **Font:** Inter (Google Fonts)
- **Text shadow on ALL overlay text:** `text-shadow: 0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.3)`
- **`font-variant-numeric: tabular-nums`** on all counters/numbers
- Sizes defined per component below

### Icons

- **Style:** Outlined for default, filled for active/selected state
- **Stroke:** 1.5-2px at 24px size
- **Library:** Use Lucide icons (lucide-react)
- **Color:** White with drop shadow on video overlay. Active states fill with accent color.

### Shape Language

- **Cards/panels:** 20-24px border-radius (squircle feel)
- **Buttons:** 12-14px border-radius
- **Primary CTAs:** Full pill (border-radius: 9999px)
- **Avatars:** Full circle
- **No sharp corners anywhere** — everything rounded, smooth, premium

### Glassmorphism (use sparingly — for modals, tooltips, bottom sheets)

```css
background: rgba(0, 0, 0, 0.3);
backdrop-filter: blur(24px) saturate(150%);
-webkit-backdrop-filter: blur(24px) saturate(150%);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 20px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
```

### Subtle Grain Texture

Add a very subtle noise/grain overlay (3-5% opacity) on dark backgrounds and glass panels. This adds sophistication — "In 2025, if your gradient doesn't have grain, it reads as unfinished."

---

## Screen 1: Age Verification Gate

The first thing users see on their very first visit.

- Full-screen dark background (#000000)
- xcam.vip logo centered, with subtle glow
- Text: "This website contains age-restricted content."
- Single button: **"I am 18+ — Enter"** — pill shape, accent-primary (#FE2C55), bold white text
- Below: small text link "Leave" in text-tertiary color
- Remember choice via cookie (show a small "Remember me" toggle)
- **Design this to feel like a velvet rope, not a legal barrier.** Clean, premium, one tap and you're in.
- Must load instantly — this screen should appear within milliseconds

---

## Screen 2: Start Screen (Splash)

Shown after age gate, before the first performer loads. This is also A/B testable — design a compelling version.

- Full-screen dark background with subtle animated gradient (dark purple to dark blue, very subtle, slow movement)
- xcam.vip logo, larger, centered upper third
- Tagline below logo (optional — something like "Live. Random. Real." in text-secondary)
- Large CTA button center-bottom: **"Start Watching"** or **"Chat Now!"** — pill shape, #FE2C55, 56px height, 85% width, bold ALL-CAPS white text, subtle glow shadow
- Below CTA: small text "Free. No signup required." in text-tertiary
- **Online counter** in top area: "🟢 4,287 live now" — real-time feel, use accent-success for the dot, tabular-nums for the number
- Subtle particle or shimmer animation in background (very subtle, not distracting)
- The first performer's video should be preloading behind this screen (show nothing of it yet)

---

## Screen 3: The Roulette View (MAIN SCREEN — most important)

This is where users spend 95% of their time. Full-screen video with floating overlay UI.

### Video Area
- Takes up 100% of viewport (100vw x 100vh)
- Use a placeholder: either a dark gradient, a blurred stock image, or a looping stock video that fills the screen
- The video IS the interface — everything else floats on top

### Bottom Gradient Overlay (CRITICAL for text readability)
```css
background: linear-gradient(
  to top,
  rgba(0, 0, 0, 0.85) 0%,
  rgba(0, 0, 0, 0.5) 40%,
  rgba(0, 0, 0, 0.0) 100%
);
height: 35vh;
position: absolute;
bottom: 0;
```
This ensures all bottom text is readable regardless of video content.

### Top Bar
- Position: fixed top, full width
- Height: ~48px
- Subtle top gradient: `linear-gradient(rgba(0,0,0,0.6), transparent)`
- Left: Back/menu icon (hamburger or logo mini)
- Center: Gender filter pills — "All" | "♀" | "♂" | "⚧" | "👫" — small pill-shaped buttons, the active one uses accent-primary background, others are glass-style `rgba(255,255,255,0.15)`. Compact, not dominating. 32px height, rounded pill shape.
- Right: Online counter — "👁 4,287" or just the number with an eye icon, in text-secondary, accent-success dot for "live"

### Right-Side Action Stack (TikTok-style)
Vertical column of circular icon buttons, positioned right edge, vertically centered in lower-right area:

1. **Profile avatar** (top of stack) — 48px circle, shows performer's placeholder avatar with a subtle border. Below it a small "+" follow badge
2. **Heart/Like** — outlined heart icon, 44px circle with `rgba(0,0,0,0.3)` + `backdrop-filter: blur(8px)` background. Below: count "2.4K" in 10px white. On tap: fills with #FE2C55, heart-burst animation
3. **Chat/Comment** — speech bubble icon, same circle style. Below: count "847"
4. **Share** — share/arrow icon, same circle style. Below: "Share" label
5. **Sound toggle** — speaker icon (muted by default, shows slash through it). Below: "Sound" label

- Icons: 24px inside 44px touch targets
- Spacing: 20px gap between icons
- Position: 16px from right edge
- Drop shadow on all icons for contrast against any video

### Bottom-Left Info Block
- **Performer name:** "ScarletLive" — 17px, bold, white, with verified badge (small accent-primary checkmark)
- **Tags:** "latina • bigboobs • lovense" — 11px, medium weight, ALL-CAPS, text-secondary, letter-spacing 0.05em
- **Short description:** "Hey guys! Goal: 500 tokens 🎯" — 13px, regular, text-secondary, max 2 lines with "...more" truncation
- Semi-transparent background that blends into the bottom gradient (NOT a solid card)

### Primary CTA Button (Bottom Center)
- **Text: "Watch Her Live →"**
- Background: #FE2C55, solid fill
- Text: #FFFFFF, 16px, Bold, ALL-CAPS, letter-spacing 0.04em
- Size: 56px height, 85% screen width
- Shape: pill (border-radius: 28px)
- Shadow: `0 4px 12px rgba(254,44,85,0.4)` (colored glow)
- Position: fixed, 16px from bottom, centered, above safe area
- This is THE most important element on screen — it must pop without being obnoxious

### Swipe Hint (first-time only)
- Subtle animated arrow pointing up, centered, with text "Swipe up for next" in text-tertiary
- Fades out after user's first swipe
- Very subtle, not blocking content

### Next Performer Transition
- When swiping up: the current "video" slides out upward, new one slides in from bottom
- Spring-physics feel: 300-400ms, slight overshoot before settling
- Show a brief loading shimmer if "next video" isn't ready (dark gray with animated gradient sweep)

### Like Animation (on double-tap)
- Large heart (#FE2C55, ~80px) appears at tap coordinates
- Scales: 0 → 1.2 → 0.95 → 1.05 → 1.0
- Holds briefly, then fades out
- Total duration: ~800ms
- The heart icon in the right rail simultaneously fills with #FE2C55

---

## Screen 4: Gender Filter Expanded (optional overlay)

If the top gender pills feel too cramped, design an expanded filter as a glass bottom sheet:

- Slides up from bottom with spring animation
- Glassmorphism background
- Options as large tappable cards: "Everyone" / "Women" / "Men" / "Trans" / "Couples"
- Each with a subtle icon and label
- Active selection has accent-primary border/background
- Tap outside or swipe down to dismiss

---

## Screen 5: Performer Quick Profile (swipe left or tap profile avatar)

A glass panel that slides in from the right, covering ~80% of the screen:

- Glassmorphism background
- Performer avatar (larger, 80px circle)
- Name + verified badge
- Tags as pill chips (#FE2C55 outlined)
- Stats row: "👁 2,341 watching" | "❤ 12.4K likes" | "⏱ Online 2h 14m"
- Bio text (3-4 lines)
- **"Watch Her Live →"** CTA button at bottom (same style as main CTA)
- **"Similar Performers"** section below with 3-4 small circular avatars in a horizontal row
- Tap outside or swipe right to dismiss

---

## Responsive Design

**Mobile (primary — 375px to 428px width):**
- Everything described above IS the mobile design
- Full-screen, edge-to-edge
- All touch targets minimum 44px
- Respect safe area insets (notch, home bar)

**Tablet (768px+):**
- Same full-screen video experience
- Slightly larger icons and text
- CTA can be narrower (70% width instead of 85%)

**Desktop (1024px+):**
- Video still fills the viewport
- Consider max-width container for the video (don't stretch beyond 16:9 equivalent)
- Overlay UI can be slightly more spacious
- Add keyboard hints subtly (→ for next, ← for previous)
- Mouse hover states on all interactive elements (subtle glow/scale)

---

## Micro-Interactions & Polish

These details separate amateur from premium:

- **Button press:** Scale to 0.95 on press (100ms ease-out), spring back on release (200ms)
- **Heart burst:** As described above — scale overshoot animation
- **Counter increment:** Numbers animate upward (old number slides up and fades, new slides in from below) — use tabular-nums
- **"LIVE" badge:** Subtle pulse animation on the red dot (opacity 1 → 0.5 → 1, 2 second cycle)
- **Loading shimmer:** Dark gray (#1a1a1a) placeholder with animated lighter gray (#2a2a2a) gradient sweeping left to right, 1.5s infinite
- **Overlay fade:** UI elements fade in/out over 200-300ms with ease-in-out
- **Frosted glass elements:** Subtle, not overdone — only on the performer profile panel and gender filter sheet
- **Grain texture:** Very subtle noise overlay on the start screen and any solid dark panels

---

## Placeholder Data to Use

Since this is design-only, use these fake values:

- Performer names: "ScarletLive", "MiaBellaCam", "LunaStarX", "KimberlyJade", "ValeriaHot"
- Tags: "latina", "bigboobs", "lovense", "blonde", "asian", "teen", "milf", "squirt", "couples"
- Viewer counts: 2,341 / 1,087 / 4,523 / 856 / 3,210
- Online total: 4,287
- Like counts: 2.4K, 1.1K, 5.7K, 847, 3.2K
- Comment counts: 847, 234, 1.2K, 156, 892
- For video placeholders: use dark gradient backgrounds with subtle color shifts, or blurred placeholder images. Do NOT use any real performer images.

---

## What NOT to Build

- No real video streaming or iframe embeds
- No real API calls
- No backend or database
- No authentication/login system
- No payment or token system
- No real chat functionality
- No analytics tracking
- No PWA/service worker setup

Focus 100% on visual design, layout, animations, and the feeling of using the app.

---

## Summary of What I Want

When I open this on my phone, I want to feel like I'm using a premium app that's as polished as TikTok. Dark, electric, cinematic. The video dominates, the UI is barely there until I need it, and when it appears it's beautiful. The CTA makes me want to tap it. The heart animation makes me want to double-tap again. The swipe feels satisfying. Every detail says "this is a real product, not a weekend project."

Build it mobile-first. Make it gorgeous. Make me want to keep swiping.
