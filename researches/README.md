# Research Process

## Overview
Research prompts designed to inform design and engineering decisions for xcam.vip.
Results feed into CLAUDE.md, Lovable design specs, and the actual codebase.

## Workflow
1. Claude Code creates research prompts in `todo/`
2. Victor runs prompts through ChatGPT/Claude web
3. Results are pasted into `results/` (same filename)
4. Claude Code reviews results and applies insights

## Research Topics

### Round 1: Design Phase (COMPLETED)
- [x] 01 - TikTok-style video UX (psychology, gestures, transitions)
- [x] 02 - Adult entertainment UX & conversion patterns
- [x] 03 - Similar projects & visual inspiration

### Round 2: Build Phase
- [ ] 04 - Personalization & recommendation systems (scoring formula, cold start, signals)
- [ ] 05 - Iframe/embed performance on mobile (CRITICAL — preloading, memory, autoplay)
- [ ] 06 - Analytics event design & A/B testing (schema, significance, funnels)

## Priority
Round 2 prompts ranked by urgency:
1. **05 (iframe performance)** — CRITICAL. If embeds don't work on mobile, nothing else matters.
2. **04 (personalization)** — HIGH. The scoring formula drives engagement and retention.
3. **06 (analytics/A/B)** — HIGH. Needed before launch to measure everything else.

Run 05 first if you can only do one at a time. All three in parallel if possible.
