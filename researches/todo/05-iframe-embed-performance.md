# Research: Iframe/Embed Performance Optimization for Mobile

## Context

I'm building a live cam roulette app that embeds Chaturbate live streams inside iframes. The core UX is: user sees one full-screen iframe at a time, swipes up, and a new iframe with a different performer loads instantly. We use a dual-iframe system — one visible, one preloading in the background — to achieve instant transitions.

**The technical setup:**
- Two `<iframe>` elements stacked via CSS (z-index, opacity)
- While user watches iframe A, iframe B preloads the next performer in the background
- On swipe: iframe B fades in (0.6s CSS opacity transition), iframe A becomes the preloader
- Chaturbate embed URL format: `https://chaturbate.com/in/?tour=XXXX&campaign=XXXX&track=XXXX&room=USERNAME&disable_sound=1`
- Target: < 1 second perceived load time from swipe to live video playing
- 95%+ of users are on mobile (mostly Android Chrome, then iOS Safari)

**The problems I'm worried about:**
- Memory leaks from creating/destroying iframes repeatedly (sessions can be 100+ performers)
- Mobile browsers limiting concurrent connections or iframe performance
- Autoplay policies blocking video in iframes
- Preloading an iframe while another plays — does this actually work reliably?
- Battery drain from two active video streams
- iOS Safari specific iframe restrictions
- How many iframes can realistically be in the DOM before performance degrades?

---

## Research Questions

### 1. Iframe Memory Management
- Do iframes leak memory when repeatedly created and destroyed?
- What's the correct way to clean up an iframe (just remove from DOM? set src to about:blank first?)
- How much memory does a typical video-playing iframe consume?
- At what point (how many iframes created) does performance visibly degrade?
- Is it better to reuse 2 iframes (change src) or create/destroy them?
- How to detect and prevent memory leaks from embedded video players?

**Search queries:**
- "iframe memory leak prevention javascript"
- "iframe src change memory management"
- "video iframe memory consumption mobile"
- "reuse iframe vs create destroy performance"
- "iframe cleanup best practices web"
- "embedded video memory leak mobile browser"

### 2. Preloading Strategy
- Does setting an iframe's `src` while it's hidden/offscreen actually start loading the content?
- Do mobile browsers deprioritize hidden/offscreen iframes?
- Chrome's `loading="lazy"` vs `loading="eager"` — how do they affect iframe preload?
- Can you preload an iframe in a detached DOM element and then attach it?
- What's the actual network behavior when two iframes load simultaneously?
- Does `visibility: hidden` vs `display: none` vs `opacity: 0` vs offscreen positioning affect iframe loading differently?

**Search queries:**
- "iframe preloading hidden background technique"
- "mobile browser iframe loading priority hidden"
- "preload iframe content before showing"
- "iframe visibility hidden vs display none loading behavior"
- "concurrent iframe loading mobile performance"
- "iframe lazy loading eager loading difference"

### 3. Mobile Browser Specific Issues
- **iOS Safari:** What are the specific iframe limitations? (memory limits, concurrent connections, video playback)
- **Android Chrome:** iframe performance characteristics? Memory limits?
- **Samsung Internet:** Any unique iframe behaviors?
- How many concurrent video streams can mobile browsers handle before dropping frames?
- Do mobile browsers throttle background iframes (like they do background tabs)?
- Intersection Observer API — does it work with iframes for detecting visibility?

**Search queries:**
- "iOS Safari iframe limitations 2024 2025"
- "mobile browser iframe performance limits"
- "concurrent video streams mobile browser limit"
- "mobile browser throttle background iframe"
- "iOS Safari iframe video playback restrictions"
- "Android Chrome iframe memory limit"

### 4. Autoplay Policies for Embedded Video
- What are the current autoplay policies for iframes across major mobile browsers?
- Does `allow="autoplay"` on the iframe tag actually work reliably?
- Chaturbate embeds with `disable_sound=1` — does muted video autoplay in iframes?
- Does switching which iframe is visible (opacity change) count as a "user gesture" for autoplay?
- How does the `<iframe>` sandbox attribute affect autoplay?
- The `Feature-Policy: autoplay` header — is it needed?

**Search queries:**
- "iframe autoplay policy mobile browser 2024 2025"
- "muted video autoplay iframe mobile"
- "iframe allow autoplay attribute browser support"
- "chaturbate embed autoplay mobile"
- "video autoplay policy iOS Safari iframe"
- "iframe feature policy autoplay"

### 5. Performance Optimization Techniques
- Best practices for iframe performance on mobile?
- `will-change` and CSS containment for iframe transitions?
- Is CSS `opacity` transition the best way to swap iframes, or is there something better?
- Using `requestAnimationFrame` for iframe swap timing?
- GPU acceleration for iframe transitions (transform vs opacity)?
- `content-visibility: auto` — does it help with offscreen iframes?

**Search queries:**
- "iframe performance optimization mobile web"
- "CSS transition between iframes smooth"
- "will-change iframe GPU acceleration"
- "content-visibility auto iframe performance"
- "smooth iframe transition technique web"
- "iframe swap animation performance best practice"

### 6. Alternative Approaches to Iframes
- Is there a better approach than iframes for embedding third-party live video?
- Web Components / Shadow DOM as iframe alternative?
- Using Chaturbate's HLS stream URL directly in a `<video>` tag instead of their embed?
- Proxy approach: server fetches stream URL, frontend plays directly?
- Performance comparison: iframe embed vs direct HLS playback?
- What do other cam aggregator sites use?

**Search queries:**
- "alternative to iframe for embedding video"
- "chaturbate HLS stream direct embed"
- "iframe vs direct video embed performance"
- "third party live stream embed without iframe"
- "cam site aggregator embed technique"
- "HLS video player mobile performance vs iframe"

### 7. Battery & Data Consumption
- How much battery does a video-playing iframe consume?
- Two simultaneous video iframes — does the background one consume significant battery/data?
- Can you pause/suspend the background iframe's video playback?
- `Page Visibility API` — can it help manage background iframe resources?
- Strategies to minimize data usage for pre-buffering?
- Is there a way to load just the first frame of the next stream without streaming video?

**Search queries:**
- "iframe video battery consumption mobile"
- "pause iframe video programmatically"
- "page visibility API iframe management"
- "minimize bandwidth preloading video iframe"
- "suspend iframe resource usage background"
- "video preload poster frame only mobile"

---

## Output Format

### Finding: [Specific technique or insight]
**Source:** [URL, browser documentation, or developer article]
**Key points:**
- [Specific, implementable detail]
- [Code snippet if applicable]
**Impact on our dual-iframe system:**
- [Specific recommendation for our use case]

---

## Summary I Need

1. **Iframe cleanup recipe** — the exact sequence to properly clean up an iframe without leaking memory (code snippet)
2. **Preloading reality check** — does our "preload in hidden iframe" approach actually work reliably on mobile? If not, what's the alternative?
3. **Mobile limits** — concrete numbers: how many iframes, how much memory, how many concurrent video streams before things break
4. **Autoplay answer** — will Chaturbate muted embeds autoplay reliably in iframes on iOS Safari and Android Chrome? Yes/no/workaround.
5. **Best swap technique** — opacity transition, transform, or something else? With code.
6. **Alternative to iframes** — is there a better approach for our specific use case? Direct HLS? Or are iframes fine?
7. **Battery/data strategy** — how to minimize resource consumption when preloading the next stream

---

**Estimated research time:** 45-60 minutes
**Priority:** CRITICAL — If iframes don't perform well on mobile, the entire UX breaks
