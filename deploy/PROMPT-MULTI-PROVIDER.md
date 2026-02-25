# Multi-Provider Roulette Integration — Builder Prompt

Use this prompt when working with an AI coding assistant on a fresh clone of the repo.

---

## THE PROMPT

Copy everything below the line into your AI coding session:

---

# Task: Multi-Provider Live Cam Roulette

## What This Project Is

A TikTok-style live cam roulette at **swipe.hot**. Users see random live performers full-screen, swipe through fast, and click through to affiliate white-label sites. Revenue = affiliate commissions from 3 cam platforms.

The **Chaturbate provider is fully working in production**. **Streamate** and **LiveJasmin** have working standalone test files (PHP pool proxies + test HTML pages) but are NOT integrated into the main React SPA roulette.

**Your job: Integrate all 3 providers into one cohesive, switchable multi-provider roulette.**

---

## The 3 Providers — What Already Works

### 1. Chaturbate (PRODUCTION — fully working)
- **Pool API**: `packages/frontend/public/api/pool-next.php` + `_pool.php`
- **Frontend**: `packages/frontend/src/components/RouletteView.tsx`
- **Iframe manager**: `packages/frontend/src/services/iframe-manager.ts`
- **Personalization brain**: `packages/frontend/src/services/brain.ts`
- **Embed**: `https://cams.swipe.hot/embed/{username}/?campaign=roGHG&tour=9oGW&track=swipehot-roulette&disable_sound=1&embed_video_only=1`
- **CTA**: `https://chaturbate.com/in/?tour=9oGW&campaign=roGHG&track=swipehot-roulette&room={username}`
- **Audio**: MUTED (affiliate embeds are always muted)
- **Iframe strategy**: Dual-iframe preload works great (muted = no dual-audio problem)
- **Personalization**: 30-dim tag vector, gender weights, boredom detection, blended scoring — all wired

### 2. Streamate (TEST PHASE — standalone files working)
- **Pool API**: `packages/frontend/public/api/streamate-pool.php`
- **Test page**: `packages/frontend/public/test-streamate.html`
- **Embed**: `https://hybridclient.naiadsystems.com/purecam?performer={name}&widescreen=true`
- **CTA**: `https://streamate.com/cam/{name}?AFNO=2-11174.888`
- **Audio**: SOUND ENABLED by default (huge UX advantage!)
- **Iframe strategy**: SINGLE iframe only — hidden iframe still plays audio, causing dual-audio
- **Manifest verification**: `?verify=1` checks `https://manifest-server.naiadsystems.com/live/s:{name}.json` to filter out private/offline performers (essential — API returns stale data)
- **No personalization yet**: Random pool from SMLive XML API
- **Gender mapping**: `f→f`, `m→m`, `t→tm2f`, `c→mf`, `all→f,ff,m,mm,mf,tm2f`
- **Known limitation**: No postMessage events from Streamate iframe — no stream-end detection

### 3. LiveJasmin (TEST PHASE — standalone files working)
- **Pool API**: `packages/frontend/public/api/livejasmin-pool.php`
- **Test page**: `packages/frontend/public/test-livejasmin.html`
- **Embed**: `https://atwmcd.com/live-stream/?site=jsm&psid=vicoawe&pstool=202_1&psprogram=revs&forcedPerformers[0]={name}&vp[showChat]=0&vp[chatAutoHide]=1&vp[showCallToAction]=0&vp[showPerformerName]=0&vp[showPerformerStatus]=0&subAffId=swipehot-roulette&embedTool=1`
- **CTA**: Uses `chatRoomUrl` from API response (includes affiliate tracking)
- **Audio**: MUTED (like Chaturbate — all sound param combinations tested, none work)
- **Iframe strategy**: Dual-iframe preload should work (muted = no dual-audio problem)
- **API credentials**: psId=`vicoawe`, accessKey=`1085f0ec55c13d0eaa41510a7ce5ee07` (in livejasmin-pool.php, server-side only)
- **Status filter**: `free_chat` / `member_chat` / `private_chat` — filter to `free_chat` for public streams
- **Country ban filtering**: Performers have `bannedCountries[]` — pool.php filters via GeoIP
- **Rich metadata**: Rating, ethnicity, build, hair, breast size, languages, willingnesses (great for personalization)
- **No personalization yet**: Direct API pass-through

