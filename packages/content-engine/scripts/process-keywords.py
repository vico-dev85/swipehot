#!/usr/bin/env python3
"""
Keyword processor for xcam content engine.
Reads all CSVs from data/raw/, deduplicates, categorizes, scores, and outputs
clean prioritized keyword lists to data/processed/.

Usage:
    python process-keywords.py
    python process-keywords.py --dry-run
"""

import os
import re
import sys
import csv
import argparse
from pathlib import Path
from collections import defaultdict

# Fix Windows terminal encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import pandas as pd
except ImportError:
    print("ERROR: pandas not installed. Run: pip install pandas")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "data" / "processed"

# ── Junk filter terms (non-adult irrelevant) ──────────────────────────────────
JUNK_TERMS = [
    "lenovo", "logitech", "razer", "microsoft", "apple", "google",
    "security camera", "raspberry pi", "ocean city", "webcam test",
    "webcam driver", "not working", "windows 10", "windows 11",
    "zoom meeting", "zoom class", "google meet", "teams", "skype",
    "weather", "news", "stock", "recipe", "cooking", "yoga class",
    "yoga teacher", "yoga instructor", "home security", "baby monitor",
    "doorbell", "trail cam", "hunting cam", "wildlife cam", "dash cam",
    "dashcam", "body cam", "nanny cam", "camo pattern", "camo jacket",
    "camouflage", "camp site", "camping", "campaign", "camera review",
    "camera settings", "camera bag", "camera tripod", "dslr", "mirrorless",
    "gopro", "action cam", "waterproof camera", "underwater camera",
    "infrared camera", "night vision camera", "muddy cam", "trophy cam",
    "stealth cam", "browning cam", "yeti rambler", "yeti cooler",
    "update minecraft", "minecraft", "roblox", "fortnite", "pokemon",
    "crossword", "sudoku", "puzzle", "newspaper", "magazine",
    "lenovo yoga", "lenovo ideapad", "asus", "acer", "hp laptop",
    "dell laptop", "macbook", "iphone", "android", "samsung",
    "beach cam", "beach webcam", "surf cam", "traffic cam", "road cam",
    "bridge cam", "river cam", "lake cam", "mountain cam", "ski cam",
    "florida beach", "new orleans", "french quarter", "ocean cam",
    "came out", "came in", "came from", "came to", "i came", "she came",
    "he came", "they came", "it came", "came with", "came back",
    "cam lock", "cam belt", "camshaft", "cam follower",
    # Cheats/tools
    "token generator", "hack chaturbate", "free tokens", "token hack",
    "bot chaturbate", "cheat chaturbate",
    # TV/media/streaming services
    "adult swim", "cartoon network", "tv show", "streaming service",
    "hulu", "netflix", "disney", "espn", "nfl", "nba", "mlb", "nhl",
    "football streaming", "sports streaming", "sports live", "live sports",
    "live tv streaming", "live television", "tv streaming",
    # Video titles (multiple caps, quotes, odd phrases)
    "roomie", "leaked video", "cam rips", "hidden cam", "voyeur",
    # Geographic/tourist webcams (not adult content)
    "indian rocks", "navarre beach", "key west", "yosemite", "clearwater beach",
    "charley young", "myrtle beach", "panama city beach", "daytona beach",
    "santa monica", "venice beach", "miami beach", "south beach",
    "niagara falls", "grand canyon", "yellowstone", "national park",
    # Auto/mechanical cams (engine part, not webcam)
    "cam sensor", "cam phaser", "cam timing", "cam chain", "cam position",
    "caminiti", "ken caminiti",
    # Social/tech (non-adult)
    "facebook messenger", "facebook chat", "chat gpt", "chatgpt", "gpt",
    "discord server", "telegram group", "whatsapp", "snapchat",
    "tiktok live", "instagram live", "youtube live",
    # Nature/environment webcams
    "antarctica", "arctic", "polar cam", "nature cam",
]

# Competitor brand navigational (block exact, allow compound)
COMPETITOR_EXACT = {
    "chaturbate", "stripchat", "bongacams", "myfreecams", "mfc",
    "cam4", "camsoda", "livejasmin", "flirt4free", "xlovecam",
    "streamate", "imlive", "skype", "onlyfans", "fansly",
}

