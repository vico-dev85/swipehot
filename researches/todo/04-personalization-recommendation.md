# Research: Personalization & Recommendation Systems for Content Discovery

## Context

I'm building a live cam roulette app where users swipe through random performers. I need a personalization system that learns what each user likes and serves better matches over time. The system runs client-side initially (no login required) and evolves to server-side.

**Current plan:**
- Track signals: watch time, likes (double-tap), skips, gender filter, CTA clicks
- Score performers: `quality_score + (tag_overlap * 10)` where tag_overlap = how many of the performer's tags match the user's inferred preferences
- Tags are normalized into ~30 synonym groups (e.g., "latina", "colombian", "mexican" all → "latina")
- Session-based (no accounts initially) — preferences reset when session expires

**The problem:** This scoring formula is a guess. I don't know if tag overlap is the right primary signal, what weights to use, how to handle cold start (first 5 swipes with zero data), or how to avoid filter bubbles (showing only one type forever).

I need to understand how real recommendation systems work at a practical level — not academic theory, but implementable patterns for a small-scale content discovery system.

---

## Research Questions

### 1. Cold Start Problem
- How do recommendation systems handle brand-new users with zero history?
- What's the best "first 5 items" strategy? (random? popular? diverse?)
- How many signals do you need before personalization kicks in?
- How does TikTok handle cold start for new accounts?
- What's the minimum viable data for a useful recommendation?

**Search queries:**
- "recommendation system cold start problem solutions"
- "TikTok cold start algorithm new users"
- "how many data points before personalization works"
- "content discovery cold start strategies"
- "collaborative filtering cold start workaround"

### 2. Scoring & Ranking Formulas
- What scoring formulas do real recommendation systems use?
- How to weight different signals (explicit like vs implicit watch time vs skip)?
- What's the right balance between "what you liked before" and "what's popular"?
- Thompson Sampling vs epsilon-greedy vs UCB for exploration?
- How does TikTok's For You algorithm actually rank content?
- Simple formulas that work surprisingly well vs complex ones that barely help?

**Search queries:**
- "recommendation system scoring formula practical"
- "content ranking algorithm simple implementation"
- "TikTok For You algorithm explained technically"
- "multi-armed bandit content recommendation"
- "exploration vs exploitation recommendation systems"
- "implicit vs explicit feedback recommendation scoring"
- "watch time vs likes which signal matters more recommendation"

### 3. Tag-Based vs Collaborative Filtering
- Is tag-based filtering (content-based) good enough for our scale?
- When does collaborative filtering ("users who liked X also liked Y") become worth the complexity?
- Can you do simple collaborative filtering without accounts (session-based)?
- Hybrid approaches: combining tag-based + popularity + freshness?
- What Netflix/Spotify/TikTok do that's actually implementable at small scale?

**Search queries:**
- "content based vs collaborative filtering when to use which"
- "tag based recommendation system implementation"
- "collaborative filtering without user accounts session based"
- "hybrid recommendation system simple implementation"
- "Netflix recommendation algorithm simplified explanation"
- "recommendation system for small scale application"

### 4. Avoiding Filter Bubbles
- How to prevent the algorithm from only showing one type of content?
- What percentage of recommendations should be "exploration" vs "exploitation"?
- How does Spotify's Discover Weekly balance familiar vs new?
- Diversity injection: how to implement it without killing relevance?
- How to detect when a user is bored (fast skipping = too similar content)?

**Search queries:**
- "recommendation system filter bubble prevention"
- "exploration vs exploitation ratio recommendation"
- "Spotify discover weekly diversity algorithm"
- "recommendation diversity injection technique"
- "detecting user boredom recommendation system"
- "serendipity in recommendation systems"

### 5. Session-Based Recommendation (No Accounts)
- How do systems personalize without user accounts?
- Session-based recommendation approaches and their effectiveness
- How long does a session need to be before recommendations improve?
- Transferring session preferences to a new session (fingerprinting? cookies?)
- When does it make sense to add accounts vs stay session-based?

**Search queries:**
- "session based recommendation system implementation"
- "recommendation without user login"
- "anonymous user recommendation techniques"
- "session based collaborative filtering"
- "cookie based user preference tracking recommendation"

### 6. Practical Implementation Patterns
- What data structures to use for storing user preferences? (vector? weighted map?)
- How to efficiently compute similarity between user profile and content?
- Batch processing vs real-time scoring?
- How to A/B test different recommendation strategies?
- Logging and measuring recommendation quality?

**Search queries:**
- "recommendation system implementation tutorial node.js"
- "user preference vector implementation"
- "real time content scoring implementation"
- "measuring recommendation quality metrics"
- "A/B testing recommendation algorithms"
- "recommendation system architecture small scale"

---

## Output Format

### Finding: [Specific technique or insight]
**Source:** [URL or paper]
**Key points:**
- [Specific, implementable detail]
- [Exact formula or algorithm if available]
**How to implement for a cam roulette:**
- [Specific recommendation]

---

## Summary I Need

1. **A concrete scoring formula** — with specific signals, weights, and rationale. Something I can implement in 50 lines of code, not a PhD thesis.
2. **Cold start strategy** — exactly what to show in the first 5, 10, 20 swipes before personalization has data.
3. **Exploration ratio** — what percentage of recommendations should be random/diverse vs personalized. A specific number.
4. **Signal hierarchy** — ranked list of which user signals matter most (like > watch time > skip? or different?).
5. **When to upgrade** — at what scale/complexity does the simple approach stop working and you need something more sophisticated?
6. **Anti-patterns** — what NOT to do. Common mistakes in recommendation systems that kill engagement.

---

**Estimated research time:** 45-60 minutes
**Priority:** HIGH — The personalization formula is the difference between users coming back or getting bored