---

## What Needs to Be Built

### A. Provider Abstraction Layer

Create a unified provider interface so the roulette doesn't care which provider it's talking to. All 3 providers should return the same shape of data.

**Unified performer object** (extend current `PerformerData`):
```typescript
interface PerformerData {
  // Identity
  username: string
  display_name: string
  provider: 'chaturbate' | 'streamate' | 'livejasmin'

  // Demographics
  gender: 'f' | 'm' | 't' | 'c'
  age: number | null
  country: string
  spoken_languages: string
  ethnicity?: string

  // Stream info
  num_users: number
  is_hd: boolean
  tags: string[]
  image_url: string
  room_subject?: string

  // Provider-specific URLs (built by backend)
  embed_url: string
  room_url: string  // CTA click-through

  // Audio capability (critical for UX)
  has_sound: boolean  // true for Streamate, false for CB/LJ
}
```

**Backend**: Create a unified endpoint or modify `pool-next.php` to accept a `provider` param (or `providers` for mixed mode). Each provider's pool PHP already works — just need a router/aggregator.

### B. Iframe Strategy Per Provider

This is the trickiest part. Different providers need different iframe handling:

| Provider | Sound | Preload Strategy | Transition |
|---|---|---|---|
| **Chaturbate** | Muted | Dual iframe (preload next while current plays) | Instant swap (opacity crossfade) |
| **LiveJasmin** | Muted | Dual iframe (same as CB — safe because muted) | Instant swap |
| **Streamate** | Has sound | **Single iframe only** (hidden iframe = dual audio) | Direct load (brief loading state) |

The current `iframe-manager.ts` implements dual-iframe perfectly for Chaturbate. It needs to be extended (or a new manager created) that:

1. **For CB and LJ**: Uses the existing dual-iframe preload/swap pattern
2. **For Streamate**: Uses single-iframe mode — no preloading, direct `src` change, accept the ~1-2s loading delay (the tradeoff for having sound)
3. **On provider switch**: Clean up current iframes before loading new provider's embed

**Important**: When switching FROM Streamate TO a muted provider (or vice versa), you MUST kill the active iframe first to stop audio. Never have a Streamate iframe playing audio in the background.

### C. Provider Switching UI

Add a way for users to switch providers. Options (pick the cleanest UX):

**Option 1 — Provider tabs in top bar**: Small CB / SM / LJ icons or text tabs. Active provider highlighted. Tap to switch. This is the simplest.

**Option 2 — Provider in filter sheet**: Add to the existing gender filter bottom sheet. Provider row above gender row.

**Option 3 — Mixed mode default**: Show performers from all providers mixed together. Label each with a small provider badge. User can filter to single provider if they want. This is the most ambitious but best for engagement.