# Explicit NSFW terms requiring ArliAI
NSFW_TERMS = [
    "fuck", "fuckin", "fucker", "cum", "cumshot", "cumming",
    "pussy", "cock", "dick", "penis", "vagina", "clit", "clitoris",
    "blowjob", "blow job", "deepthroat", "deep throat",
    "squirt", "squirting", "dildo", "vibrator", "masturbat",
    "orgasm", "orgasming", "naked", "nude", "nudity", "porn",
    "pornstar", "xxx", "sex cam", "sex show", "sex chat", "sex live",
    "sex stream", "sex video", "erotic", "horny", "slutty", "slut",
    "whore", "bitch", "ass fuck", "anal sex", "anal play", "anal cam",
    "anal show", "boobs", "tits", "titties", "nipple", "ass",
    "butthole", "asshole", "rimjob", "handjob", "footjob",
    "creampie", "gangbang", "threesome", "orgy", "bdsm", "bondage",
    "domination", "submissive", "femdom", "joi", "cei", "sph",
    "joi cam", "cei cam", "fetish", "kinky", "nasty", "dirty talk",
    "roleplay sex", "pantyhose sex", "stockings sex", "hentai",
    "pregnant sex", "lactating", "spit", "spitting", "pissing",
]

# Model name URL patterns from competitor sites
MODEL_URL_PATTERN = re.compile(r'/cam/|/model/|/performer/', re.I)

# Username-like pattern: may contain underscores, numbers, no spaces
USERNAME_PATTERN = re.compile(r'^[a-z0-9_]{3,30}$', re.I)


# ── Schema detection & parsing ────────────────────────────────────────────────

def detect_schema(cols):
    """Return schema label based on column names."""
    cols_lower = [c.strip().lower() for c in cols]
    col_set = set(cols_lower)

    if "keyword difficulty" in col_set and "intent" in col_set and "volume" in col_set:
        if "position" in col_set:
            return "C"  # competitor SERP tracking
        return "A"  # Semrush broad-match

    if "seed_keyword" in col_set and "pattern_type" in col_set:
        return "B"  # batch priority seeds

    if "original_seed" in col_set and "expanded_keyword" in col_set:
        return "D"  # DataForSEO expanded

    if "seed" in col_set and "keyword" in col_set and "search_volume" in col_set:
        return "E"  # adult keyword sets

    if "extracted_keyword" in col_set or ("keyword" in col_set and "seed_word" in col_set):
        return "F"  # matched/filtered keywords

    if "tag" in col_set and "usage_count" in col_set:
        return "G"  # chaturbate tags

    if "seed_keyword" in col_set and ("simple_score" in col_set or "search_intent" in col_set or "estimated_expansions" in col_set):
        return "H"  # niche seeds / reliable seeds

    return "UNKNOWN"


def safe_float(val, default=0.0):
    try:
        return float(str(val).replace(',', '').strip())
    except (ValueError, TypeError):
        return default


