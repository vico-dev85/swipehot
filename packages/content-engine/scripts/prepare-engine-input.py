"""
prepare-engine-input.py
=======================
Produces two clean input files for the xcam.vip content engine:

  1. packages/content-engine/data/model-names.csv
     - Deduped Chaturbate usernames from tier1-models.csv
     - Best row kept per username (highest score, then highest volume)
     - Columns: username, volume, difficulty, score, nsfw_level, content_generator
     - Sorted: score DESC, volume DESC

  2. packages/content-engine/data/general-keywords.csv
     - Combined tier2-longtail + tier3-categories
     - Columns: keyword, volume, difficulty, cpc, score, nsfw_level, content_generator, tier
     - Sorted: score DESC, volume DESC
"""

import csv
import os

BASE      = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PROCESSED = os.path.join(BASE, "data", "processed")
OUT_DIR   = os.path.join(BASE, "data")
TIER1_IN  = os.path.join(PROCESSED, "tier1-models.csv")
TIER2_IN  = os.path.join(PROCESSED, "tier2-longtail.csv")
TIER3_IN  = os.path.join(PROCESSED, "tier3-categories.csv")
MODELS_OUT  = os.path.join(OUT_DIR, "model-names.csv")
GENERAL_OUT = os.path.join(OUT_DIR, "general-keywords.csv")

SUFFIXES = [
    "'s cam",
    "\u2019s cam",  # curly apostrophe
    ' chaturbate',
    ' mfc',
    ' stripchat',
    ' onlyfans',
]

# Words that are NOT part of a username — strip from the end after suffix removal
TRAILING_MODIFIERS = [
    "nude", "naked", "porn", "xxx", "sex", "hot", "live",
    "free", "video", "videos", "pics", "photos", "gallery",
]

def extract_username(raw_keyword):
    kw = raw_keyword.strip().lower()
    for suffix in SUFFIXES:
        if kw.endswith(suffix):
            kw = kw[: -len(suffix)]
            break
    # Remove any remaining apostrophes/quotes (straight or curly)
    kw = kw.replace(chr(39), "").replace(chr(0x2019), "").replace(chr(0x2018), "").replace(chr(34), "")
    kw = kw.strip()
    # Strip trailing modifiers ("cassies1 nude" → "cassies1")
    parts = kw.split()
    while len(parts) > 1 and parts[-1] in TRAILING_MODIFIERS:
        parts.pop()
    kw = "_".join(parts) if len(parts) > 1 else parts[0] if parts else ""
    return kw.strip()


def read_csv(path):
    with open(path, encoding="utf-8", errors="replace", newline="") as fh:
        return list(csv.DictReader(fh))


def safe_float(val):
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0