The UI should clearly show which provider is active. For Streamate, show a sound badge (since it's the only one with audio).

### D. Mixed Pool Mode

The most engaging option: mix performers from all 3 providers into one stream. The user swipes and sees CB, then Streamate, then LJ performers seamlessly.

**Backend approach**: New endpoint or param `?providers=cb,sm,lj` that:
1. Fetches from all 3 pool APIs in parallel
2. Interleaves results (e.g., round-robin or weighted by pool size)
3. Applies unified scoring/personalization
4. Returns mixed `PerformerData[]` with `provider` field

**Frontend approach**: The roulette reads `performer.provider` and uses the right iframe strategy for each performer. When transitioning between providers:
- CB→CB or LJ→LJ: Use preloaded iframe (instant)
- CB→SM or LJ→SM: Kill current iframe, load Streamate single-iframe (brief delay)
- SM→CB or SM→LJ: Kill Streamate iframe (stop audio), use preloaded iframe

### E. Personalization Across Providers

The brain (`brain.ts`) currently only works with Chaturbate tags. Extend it:

1. **Unified tag normalization**: Map LiveJasmin's `willingnesses` + `appearances` and Streamate's `fetishes` + `theme` to the same tag vocabulary used by CB
2. **Provider-neutral scoring**: The brain should learn across all providers — if user likes "blonde" on CB, promote blonde on LJ/SM too
3. **Provider preference weight**: Track which provider the user engages with most. If they always skip Streamate but watch CB, weight CB performers higher in mixed mode

### F. Sound-Aware UX

Since Streamate has sound and others don't, the UI should communicate this:

- When a Streamate performer loads, briefly flash "Sound On" badge (users will notice and stay longer)
- When switching to CB/LJ, optionally show "Muted — click for sound" hint pointing to the CTA
- Don't show a mute/unmute button for CB/LJ (it won't work and will frustrate users)
- For Streamate: a mute button that toggles iframe sound (if possible via postMessage, otherwise hide it)

---

## Architecture Constraints

1. **PHP API only for production** — no Node.js server. All pool endpoints are PHP files in `packages/frontend/public/api/`. The React SPA is a static Vite build.

2. **File-based caching** — no Redis. Each pool PHP uses `sys_get_temp_dir()` for cache files. Keep this pattern.

3. **Seen-set per session** — each provider has its own seen-set. Don't show the same performer twice in a session regardless of provider.

4. **Affiliate tracking is sacred** — never break affiliate params. Each provider has different tracking:
   - CB: `campaign=roGHG&tour=9oGW&track=swipehot-roulette` in embed + CTA URLs
   - SM: `AFNO=2-11174.888` in CTA URL
   - LJ: `psid=vicoawe&subAffId=swipehot-roulette` in embed URL, `chatRoomUrl` from API for CTA

5. **Mobile-first** — everything must work on mobile. Touch swipe gestures are the primary navigation. The current swipe handler is in `RouletteView.tsx`.

6. **Don't break what works** — Chaturbate roulette is live in production. Changes should extend, not rewrite. The existing `iframe-manager.ts`, `brain.ts`, `api.ts` patterns are battle-tested.

7. **`_config.php` is the only file that changes per domain** — provider API keys/credentials live in the PHP pool files server-side. Don't expose them to the frontend.

---

## Key Files to Study First

Read these files carefully before writing any code:

### Frontend (React SPA)
- `packages/frontend/src/components/RouletteView.tsx` — Main roulette component (state machine, gestures, preloading)
- `packages/frontend/src/services/iframe-manager.ts` — Dual iframe preload/swap system
- `packages/frontend/src/services/api.ts` — API calls to backend
- `packages/frontend/src/services/brain.ts` — Client personalization (30-dim tag vector)
- `packages/frontend/src/components/TopBar.tsx` — Gender filter + viewer count
- `packages/frontend/src/components/ActionStack.tsx` — Right-rail TikTok actions

### Backend (PHP API)
- `packages/frontend/public/api/pool-next.php` — CB performer selection endpoint
- `packages/frontend/public/api/_pool.php` — CB pool library (fetch, cache, score, select)
- `packages/frontend/public/api/streamate-pool.php` — Streamate pool proxy (SMLive API + manifest verify)
- `packages/frontend/public/api/livejasmin-pool.php` — LiveJasmin pool proxy (AWEmpire API + country ban filter)
- `packages/frontend/public/api/_config.php` — Domain config (affiliate params, DB creds)