def parse_file(filepath):
    """Parse a CSV file into list of unified dicts."""
    rows = []
    try:
        df = pd.read_csv(filepath, encoding='utf-8', errors='replace', dtype=str)
        df.columns = [c.strip() for c in df.columns]
    except Exception:
        try:
            df = pd.read_csv(filepath, encoding='latin-1', dtype=str)
            df.columns = [c.strip() for c in df.columns]
        except Exception:
            return rows

    if df.empty or len(df.columns) < 1:
        return rows

    schema = detect_schema(df.columns.tolist())
    source = os.path.basename(filepath)
    is_competitor = any(x in source.lower() for x in ['yescams', 'uncams', 'ucams'])

    for _, row in df.iterrows():
        kw = intent = ""
        volume = difficulty = cpc = 0.0
        is_model_from_url = False

        if schema == "A":
            kw = str(row.get("Keyword", "")).strip()
            intent = str(row.get("Intent", "")).strip()
            volume = safe_float(row.get("Volume", 0))
            difficulty = safe_float(row.get("Keyword Difficulty", 0))
            cpc = safe_float(row.get("CPC (USD)", 0))

        elif schema == "B":
            kw = str(row.get("seed_keyword", "")).strip()
            perf = str(row.get("expected_performance", "")).upper()
            volume = 100 if perf == "HIGH" else 50 if perf == "MEDIUM" else 20
            difficulty = 5  # assumed low

        elif schema == "C":
            kw = str(row.get("Keyword", "")).strip()
            intent = str(row.get("Keyword Intents", "")).strip()
            volume = safe_float(row.get("Search Volume", 0))
            difficulty = safe_float(row.get("Keyword Difficulty", 0))
            cpc = safe_float(row.get("CPC", 0))
            url = str(row.get("URL", ""))
            if MODEL_URL_PATTERN.search(url):
                is_model_from_url = True

        elif schema == "D":
            kw = str(row.get("expanded_keyword", "")).strip()
            volume = safe_float(row.get("search_volume", 0))
            cpc = safe_float(row.get("cpc", 0))
            difficulty = safe_float(row.get("competition", 0)) * 100  # normalize 0-1 → 0-100

        elif schema == "E":
            kw = str(row.get("keyword", "")).strip()
            volume = safe_float(row.get("search_volume", 0))
            cpc = safe_float(row.get("cpc", 0))
            difficulty = safe_float(row.get("competition", 0)) * 100

        elif schema == "F":
            kw = str(row.get("extracted_keyword", row.get("keyword", ""))).strip()
            volume = safe_float(row.get("volume", 0))
            difficulty = safe_float(row.get("difficulty", 0))
            cpc = safe_float(row.get("cpc", 0))

        elif schema == "G":
            tag = str(row.get("tag", "")).strip().lower()
            if not tag:
                continue
            category = str(row.get("category", "")).strip()
            avg_viewers = safe_float(row.get("avg_viewers", 0))
            # Convert tag to keyword form
            kw = f"{tag} cam"
            volume = avg_viewers  # use avg viewers as proxy for interest
            difficulty = 10  # tags are usually low difficulty
            intent = "commercial"

        elif schema == "H":
            kw = str(row.get("seed_keyword", "")).strip()
            volume = safe_float(row.get("simple_score", row.get("estimated_expansions", 20)))
            difficulty = 5

        else:
            # Unknown schema — try to find a keyword column
            for col in df.columns:
                if col.lower() in ("keyword", "seed_keyword", "extracted_keyword", "expanded_keyword"):
                    kw = str(row.get(col, "")).strip()
                    break

        kw = kw.lower().strip().strip('"\'')
        if not kw or len(kw) < 2:
            continue

        rows.append({
            "keyword": kw,
            "volume": volume,
            "difficulty": difficulty,
            "cpc": cpc,
            "intent": intent,
            "source": source,
            "schema": schema,
            "is_model_from_url": is_model_from_url,
            "is_competitor_site": is_competitor,
        })

    return rows


# ── Filtering ─────────────────────────────────────────────────────────────────

def is_junk(kw):
    """Return True if keyword is non-adult junk."""
    kw_lower = kw.lower()

    # Check junk terms
    for term in JUNK_TERMS:
        if term in kw_lower:
            return True

    # Block exact competitor brand queries (but allow compound)
    if kw_lower in COMPETITOR_EXACT:
        return True

    # Too short
    if len(kw) < 3:
        return True

    # Extra non-adult context checks
    non_adult_contexts = [
        "workout", "exercise", "fitness", "routine", "puppies", "puppy",
        "dog", "cat", "pet", "recipe", "tutorial", "how to setup",
        "streaming setup", "filter for", "filters for", "jamaica", "hawaii",
        "travel", "tourist", "scenery", "landscape", "nature", "wildlife",
        "kerala chat", "chat app", "chat software", "video call", "video chat app",
        "shepherd", "golden retriever", "hanes", "brand",
        "how to spell", "how to pronounce", "what does", "what is a",
        "elon musk", "donald trump", "joe biden", "taylor swift",
        "virgin islands", "british virgin", "us virgin",
        "minnesota", "ohio", "texas", "california", "new york",
        "how to private chat", "best apps for private", "best private chat",
        "tokens to dollars", "tokens to usd", "dollar calculator",
        # Vietnamese / non-English noise
        "cam thach vang", "cam that vang", "vang 18",
        # Nature/tourism webcams that slip through
        "old faithful", "yellowstone live", "yellowstone webcam",
        "lovely camgirl blonde nude 005",  # specific spam/scraped title
        # Unrelated "cam" meanings
        "camaro", "cambridge", "cameron diaz", "cameron dallas",
        # Hardware / drivers
        "c920 driver", "webcam c920", "pro webcam c920", "webcam driver",
        "driver download", "hd pro webcam",
        # Misc non-adult noise
        "tv reality show", "reality shows", "thumbnails not showing",
        "comp cam late", "forest hills", "blonde hair in german",
        "how much does it cost", "how much is",
    ]
    for ctx in non_adult_contexts:
        if ctx in kw_lower:
            return True

    return False


