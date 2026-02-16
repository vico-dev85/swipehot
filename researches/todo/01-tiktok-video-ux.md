# Research: TikTok-Style Video UX — What Makes It Addictive

## Context

I'm building a mobile-first web app that shows random live webcam performers one at a time, full-screen. Users swipe up for the next performer, swipe down to go back one. Think TikTok but for live cam streams instead of short videos. The entire screen is the video — all UI (buttons, performer info, navigation) floats transparently on top.

I need to understand what makes TikTok's UX so compelling so I can apply those principles to my app's visual design.

**Important:** I'm NOT building a TikTok clone with a feed algorithm. I'm borrowing the *interaction pattern* (full-screen vertical swipe through content) and the *psychological hooks* that make it addictive. My content is live streams, not recorded videos.

---

## Research Questions

### 1. The Swipe Psychology
- What makes "just one more swipe" so compelling? What's the psychological mechanism?
- How does variable reward (not knowing what's next) drive engagement?
- What role does the *speed* of transitions play? (instant vs animated)
- How does TikTok balance the tension between "this is good, stay" and "what's next might be better"?
- What's the optimal friction level? Zero friction = mindless scrolling. Too much friction = users leave.

**Search queries:**
- "TikTok swipe psychology variable reward"
- "infinite scroll dopamine loop mechanism"
- "why TikTok is addictive UX research"
- "variable ratio reinforcement social media"
- "TikTok engagement psychology research papers"

### 2. Visual & Motion Design That Feels Good
- What makes TikTok's swipe gesture feel physically satisfying? (spring physics? snap points? velocity?)
- How fast are TikTok's transitions between videos? (exact milliseconds if available)
- What easing curves do they use? (linear, ease-out, spring?)
- How does content appear — instant cut, slide, cross-fade, or something else?
- What happens visually during the loading state between videos?
- How does the UI overlay (likes, comments, share, profile pic) interact with the swipe?
- Does the overlay animate during transitions or stay static?

**Search queries:**
- "TikTok swipe animation implementation CSS"
- "TikTok transition speed milliseconds"
- "mobile swipe gesture physics spring animation"
- "TikTok loading state between videos"
- "full screen video app transition design"
- "snap scroll UX best practices mobile"

### 3. Visual Hierarchy on Full-Screen Video
- How does TikTok layer UI on top of video without blocking the content?
- What's their gradient/overlay strategy? (bottom gradient for text readability?)
- How do they handle bright vs dark videos? (does the UI adapt?)
- Where are the interactive elements placed and why? (right side icons, bottom text)
- What's the visual weight distribution? (where does the eye go first?)
- How do they make text readable on any video background?
- What's their approach to iconography? (size, style, animation)

**Search queries:**
- "TikTok UI overlay design analysis"
- "text readability over video CSS techniques"
- "TikTok interface layout analysis UX"
- "mobile video app overlay design patterns"
- "gradient overlay video text readability"
- "TikTok right side icons design rationale"

### 4. Mobile Touch Patterns
- What's the exact swipe distance threshold to trigger a transition?
- How does TikTok handle accidental swipes vs intentional ones?
- What about tap zones? (tap left side, right side, center — what happens?)
- How do they handle the tension between "swipe to next" and "scroll text/comments"?
- What haptic feedback (if any) accompanies the swipe?
- How does the gesture work near screen edges? (safe areas, notch, home bar)

**Search queries:**
- "TikTok swipe gesture threshold pixels"
- "mobile swipe detection accidental vs intentional"
- "TikTok tap zones interaction map"
- "mobile gesture design best practices 2025"
- "iOS safe area insets full screen video"
- "touch target size mobile UX guidelines"

### 5. First Impression / Onboarding
- What does TikTok show on first open? (straight into content? tutorial? login?)
- How fast is time-to-first-content?
- Is there a splash screen? How long?
- What's the cold start experience before personalization kicks in?
- How do they hook users in the first 5 seconds?

**Search queries:**
- "TikTok first open experience onboarding"
- "TikTok time to first content"
- "mobile app first impression UX research"
- "video app onboarding best practices"
- "cold start UX video platform"

---

## Output Format

For each question area, provide:

### Finding: [Specific insight]
**Source:** [URL, article, or research paper]
**Key points:**
- [Specific, actionable detail]
- [Measurable data if available — ms, px, percentages]
**How this applies to a live cam roulette:**
- [Specific recommendation]

---

## Summary I Need

At the end, give me:

1. **The 5 most important UX principles** from TikTok that apply to a full-screen live video swipe app
2. **Specific numbers** — transition speeds, swipe thresholds, animation durations, overlay opacity values — anything measurable
3. **What to NOT copy from TikTok** — things that work for short recorded video but won't work for live streams
4. **The "secret sauce"** — if you had to pick ONE thing that makes TikTok's swipe UX feel amazing, what is it?

---

**Estimated research time:** 30-45 minutes
**Priority:** HIGH — This directly shapes the core interaction of the entire app
