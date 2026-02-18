# xcam.vip Personalization Brain — How It Works

## Overview

The brain is a client-server system that learns what each user likes based on their behavior, then serves increasingly relevant performers. It has two parts:

1. **Client-side brain** (`brain.ts`) — Tracks preferences in the browser via localStorage
2. **Server-side matcher** (`_pool.php`) — Selects performers using a blended scoring algorithm

No accounts needed. Preferences persist across sessions via localStorage and improve over time.

---

## Signal Collection (Client)

Every time a user interacts with a performer, the brain records a **weighted signal**:

| Action | Weight | Meaning |
|--------|--------|---------|
| CTA click (signup/register) | **+1.2** | Strongest positive — user wanted more |
| Double-tap like | **+1.0** | Strong positive — user explicitly liked |
| Watched 60+ seconds | **+0.8** | Passive positive — engaged viewer |
| Watched 30-60 seconds | **+0.4** | Mild positive — somewhat interested |
| Watched 10-30 seconds | **+0.1** | Neutral — browsing |
| Skipped in 3-10 seconds | **-0.2** | Mild negative — not interested |
| Skipped in under 3 seconds | **-0.5** | Strong negative — instant rejection |

These weights are applied to **every tag** the performer has. Example: if a user watches a performer tagged `latina, bigboobs, lovense` for 45 seconds, each of those three tags gets +0.4 added to the preference vector.

---

## Tag Normalization

Raw Chaturbate tags are messy. The system normalizes 22 tag categories with synonyms:

- `latina` ← latina, latin, colombian, mexican, brazilian, spanish
- `asian` ← asian, japanese, korean, chinese, thai, filipina
- `bigboobs` ← bigboobs, bigtits, hugetits, busty, bigbreasts
- `lovense` ← lovense, lush, ohmibod, interactive, toy
- `curvy` ← curvy, bbw, thick, chubby, plussize
- ...and 17 more categories

This means watching a "colombian" performer and a "mexican" performer both boost the `latina` preference equally.

---

## Preference Vector

The brain maintains a **30-dimension preference vector** — a simple key-value map of `tag → score`:

```
{
  "latina": 3.2,
  "bigboobs": 1.8,
  "lovense": 1.1,
  "blonde": -0.7,
  "teen": 0.3
}
```

Positive scores = user likes this. Negative scores = user dislikes this. Higher absolute value = stronger signal.

### Time Decay

Preferences decay exponentially over time:

- **Decay rate**: 0.004 per hour (half-life ~7 days)
- Every time the brain updates, all existing preferences are multiplied by `e^(-0.004 × hoursSinceLastUpdate)`
- Preferences below 0.01 are deleted

This means recent behavior matters more than old behavior. A preference built up over a week will fade naturally if the user's taste shifts.

---

## Alpha: The Personalization Dial

Alpha controls the balance between personalization and popularity:

```
alpha = min(0.85, totalSwipes / 20)
```

| Swipes | Alpha | Behavior |
|--------|-------|----------|
| 0 | 0.00 | 100% popularity — new users see the most popular performers |
| 5 | 0.25 | 75% popularity, 25% personal preference |
| 10 | 0.50 | Even split |
| 15 | 0.75 | Mostly personalized |
| 20+ | 0.85 | 85% personal preference, 15% popularity floor |

The 15% popularity floor (alpha never reaches 1.0) ensures users always see quality performers, even if their preferences are niche.

---

## Server-Side Selection Algorithm

When the frontend requests the next performer, it sends:
- `session_id` — for seen-set tracking
- `gender` — filter (all/f/m/t/c)
- `prefer_tags` — top 5 tags from the brain's preference vector
- `alpha` — personalization blend ratio

### Step 1: Pool & Filtering

1. Fetch up to 500 online performers from Chaturbate API (cached 90 seconds)
2. Filter: only public shows with at least 1 viewer
3. Remove performers the user has already seen this session

### Step 2: Quality Score

Each performer gets a base quality score:

```
score = log10(viewers) × 25          // Viewer count (logarithmic)
      + (is_hd ? 15 : 0)            // HD bonus
      + (10-60 min online ? 10 : 0)  // "Sweet spot" online time
      + (60-120 min ? 5 : 0)         // Still good
      - (0 viewers ? 50 : 0)         // Empty room penalty
```

This produces a 0-100ish popularity score.

### Step 3: Personal Score

For each performer, calculate tag overlap with the user's preferences:

```
personalScore = Σ (tagCount - tagPosition) / tagCount × 100
```

Tags sent by the frontend are **ordered by preference strength** (strongest first). A match on the user's #1 preferred tag scores higher than a match on tag #5. This rewards performers who match the user's top preferences.

### Step 4: Blended Score

```
finalScore = alpha × personalScore + (1 - alpha) × popularityScore
```

- New users (alpha ≈ 0): see the most popular performers
- Experienced users (alpha ≈ 0.85): see performers matching their taste, with a quality floor

### Step 5: Exploration (30%)

**30% of the time, the algorithm ignores all scores and picks a random unseen performer.** This prevents filter bubbles and helps discover new preferences the user didn't know they had.

### Step 6: Weighted Random from Top 25%

For the other 70%: sort performers by blended score, take the top 25%, then do a **weighted random pick** (higher scores = more likely to be chosen, but not guaranteed). This adds natural variety while still favoring the best matches.

---

## Boredom Detection

If the user skips >70% of the last 10 performers in under 3 seconds each, the brain detects **boredom**:

- Reduces the number of preferred tags sent to the API (5 → 2)
- This widens the net, showing more diverse performers
- Breaks the user out of a rut if their preferences have become too narrow

---

## Data Flow Diagram

```
User watches/skips/likes performer
        │
        ▼
   brain.ts (client)
   ├── Updates preference vector (tag weights)
   ├── Applies time decay to old preferences
   ├── Tracks watch times for boredom detection
   └── Increments swipe count (for alpha calculation)
        │
        ▼
   Next performer request
   ├── prefer_tags = top 5 tags from preference vector
   ├── alpha = min(0.85, swipes / 20)
   └── session_id (for seen-set deduplication)
        │
        ▼
   pool-next.php (server)
   ├── getPool() — cached Chaturbate API data
   ├── Filter seen performers
   ├── 30% chance: return random (exploration)
   └── 70% chance: blended scoring
       ├── popularityScore = normalized quality score
       ├── personalScore = weighted tag overlap
       ├── blended = alpha × personal + (1-alpha) × popular
       └── Weighted random from top 25%
        │
        ▼
   Performer shown to user → cycle repeats
```

---

## Persistence

| Data | Storage | Lifetime |
|------|---------|----------|
| Preference vector | localStorage | Permanent (decays over ~7 days) |
| Total swipes | localStorage | Permanent |
| Seen performers | Server file cache | 30 minutes |
| Performer pool | Server file cache | 90 seconds |

---

## Example Session

1. **Swipe 1-5** (alpha 0.0-0.25): User sees top popular performers. Brain learns user watches latina and bigboobs performers longer, skips blonde quickly.

2. **Swipe 6-15** (alpha 0.25-0.75): Recommendations start leaning toward latina/bigboobs. User still sees some popular performers regardless of tags.

3. **Swipe 16-20** (alpha 0.75-0.85): Heavily personalized. Most performers match user's tag preferences. 30% exploration still introduces variety.

4. **User goes bored** (skipping everything quickly): Brain detects boredom, widens tag filter, shows more diverse performers until engagement recovers.

5. **Next day**: Preferences have decayed slightly but still present. User picks up where they left off, with slightly less aggressive personalization.