def nsfw_level(kw):
    """Return 'nsfw' or 'safe' based on keyword content."""
    kw_lower = kw.lower()
    for term in NSFW_TERMS:
        if term in kw_lower:
            return "nsfw"
    return "safe"


# ── Categorization ────────────────────────────────────────────────────────────

# Adult-relevant signals for keyword relevance check
ADULT_SIGNALS = [
    "cam", "webcam", "live", "stream", "model", "girl", "boy", "trans",
    "couple", "show", "chat", "adult", "latina", "asian", "ebony", "milf",
    "teen", "mature", "blonde", "brunette", "redhead", "curvy", "slim",
    "squirt", "fetish", "bdsm", "femdom", "joi", "roleplay", "cosplay",
    "lovense", "toy", "interactive", "private", "token", "tip", "performer",
    "stripper", "escort", "nude", "naked", "xxx", "erotic", "sex",
    "french", "italian", "british", "indian", "pinay", "bbw", "pawg",
    "goth", "anime", "pregnant", "lactating", "stockings", "pantyhose",
    "feet", "foot", "heels", "small tits", "big boobs", "big ass",
    "deepthroat", "dildo", "masturbat", "orgasm", "c2c", "cam2cam",
]

# Category page patterns — short niche keywords that become hub pages
CATEGORY_INDICATORS = [
    "cams", "cam girls", "cam girl", "cam boys", "cam boy",
    "webcam models", "webcam girls", "webcam model",
    "live cams", "live cam", "live girls", "live models",
    "free cams", "free cam", "free live",
    "best cam", "best cams", "top cam", "top cams",
]


def has_adult_signal(kw):
    kw_lower = kw.lower()
    return any(sig in kw_lower for sig in ADULT_SIGNALS)


def is_model_name(kw, is_model_from_url=False):
    """Detect if keyword looks like a performer username."""
    if is_model_from_url:
        return True

    kw_lower = kw.lower()
    words = kw_lower.split()

    # Must not be too long (real model name queries are short)
    if len(words) > 5:
        return False

    # Patterns like "mia_elfie's cam", "anabel054 chaturbate"
    # Base must look like a username: has underscore OR mix of numbers+letters
    # Plain dictionary words like "download", "latina", "free" are NOT model names
    model_suffixes = ["'s cam", " chaturbate", " mfc", " stripchat", " onlyfans"]
    common_words = {
        "download", "latina", "free", "hot", "sexy", "nude", "naked",
        "best", "top", "new", "live", "real", "teen", "milf", "asian",
        "ebony", "bbw", "amateur", "homemade", "couple", "solo",
    }
    for suffix in model_suffixes:
        if kw_lower.endswith(suffix):
            base = kw[:kw_lower.rfind(suffix)].strip()
            base_lower = base.lower()
            # Reject plain dictionary words — they're not usernames
            if base_lower in common_words:
                continue
            # Username must have underscore or number+letter mix
            has_underscore = "_" in base
            has_num_letter_mix = bool(re.search(r'[0-9]', base) and re.search(r'[a-z]', base, re.I))
            if (has_underscore or has_num_letter_mix) and len(base) >= 3:
                return True

    # Plain username pattern (no spaces, has underscores or numbers mixed with letters)
    if USERNAME_PATTERN.match(kw):
        # Must have underscore or mix of numbers+letters to look like a username
        has_underscore = "_" in kw
        has_num_letter_mix = bool(re.search(r'[0-9]', kw) and re.search(r'[a-z]', kw, re.I))
        if has_underscore or has_num_letter_mix:
            return True

    return False


