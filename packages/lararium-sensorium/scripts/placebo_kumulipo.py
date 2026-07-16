#!/usr/bin/env python3
"""placebo_kumulipo — the PLACEBO leg of the Kumulipo dual-run ablation: two nonsense
carrier memes mirroring the real triple's wrapping EXACTLY, with babble where the chant stood.

THE NAMED NULL this generator implements — order-1 word-Markov babble, trained PER SECTION
on that section's own lines, emitted line-for-line with the original token counts:

  PRESERVES · the memetic-wikitext envelope byte-for-byte (only the lar: URIs move to the
              placebo namespace) · every wa/section marker line verbatim (the sectioner cuts
              the placebo at the SAME boundaries, honest gaps included — no CHANT TWELVE,
              the two-PART chants, the Branch of the Twelfth Era) · line count, blank lines,
              per-line token counts (so per-section length lands well inside +-10%) · the
              markdown skeleton (heading hashes, list/verse-number lead tokens, rule lines,
              fence lines) and the `{p. N}` page markers in place · the section's lexicon
              and its approximate unigram/bigram frequencies (the chain draws successors
              observed in the section itself).
  DESTROYS  · word order beyond first-order adjacency (syntax above the bigram) · the
              long-range refrain/genealogy recurrence the chant carries across lines and
              wa · reference and MEANING.

  WHY THIS NULL, hand-rolled: the ablation wants "matched nonsense" — same red channel,
  same mechanical shape, meaning removed — so the babble must preserve exactly the
  statistics the wrapping and the parsers see while breaking what only meaning supplies.
  A pip generator (markovify) models punctuation-delimited SENTENCES and starves on
  unpunctuated chant verse; lorem-ipsum destroys the lexicon too (a different null). The
  ~60-line chain below implements the named null precisely, with explicit seeding.

DETERMINISM (clock purity): every draw rides random.Random seeded from
(base seed · carrier basename · scope ordinal · line ordinal) — no wall-clock, no unseeded
RNG anywhere; the same seed regenerates the same bytes, so the fixtures commit and re-derive.

ANTI-MARKER GUARD: a generated line matching ANY sectioner marker grammar (era heading,
CHANT line, KA WA line, appendix seam) re-draws, then mangles as a last resort — babble
never mints a section boundary the real carrier lacks.

Usage (writes the two fixture memes; deterministic, re-runnable):
  python3 placebo_kumulipo.py generate [--library <dir>] [--out <dir>] [--seed N]

Meme: lar:///ha.ka.ba/lararium/sensorium/placebo-kumulipo
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys

from kumulipo_sections import (
    _CHANT_RE,
    _KALAKAUA_HEAD_RE,
    _KAWA_RE,
    _LILI_ERA_RE,
    _LILI_POST_RE,
    _NOTES_HEAD_RE,
    section_corpus_file,
    source_text_span,
)

#: The default generation seed — one arbitrary constant, shared with the projector sweep
#: so the whole experiment keys on a single named number.
DEFAULT_SEED = 0x51611

#: The placebo carriers keep the REAL basenames (the sectioner routes on basename); the
#: namespace swap below keeps their addresses clearly out of the library.
CARRIERS = ("kumulipo-liliuokalani.mem", "kumulipo-beckwith.mem")

#: The real library shelf (relative to the repo root) and the fixtures home.
LIBRARY_DIR = os.path.join("bags", "@lares", "ha.ka.ba", "lares", "library",
                           "hawaii", "kumulipo")
FIXTURES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "fixtures", "placebo-kumulipo")

# The envelope swaps ONLY these address strings (file-path first — it contains the
# library path as a substring, so order carries correctness).
_URI_SWAPS = (
    ("bags/@lares/ha.ka.ba/lares/library/hawaii/kumulipo/",
     "packages/lararium-sensorium/scripts/fixtures/placebo-kumulipo/"),
    ("ha.ka.ba/lares/library/hawaii/kumulipo/",
     "ha.ka.ba/lares/testbed/placebo/kumulipo/"),
)

# Every sectioner marker grammar — these lines survive VERBATIM, and generated babble
# must never match one (the anti-marker guard).
_MARKER_RES = (_LILI_ERA_RE, _LILI_POST_RE, _CHANT_RE,
               _KALAKAUA_HEAD_RE, _NOTES_HEAD_RE, _KAWA_RE)

# Mechanical whole-line shapes that stay verbatim (rule lines, code fences) — they carry
# no lexicon, only skeleton.
_RULE_LINE_RE = re.compile(r"^\s*(?:[-*_=]{3,}|```.*)\s*$")
# Lead tokens that pin a line's markdown role in place (heading hashes, blockquote,
# list bullets, the appendix verse numbers).
_LEAD_TOKEN_RE = re.compile(r"^(?:#{1,6}|>|[-*+]|\d+\.)$")
# The `{p.` half of a page marker; its mate ends with `}` — the pair stays in place.
_PAGE_OPEN_RE = re.compile(r"^\{p\.$")


def _is_marker(line: str) -> bool:
    """A line the sectioner (any rendering's grammar) would read as a boundary."""
    return any(rx.match(line) for rx in _MARKER_RES)


def _kept_slots(tokens: list) -> list:
    """The token positions a babbled line keeps VERBATIM: the markdown lead token and
    every `{p. N}` page-marker pair (open + its mate). Returns a bool per position."""
    kept = [False] * len(tokens)
    if tokens and _LEAD_TOKEN_RE.match(tokens[0]):
        kept[0] = True
    i = 0
    while i < len(tokens):
        if _PAGE_OPEN_RE.match(tokens[i]):
            kept[i] = True
            if i + 1 < len(tokens) and tokens[i + 1].endswith("}"):
                kept[i + 1] = True
                i += 1
        i += 1
    return kept


class _Chain:
    """An order-1 word chain over ONE section scope: starts = the babbleable line-initial
    tokens, next[t] = the successors observed after t (occurrence order — deterministic
    training, deterministic draws under a seeded rng)."""

    def __init__(self) -> None:
        self.starts: list = []
        self.next: dict = {}
        self.lexicon: list = []

    def train(self, token_rows: list) -> None:
        """Feed the scope's babbleable token rows (one row per line, kept slots removed)."""
        for row in token_rows:
            if not row:
                continue
            self.starts.append(row[0])
            self.lexicon.extend(row)
            for a, b in zip(row, row[1:]):
                self.next.setdefault(a, []).append(b)

    def draw_line(self, n: int, rng: random.Random) -> list:
        """Draw n tokens: a start token, then chain successors (falling back to the whole
        lexicon where a token ends the observed adjacency)."""
        if n <= 0 or not self.lexicon:
            return []
        out = [rng.choice(self.starts or self.lexicon)]
        while len(out) < n:
            succ = self.next.get(out[-1])
            out.append(rng.choice(succ) if succ else rng.choice(self.lexicon))
        return out


def _scopes(lines: list, span: tuple) -> list:
    """Cut the #source-text interior into training scopes at the marker lines — the same
    boundaries the sectioner cuts, so each chain trains per section. Returns
    (scope_index_per_line, scope_count); lines outside the span carry scope -1."""
    lo, hi = span
    scope_of = [-1] * len(lines)
    scope = 0
    for i in range(lo, hi):
        if _is_marker(lines[i]):
            scope += 1
            scope_of[i] = -1        # the marker itself stays verbatim, trains nothing
        else:
            scope_of[i] = scope
    return scope_of, scope + 1


def _babble_line(line: str, chain: _Chain, rng: random.Random) -> str:
    """One line's babble: kept slots stay in place, every other token re-draws from the
    scope's chain (same token count). Whitespace between tokens normalizes to single
    spaces; the leading indent survives. Eight candidate draws compete and the one whose
    character length lands closest to the original wins — the +-10% per-section length
    vow holds even over tiny sections whose small denominators amplify token-length
    drift. The anti-marker guard drops any candidate colliding with a sectioner grammar,
    then mangles the last resort (babble never mints a boundary)."""
    tokens = line.split()
    kept = _kept_slots(tokens)
    n_babble = sum(1 for k in kept if not k)
    indent = line[: len(line) - len(line.lstrip())]

    best = None
    fallback = ""
    for _ in range(8):
        draws = chain.draw_line(n_babble, rng)
        if len(draws) < n_babble:                     # a starving scope pads from itself
            draws = (draws + tokens)[:n_babble]
        it = iter(draws)
        out = [t if k else next(it) for t, k in zip(tokens, kept)]
        candidate = indent + " ".join(out)
        fallback = candidate
        if _is_marker(candidate):
            continue
        delta = abs(len(candidate) - len(line))
        if best is None or delta < best[0]:
            best = (delta, candidate)
    if best is not None:
        return best[1]
    return fallback.lower()                           # the mangle: markers ride uppercase


def placebo_text(real_text: str, basename: str, seed: int = DEFAULT_SEED) -> str:
    """The whole transform: envelope verbatim (URIs swapped to the placebo namespace),
    marker/rule lines verbatim, every other #source-text line babbled by its section's
    own chain. Deterministic under (seed, basename)."""
    for old, new in _URI_SWAPS:
        real_text = real_text.replace(old, new)
    lines = real_text.split("\n")
    span = source_text_span(lines)
    if span is None:
        raise ValueError(f"placebo_kumulipo: {basename!r} carries no balanced "
                         "#source-text block — nothing to babble")
    scope_of, n_scopes = _scopes(lines, span)

    # Train one chain per scope on the babbleable token rows (kept slots excluded, so the
    # lexicon carries words, never skeleton).
    chains = [_Chain() for _ in range(n_scopes)]
    for i, line in enumerate(lines):
        s = scope_of[i]
        if s < 0 or not line.strip() or _RULE_LINE_RE.match(line):
            continue
        tokens = line.split()
        kept = _kept_slots(tokens)
        chains[s].train([[t for t, k in zip(tokens, kept) if not k]])

    out = []
    for i, line in enumerate(lines):
        s = scope_of[i]
        if s < 0 or not line.strip() or _RULE_LINE_RE.match(line):
            out.append(line)
            continue
        rng = random.Random(f"placebo:{seed}:{basename}:{s}:{i}")
        out.append(_babble_line(line, chains[s], rng))
    return "\n".join(out)


def _verify_mirror(basename: str, real_text: str, fake_text: str) -> dict:
    """The self-witness: the sectioner MUST cut real and placebo at identical labels in
    BOTH modes, and every aligned section's length must land inside +-10%. Fails LOUD on
    any drift — a placebo that drifts fakes the ablation."""
    report: dict = {}
    for extract in (False, True):
        real_srcs = section_corpus_file(basename, real_text, extract=extract)
        fake_srcs = section_corpus_file(basename, fake_text, extract=extract)
        for r_src, f_src in zip(real_srcs, fake_srcs):
            r_labels = [label for label, _ in r_src["sections"]]
            f_labels = [label for label, _ in f_src["sections"]]
            if r_labels != f_labels:
                raise ValueError(f"placebo_kumulipo: {r_src['source']} section labels "
                                 f"diverge (extract={extract}): {r_labels} != {f_labels}")
            ratios = []
            for (label, r_body), (_, f_body) in zip(r_src["sections"], f_src["sections"]):
                ratio = len(f_body) / max(1, len(r_body))
                if not (0.9 <= ratio <= 1.1):
                    raise ValueError(f"placebo_kumulipo: {r_src['source']}/{label} length "
                                     f"ratio {ratio:.3f} falls outside +-10% (extract={extract})")
                ratios.append(round(ratio, 4))
            mode = "extracted" if extract else "wrapped"
            report[f"{r_src['source']}:{mode}"] = {
                "sections": len(ratios),
                "length_ratio_min": min(ratios), "length_ratio_max": max(ratios),
            }
    return report


def generate(library_dir: str, out_dir: str, seed: int = DEFAULT_SEED) -> dict:
    """Generate both placebo carriers from the real library shelf into `out_dir`,
    self-witnessing the mirror before any byte lands. Returns the witness report."""
    os.makedirs(out_dir, exist_ok=True)
    report: dict = {"seed": seed, "out": out_dir, "carriers": {}}
    for basename in CARRIERS:
        src = os.path.join(library_dir, basename)
        with open(src, encoding="utf-8") as fh:
            real_text = fh.read()
        fake_text = placebo_text(real_text, basename, seed=seed)
        report["carriers"][basename] = _verify_mirror(basename, real_text, fake_text)
        with open(os.path.join(out_dir, basename), "w", encoding="utf-8") as fh:
            fh.write(fake_text)
    return report


def _find_repo_root(start: str) -> str:
    """Walk up to the repo root (the directory holding `bags/`)."""
    d = os.path.abspath(start)
    while d != os.path.dirname(d):
        if os.path.isdir(os.path.join(d, "bags")):
            return d
        d = os.path.dirname(d)
    raise SystemExit("placebo_kumulipo: no repo root (bags/) above the script")


def main() -> None:
    ap = argparse.ArgumentParser(
        description="placebo_kumulipo — deterministic nonsense mirrors of the Kumulipo carriers")
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("generate", help="write both placebo carriers into the fixtures home")
    g.add_argument("--library", default=None,
                   help="the real kumulipo shelf (default: <repo>/bags/.../hawaii/kumulipo)")
    g.add_argument("--out", default=FIXTURES_DIR)
    g.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = ap.parse_args()
    library = args.library or os.path.join(
        _find_repo_root(os.path.dirname(os.path.abspath(__file__))), LIBRARY_DIR)
    out = generate(library, os.path.expanduser(args.out), seed=args.seed)
    sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