### Working Test Pages (reference implementations)
- `packages/frontend/public/test-streamate.html` — Working Streamate roulette (single iframe, verify, gender filter)
- `packages/frontend/public/test-livejasmin.html` — Working LiveJasmin roulette (dual iframe, category filter, status filter)

---

## Suggested Implementation Order

1. **Provider type system** — Add `provider` field to PerformerData, create provider config constants
2. **Unified pool endpoint** — New `pool-multi.php` that routes to CB/SM/LJ pool handlers and returns unified PerformerData
3. **Extend iframe-manager** — Add single-iframe mode for Streamate, provider-aware transitions
4. **RouletteView multi-provider** — Accept `PerformerData` with provider field, use correct iframe strategy, handle provider transitions
5. **Provider switch UI** — Add provider toggle (start simple: tabs in top bar)
6. **Mixed mode** — Interleave performers from all providers in one stream
7. **Cross-provider personalization** — Extend brain to normalize tags across providers
8. **Sound UX** — Add sound badge for Streamate, muted indicator for others

---

## Provider-Specific Gotchas

### Chaturbate
- Embeds MUST use white-label domain `cams.swipe.hot` (not chaturbate.com, not www.swipe.hot)
- `/embed/{username}/` is the embeddable URL. `/in/` is a redirect — NEVER use in iframes
- `disable_sound=1` is required in embed URL
- Tags are the richest of all 3 providers (user-generated, 30 synonym groups normalized)

### Streamate
- **SMLive API is server-side only** (CORS blocked from browser)
- **Manifest verification is essential** (`?verify=1`) — without it ~30-40% of performers show black screens
- **Sound auto-plays** — this is both the biggest advantage AND the reason you can't dual-iframe preload
- **No postMessage events** — you can't detect when a performer goes offline/private from the iframe
- **PerfFlag bitmask**: `0x00100000` = Gold Show (must filter out), `0x10000000` = HD, `0x00000800` = Widescreen
- Pool cache TTL should be 60s (shorter than CB's 90s) because Streamate data goes stale faster

### LiveJasmin
- **AWEmpire API credentials** (`psId`, `accessKey`) are in `livejasmin-pool.php` — server-side only, never expose
- **Status filtering**: API returns `free_chat`, `member_chat`, `private_chat` — only `free_chat` shows video
- **Country bans**: Performers can block countries. Pool PHP handles this via GeoIP (degrades gracefully if GeoIP not installed)
- **Rich metadata**: `willingnesses[]`, `appearances[]`, `languages[]`, `build`, `breastSize`, `rating` — great for personalization
- **Embed params**: All `vp[...]` params control UI appearance — keep chat hidden, CTA hidden, name hidden for clean full-screen look
- **Gender mapping**: `f→girl`, `m→boy`, `t→transgender`, `c→couple` (API uses different terms than CB/SM)

---

## What Success Looks Like

1. User opens swipe.hot → roulette starts (default provider: Chaturbate or mixed)
2. User can switch between CB / Streamate / LiveJasmin or use "All" mixed mode
3. Swiping feels smooth regardless of provider — instant for CB/LJ (preloaded), fast for Streamate (1-2s acceptable)
4. Streamate performers show with sound (user clearly notices and engages longer)
5. CTA clicks track correctly for each provider's affiliate program
6. The brain learns preferences across all providers
7. No black screens, no dual-audio, no broken embeds
8. Existing CB roulette keeps working exactly as before (no regression)

---

## Don't

- Don't rewrite iframe-manager from scratch — extend it with a mode/strategy pattern
- Don't mix provider API credentials into frontend code — keep them in PHP files
- Don't try to enable sound on CB or LJ embeds — it's been tested exhaustively, it won't work
- Don't dual-iframe preload Streamate — hidden iframe plays audio
- Don't remove the existing CB-specific code paths — they work in production
- Don't add unnecessary abstractions — keep it simple, 3 providers is the max
- Don't skip manifest verification for Streamate — black screens will kill engagement