def categorize(kw, volume, difficulty, is_model_from_url, is_competitor):
    """Assign category to a keyword."""
    kw_lower = kw.lower()
    words = kw_lower.split()
    word_count = len(words)

    # Model name check
    if is_model_name(kw, is_model_from_url):
        return "model_name"

    # Must have adult relevance — checked early so non-adult high-volume gets filtered
    if not has_adult_signal(kw):
        return "irrelevant"

    # Head term: very high volume adult generics (too competitive for zero-authority site)
    if volume > 10000 or (word_count == 1 and volume > 1000):
        return "head_term"

    # Category page: short adult niche keywords (1-3 words)
    if word_count <= 3:
        for indicator in CATEGORY_INDICATORS:
            if indicator in kw_lower:
                return "category_page"
        # Short niche like "latina cam", "milf webcam", "asian cam"
        if word_count <= 2 and any(sig in kw_lower for sig in ["cam", "webcam", "live"]):
            return "category_page"

    # Long-tail niche
    if word_count >= 3:
        return "niche_long_tail"

    return "category_page"


# ── Scoring ───────────────────────────────────────────────────────────────────

def score_keyword(kw, volume, difficulty, intent, category):
    """Score 0-100 for rankability on a zero-authority site."""
    score = 0
    words = kw.split()
    word_count = len(words)

    # Word count bonus
    if word_count >= 4:
        score += 30
    elif word_count >= 3:
        score += 20
    elif word_count >= 2:
        score += 10

    # Low difficulty
    if difficulty <= 5:
        score += 30
    elif difficulty <= 15:
        score += 20
    elif difficulty <= 30:
        score += 10

    # Volume sweet spot
    if 50 <= volume <= 500:
        score += 20
    elif 500 < volume <= 2000:
        score += 15
    elif 10 <= volume < 50:
        score += 10
    elif 2000 < volume <= 5000:
        score += 5

    # Intent bonus
    intent_lower = intent.lower()
    if "commercial" in intent_lower or "transactional" in intent_lower:
        score += 10

    # Category bonus
    if category == "model_name":
        score += 10

    return min(100, score)


# ── Main ──────────────────────────────────────────────────────────────────────