def build_model_names():
    print("=" * 60)
    print("FILE 1: model-names.csv")
    print("=" * 60)
    rows = read_csv(TIER1_IN)
    print(f"  Keywords read from tier1-models.csv : {len(rows):,}")
    best = {}
    for row in rows:
        username = extract_username(row["keyword"])
        if not username:
            continue
        score  = safe_float(row.get("score",  0))
        volume = safe_float(row.get("volume", 0))
        if username not in best:
            best[username] = dict(row)
            best[username]["_username"] = username
            best[username]["_score"]    = score
            best[username]["_volume"]   = volume
        else:
            prev_score  = best[username]["_score"]
            prev_volume = best[username]["_volume"]
            if score > prev_score or (score == prev_score and volume > prev_volume):
                best[username] = dict(row)
                best[username]["_username"] = username
                best[username]["_score"]    = score
                best[username]["_volume"]   = volume
    sorted_models = sorted(best.values(), key=lambda r: (-r["_score"], -r["_volume"]))
    output_cols = ["username", "volume", "difficulty", "score", "nsfw_level", "content_generator"]
    with open(MODELS_OUT, "w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=output_cols, extrasaction="ignore")
        writer.writeheader()
        for row in sorted_models:
            writer.writerow({
                "username":          row["_username"],
                "volume":            row.get("volume", "0"),
                "difficulty":        row.get("difficulty", "0"),
                "score":             row.get("score", "0"),
                "nsfw_level":        row.get("nsfw_level", ""),
                "content_generator": row.get("content_generator", ""),
            })
    print(f"  Unique usernames out                : {len(sorted_models):,}")
    print(f"  Written to                          : {os.path.abspath(MODELS_OUT)}")
    print()
    print("  Top 20 usernames by score (then volume):")
    print("  {:<4} {:<35} {:>6} {:>8}".format("#", "username", "score", "volume"))
    print("  " + "-" * 58)
    for i, row in enumerate(sorted_models[:20], 1):
        print("  {:<4} {:<35} {:>6.0f} {:>8.0f}".format(i, row["_username"], row["_score"], row["_volume"]))

def build_general_keywords():
    print()
    print("=" * 60)
    print("FILE 2: general-keywords.csv")
    print("=" * 60)
    tier2 = read_csv(TIER2_IN)
    tier3 = read_csv(TIER3_IN)
    print(f"  Rows from tier2-longtail.csv        : {len(tier2):,}")
    print(f"  Rows from tier3-categories.csv      : {len(tier3):,}")
    combined = []
    for row in tier2:
        r = dict(row)
        r["tier"] = "longtail"
        combined.append(r)
    for row in tier3:
        r = dict(row)
        r["tier"] = "category"
        combined.append(r)
    print(f"  Combined total                      : {len(combined):,}")
    combined.sort(key=lambda r: (-safe_float(r.get("score", 0)), -safe_float(r.get("volume", 0))))
    output_cols = ["keyword", "volume", "difficulty", "cpc", "score", "nsfw_level", "content_generator", "tier"]
    with open(GENERAL_OUT, "w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=output_cols, extrasaction="ignore")
        writer.writeheader()
        for row in combined:
            writer.writerow({
                "keyword":           row.get("keyword", ""),
                "volume":            row.get("volume", "0"),
                "difficulty":        row.get("difficulty", "0"),
                "cpc":               row.get("cpc", "0"),
                "score":             row.get("score", "0"),
                "nsfw_level":        row.get("nsfw_level", ""),
                "content_generator": row.get("content_generator", ""),
                "tier":              row.get("tier", ""),
            })
    print(f"  Written to                          : {os.path.abspath(GENERAL_OUT)}")
    longtail_rows = [r for r in combined if r["tier"] == "longtail"]
    category_rows = [r for r in combined if r["tier"] == "category"]
    safe_rows  = [r for r in combined if r.get("nsfw_level", "").lower() == "safe"]
    nsfw_rows  = [r for r in combined if r.get("nsfw_level", "").lower() == "nsfw"]
    other_rows = [r for r in combined if r.get("nsfw_level", "").lower() not in ("safe", "nsfw")]
    print()
    print("  Tier split:")
    print(f"    longtail : {len(longtail_rows):,}")
    print(f"    category : {len(category_rows):,}")
    print()
    print("  NSFW split:")
    print(f"    safe     : {len(safe_rows):,}")
    print(f"    nsfw     : {len(nsfw_rows):,}")
    print(f"    other    : {len(other_rows):,}")
    print()
    print("  Top 20 keywords by score (then volume):")
    print("  {:<4} {:<45} {:>6} {:>8} {:<10}".format("#", "keyword", "score", "volume", "tier"))
    print("  " + "-" * 78)
    for i, row in enumerate(combined[:20], 1):
        kw = row.get("keyword", "")[:43]
        print("  {:<4} {:<45} {:>6.0f} {:>8.0f} {:<10}".format(
            i, kw, safe_float(row.get("score", 0)), safe_float(row.get("volume", 0)), row["tier"]))


if __name__ == "__main__":
    build_model_names()
    build_general_keywords()
    print()
    print("Done.")
