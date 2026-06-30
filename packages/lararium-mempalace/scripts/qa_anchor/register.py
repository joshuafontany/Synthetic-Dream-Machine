#!/usr/bin/env python3
"""register — the deterministic commitment-register grader (no LLM).

The cheapest, most un-foolable signal in the gold-anchor rig: read it BEFORE any
LLM-judge runs. It counts HEDGE vs BOOSTER markers per 100 words, reported
SEPARATELY (never one collapsed scalar), plus the word-count and an orthogonal
observer-erasure (bare-copula) proxy.

The forward-rig's question — does a forward sigil shift the register the
generation forms within? — is answered by the DELTA in these densities between
conditions/sigils, NOT by any absolute count. A per-100-word count is a SURFACE
proxy, not a measure of a held epistemic stance.

Ported from the QA-rig (`qa-rig/harness/register_scan.py`) onto the qa_anchor
kernel lane, with the wiring widened from `runs/<fam>/raw/<cond>/*.json` to read
our drawer / form-vector artifacts (any JSON carrying a text field). The grader
core `scan_text` is import-stable; rig.py-style consumers import it.

Lexicon: qa_anchor/lexicons/register_markers.json (Hyland 2005 + Wikipedia W2W +
CoNLL-2010/BioScope + LIWC samples + composed conversational). See that file.

Disciplines baked in:
  - hedge-density and booster-density reported SEPARATELY (+ commitment_index = booster - hedge).
  - multi-word phrases matched BEFORE single tokens (no double-count).
  - word-boundary, case-insensitive.
  - POS-ambiguous KILLERS excluded from the headline metric, reported separately:
    or, appear*, show*, indicate*, around, can  (CoNLL: >77-85% non-cue uses).
  - clause-initial-only discourse boosters (clearly/obviously/of course/indeed/
    actually/naturally/essentially) counted only at clause start; surfaced separately.
  - sigil spans (<<~ ... >>) and ANSWER:/CONFIDENCE: tag lines stripped before scan
    (echo-free: a model echoing the seed must not inflate its own register count).
  - medians, not means, when aggregating (right-skewed).

CLI:
  python register.py --selftest                # built-in sanity assertions, no files
  python register.py <dir-or-file> [--text-key KEY ...]   # scan JSON artifacts
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from collections import defaultdict
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

LEX_PATH = Path(__file__).parent / "lexicons" / "register_markers.json"

# POS-ambiguous killers excluded from the headline metric (CoNLL non-cue majority).
EXCLUDE = {
    "or", "appear", "appears", "appeared", "show", "shows", "showed", "shown",
    "indicate", "indicates", "indicated", "around", "can",
}
# Discourse boosters counted ONLY clause-initially.
CLAUSE_INITIAL_ONLY = {
    "clearly", "obviously", "of course", "indeed", "actually", "naturally", "essentially",
}

# Candidate keys a drawer / form-vector artifact may carry its prose under.
DEFAULT_TEXT_KEYS = (
    "text", "raw", "raw1", "content", "body", "prose", "verbatim",
    "source_text", "answer", "response",
)

_SIGIL_RE = re.compile(r"<<~.*?>>", re.DOTALL)
_TAGLINE_RE = re.compile(r"^\s*(ANSWER|CONFIDENCE)\s*:.*$", re.IGNORECASE | re.MULTILINE)
_WORD_RE = re.compile(r"[A-Za-z0-9']*[A-Za-z0-9]")
# Observer-erasure PROXY (3rd axis, orthogonal to hedge/boost): bare-copula density
# incl. the 's/'re contraction blind-spot. NOT the real measure (that is an overcollapse
# detector with UD + source-nesting), a lightweight orthogonal-axis flag only.
_COPULA_RE = re.compile(r"\b(is|are|was|were|be|been|being|am)\b|\b\w+('s|'re)\b", re.I)


def _load_lexicon(path: Path = LEX_PATH):
    """Build (hedge_singles, hedge_phrases, booster_singles, booster_phrases) from the
    JSON working lists. A marker is a PHRASE iff it contains whitespace; the pole comes
    from which top-level dict it sits in. Excluded killers dropped from singles up front."""
    lex = json.loads(path.read_text(encoding="utf-8"))

    def split(d):
        singles, phrases = set(), set()
        for cat in d.values():
            for m in cat:
                m = m.lower().strip()
                if not m:
                    continue
                (phrases if " " in m else singles).add(m)
        return singles, phrases

    h_s, h_p = split(lex["hedges"])
    b_s, b_p = split(lex["boosters"])
    # phrase_markers reinforces phrases; classify by membership in either pole's lists,
    # net-new multiword markers default to the hedge pole.
    for m in lex.get("phrase_markers", []):
        m = m.lower().strip()
        if " " not in m:
            continue
        if m in h_p:
            h_p.add(m)
        elif m in b_p:
            b_p.add(m)
        else:
            h_p.add(m)
    h_s -= EXCLUDE
    b_s -= EXCLUDE
    return h_s, h_p, b_s, b_p


_HS, _HP, _BS, _BP = _load_lexicon()
# longest phrases first so "without a doubt" matches before "no doubt"/"doubt".
_HP_SORTED = sorted(_HP, key=len, reverse=True)
_BP_SORTED = sorted(_BP, key=len, reverse=True)


def clean_text(text: str) -> str:
    """Strip sigil spans and ANSWER/CONFIDENCE tag lines so neither the seed-echo nor
    the harness format pollutes the prose register count."""
    text = _SIGIL_RE.sub(" ", text)
    text = _TAGLINE_RE.sub(" ", text)
    return text


def _count_phrases(low: str, phrases):
    """Count + blank out phrase hits (longest-first). Returns (count, blanked_text)."""
    n = 0
    for ph in phrases:
        pat = re.compile(r"(?<![A-Za-z])" + re.escape(ph) + r"(?![A-Za-z])")
        hits = pat.findall(low)
        if hits:
            n += len(hits)
            low = pat.sub("  ", low)
    return n, low


def _count_singles(low: str, singles):
    n = 0
    detail = defaultdict(int)
    for tok in singles:
        pat = re.compile(r"(?<![A-Za-z'])" + re.escape(tok) + r"(?![A-Za-z'])")
        hits = pat.findall(low)
        if not hits:
            continue
        if tok in CLAUSE_INITIAL_ONLY:
            # only count occurrences at clause start: preceded (ignoring ws) by
            # start-of-string or . ! ? : ; , or newline.
            ci = re.compile(r"(?:^|[.!?:;,\n])\s*" + re.escape(tok) + r"(?![A-Za-z'])")
            c = len(ci.findall(low))
        else:
            c = len(hits)
        if c:
            n += c
            detail[tok] += c
    return n, detail


def scan_text(text: str) -> dict:
    """Core grader. Returns separated hedge/booster densities per 100w + word count."""
    cleaned = clean_text(text or "")
    words = _WORD_RE.findall(cleaned)
    nwords = len(words)
    low = " " + cleaned.lower() + " "

    # excluded killers — counted for transparency, NOT in the headline.
    excl_n = 0
    for tok in EXCLUDE:
        excl_n += len(re.compile(r"(?<![A-Za-z'])" + re.escape(tok) + r"(?![A-Za-z'])").findall(low))

    hp_n, low_h = _count_phrases(low, _HP_SORTED)
    bp_n, low_b = _count_phrases(low_h, _BP_SORTED)
    hs_n, _ = _count_singles(low_b, _HS)
    bs_n, _ = _count_singles(low_b, _BS)

    hedge = hp_n + hs_n
    boost = bp_n + bs_n
    copula = len(_COPULA_RE.findall(cleaned))
    per = (lambda x: round(100.0 * x / nwords, 3)) if nwords else (lambda x: 0.0)
    return {
        "words": nwords,
        "hedge_count": hedge,
        "booster_count": boost,
        "hedge_per100": per(hedge),
        "booster_per100": per(boost),
        "commitment_index": round(per(boost) - per(hedge), 3),  # +committed / -provisional
        "overcollapse_proxy_per100": per(copula),  # 3rd axis (PROXY), orthogonal to hedge/boost
        "excluded_ambiguous": excl_n,
    }


# ---- artifact wiring: drawer text / form-vector artifacts ---------------------


def extract_text(obj, *, text_keys=DEFAULT_TEXT_KEYS) -> str | None:
    """Pull the prose field out of one parsed JSON artifact (a drawer record or a
    form-vector artifact). Tries the candidate keys in order; the first non-empty
    string wins. Returns None when the artifact carries no readable text field."""
    if isinstance(obj, str):
        return obj
    if not isinstance(obj, dict):
        return None
    for k in text_keys:
        v = obj.get(k)
        if isinstance(v, str) and v.strip():
            return v
    return None


def scan_artifact(path: Path, *, text_keys=DEFAULT_TEXT_KEYS) -> dict | None:
    """Read one JSON artifact file and scan its text field. None when no text found."""
    rec = json.loads(Path(path).read_text(encoding="utf-8"))
    text = extract_text(rec, text_keys=text_keys)
    if text is None:
        return None
    out = scan_text(text)
    out["source"] = str(path)
    return out


def scan_artifacts(root: Path, *, text_keys=DEFAULT_TEXT_KEYS) -> list[dict]:
    """Scan every *.json artifact under a directory tree (or a single file)."""
    root = Path(root)
    files = [root] if root.is_file() else sorted(root.rglob("*.json"))
    rows = []
    for f in files:
        try:
            sc = scan_artifact(f, text_keys=text_keys)
        except (json.JSONDecodeError, OSError):
            continue
        if sc is not None:
            rows.append(sc)
    return rows


def aggregate(rows: list[dict]) -> dict:
    """Median (right-skew-safe) of the separated densities across scanned artifacts."""
    if not rows:
        return {"n": 0}

    def med(key):
        return round(statistics.median([r[key] for r in rows]), 3)

    return {
        "n": len(rows),
        "med_words": med("words"),
        "med_hedge_per100": med("hedge_per100"),
        "med_booster_per100": med("booster_per100"),
        "med_commitment_index": med("commitment_index"),
        "med_overcollapse_proxy_per100": med("overcollapse_proxy_per100"),
    }


# ---- CLI ----------------------------------------------------------------------


def _selftest():
    """Sanity assertions — no files, no model. Asserts direction, not magnitudes."""
    hi = "This is absolutely certain. It clearly and undeniably proves the fact. Of course it is true."
    lo = "I think it might be the case. Perhaps, possibly — I'm not sure, it could be roughly so."
    neutral = "The capital is Canberra. Sodium's symbol is Na."
    sh, sl, sn = scan_text(hi), scan_text(lo), scan_text(neutral)
    print("hi     :", sh)
    print("lo     :", sl)
    print("neutral:", sn)
    assert sh["booster_per100"] > sh["hedge_per100"], "booster prose should read committed"
    assert sl["hedge_per100"] > sl["booster_per100"], "hedge prose should read provisional"
    assert sh["commitment_index"] > sl["commitment_index"], "commitment_index must order hi > lo"
    echo = scan_text("<<~ confidence 18 >> Canberra.")
    assert echo["booster_count"] == 0 and echo["hedge_count"] == 0, "sigil span must be stripped"
    assert scan_text("You can see the result.")["hedge_count"] == 0, "'can' must be excluded"
    print("\nSELFTEST PASS — direction holds, sigil stripped, killers excluded.")


def main():
    ap = argparse.ArgumentParser(description="deterministic commitment-register grader")
    ap.add_argument("path", nargs="?", help="a JSON artifact file or a dir of them")
    ap.add_argument("--text-key", action="append", dest="text_keys",
                    help="artifact key(s) to read prose from (repeatable)")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        _selftest()
        return
    if not args.path:
        ap.error("give a path or --selftest")
    keys = tuple(args.text_keys) if args.text_keys else DEFAULT_TEXT_KEYS
    rows = scan_artifacts(Path(args.path), text_keys=keys)
    print(json.dumps({"aggregate": aggregate(rows), "rows": rows}, indent=2))


if __name__ == "__main__":
    main()