def main(dry_run=False):
    print(f"📂 Scanning {RAW_DIR}...")

    csv_files = list(RAW_DIR.glob("*.csv"))
    print(f"   Found {len(csv_files)} CSV files\n")

    # Parse all files
    all_rows = []
    skipped = 0
    for f in csv_files:
        rows = parse_file(f)
        all_rows.extend(rows)
        if not rows:
            skipped += 1

    print(f"✅ Parsed {len(all_rows):,} total rows ({skipped} empty/unreadable files)\n")

    # Build DataFrame
    df = pd.DataFrame(all_rows)

    # ── Step 2: Filter junk ──
    print("🧹 Filtering junk...")
    df["_junk"] = df["keyword"].apply(is_junk)
    junk_df = df[df["_junk"]].copy()
    df = df[~df["_junk"]].copy()
    print(f"   Removed {len(junk_df):,} junk rows → {len(df):,} remaining\n")

    # ── Step 3: Deduplicate ──
    print("🔄 Deduplicating...")
    # Sort so rows with more data (higher volume) come first
    df["_data_quality"] = (df["volume"] > 0).astype(int) + (df["difficulty"] > 0).astype(int)
    df = df.sort_values(["keyword", "_data_quality", "volume"], ascending=[True, False, False])
    before = len(df)
    df = df.drop_duplicates(subset=["keyword"], keep="first")
    print(f"   Removed {before - len(df):,} duplicates → {len(df):,} unique keywords\n")

    # ── Step 4: Categorize ──
    print("🏷️  Categorizing...")
    df["category"] = df.apply(
        lambda r: categorize(
            r["keyword"], r["volume"], r["difficulty"],
            r["is_model_from_url"], r["is_competitor_site"]
        ),
        axis=1
    )

    # ── Step 5: Score ──
    print("📊 Scoring...")
    df["score"] = df.apply(
        lambda r: score_keyword(r["keyword"], r["volume"], r["difficulty"], r["intent"], r["category"]),
        axis=1
    )

    # ── Step 6: NSFW flag ──
    print("🔞 Flagging NSFW level...")
    df["nsfw_level"] = df["keyword"].apply(nsfw_level)
    df["content_generator"] = df["nsfw_level"].map({"safe": "claude", "nsfw": "arliai"})

    # ── Step 7: Output ──
    cols_out = ["keyword", "volume", "difficulty", "cpc", "intent",
                "score", "nsfw_level", "content_generator", "source"]

    tiers = {
        "tier1-models": df[df["category"] == "model_name"].sort_values("score", ascending=False),
        "tier2-longtail": df[df["category"] == "niche_long_tail"].sort_values("score", ascending=False),
        "tier3-categories": df[df["category"] == "category_page"].sort_values("score", ascending=False),
        "tier4-headterms": df[df["category"] == "head_term"].sort_values("score", ascending=False),
        "irrelevant": df[df["category"] == "irrelevant"].sort_values("score", ascending=False),
    }

    # Stats
    print("\n" + "═" * 60)
    print("📈 RESULTS SUMMARY")
    print("═" * 60)
    print(f"{'Total input rows':<35} {len(all_rows):>10,}")
    print(f"{'After junk filter':<35} {len(df) + len(junk_df) - len(junk_df):>10,}")
    print(f"{'After dedup (unique keywords)':<35} {len(df):>10,}")
    print()
    for tier_name, tier_df in tiers.items():
        safe_count = (tier_df["nsfw_level"] == "safe").sum()
        nsfw_count = (tier_df["nsfw_level"] == "nsfw").sum()
        print(f"  {tier_name:<30} {len(tier_df):>7,} total  ({safe_count:,} safe / {nsfw_count:,} nsfw)")

    print()
    print("🏆 TOP 10 per tier:")
    for tier_name, tier_df in list(tiers.items())[:3]:
        if len(tier_df) == 0:
            continue
        print(f"\n  [{tier_name}]")
        for _, row in tier_df.head(10).iterrows():
            print(f"    {row['keyword']:<45} vol={int(row['volume']):<6} kd={int(row['difficulty']):<4} score={int(row['score']):<4} [{row['nsfw_level']}]")

    if dry_run:
        print("\n⏭️  DRY RUN — no files written.")
        return

    # Write output files
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\n💾 Writing output to {OUT_DIR}/...")

    for tier_name, tier_df in tiers.items():
        out_path = OUT_DIR / f"{tier_name}.csv"
        tier_df[cols_out].to_csv(out_path, index=False)
        print(f"   ✓ {tier_name}.csv ({len(tier_df):,} rows)")

    # Full combined file
    full_df = df[df["category"] != "irrelevant"].sort_values("score", ascending=False)
    full_path = OUT_DIR / "full-deduplicated.csv"
    full_df[cols_out + ["category"]].to_csv(full_path, index=False)
    print(f"   ✓ full-deduplicated.csv ({len(full_df):,} rows)")

    # Stats text file
    stats_path = OUT_DIR / "stats.txt"
    with open(stats_path, "w") as f:
        f.write("KEYWORD PROCESSING STATS\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Total input rows: {len(all_rows):,}\n")
        f.write(f"After junk filter: {len(df):,}\n")
        f.write(f"Unique keywords: {len(df):,}\n\n")
        f.write("BY CATEGORY:\n")
        for tier_name, tier_df in tiers.items():
            f.write(f"  {tier_name}: {len(tier_df):,}\n")
        f.write("\nBY NSFW LEVEL:\n")
        for level in ["safe", "nsfw"]:
            count = (df["nsfw_level"] == level).sum()
            f.write(f"  {level}: {count:,}\n")
        f.write("\nTOP 20 PER TIER:\n")
        for tier_name, tier_df in list(tiers.items())[:3]:
            f.write(f"\n[{tier_name}]\n")
            for _, row in tier_df.head(20).iterrows():
                f.write(f"  {row['keyword']:<50} vol={int(row['volume']):<6} kd={int(row['difficulty']):<4} score={int(row['score'])}\n")

    print(f"   ✓ stats.txt")
    print(f"\n✅ Done!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process keyword files")
    parser.add_argument("--dry-run", action="store_true", help="Print stats without writing files")
    args = parser.parse_args()
    main(dry_run=args.dry_run)
