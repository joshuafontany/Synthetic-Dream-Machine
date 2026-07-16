#!/usr/bin/env python3
"""shuffled_kumulipo — the SHAPE-PLACEBO leg of the Kumulipo square: the real chant's
own lines, sequence destroyed — the missing cell that completes the 2x2
{meaning, shape} x {kept, destroyed} (the Markov placebo destroys meaning and keeps
shape; this arm keeps meaning and destroys shape; the translations stand as the
wording-varied corner).

THE NAMED TRANSFORM — a deterministic seeded LINE PERMUTATION within each wa/section:

  PRESERVES · every line VERBATIM (lexicon, line-meanings, per-line token counts —
              the content plane's material stays whole) · the memetic-wikitext envelope
              byte-for-byte (only the lar: URIs move to the shuffled namespace) · every
              wa/section marker line verbatim AT ITS POSITION (the sectioner cuts the
              shuffled carrier at the SAME boundaries) · blank-line and rule/fence-line
              POSITIONS (stanza sizes and skeleton stay pinned, mirroring the Markov
              placebo's preserved skeleton — the two nulls differ on ONE axis each).
  DESTROYS  · line SEQUENCE within each wa — the refrain POSITIONS, the couplet
              adjacency, the genealogical list order; line-lengths survive shuffled
              (present, out of place), so a rhythm read decomposes on its second axis.

ANTI-MARKER GUARD BY CONSTRUCTION: the transform only PERMUTES existing non-marker
lines — no byte of any line changes, so no permutation can mint a section boundary the
real carrier lacks (the Markov placebo needs re-draws; this arm needs nothing).

DETERMINISM (clock purity): one random.Random seeded from (base seed · carrier
basename · scope ordinal) draws each scope's permutation — no wall-clock, no unseeded
RNG; the same seed regenerates the same bytes, so the fixtures commit and re-derive.

Usage (writes the two fixture memes; deterministic, re-runnable):
  python3 shuffled_kumulipo.py generate [--library <dir>] [--out <dir>] [--seed N]

Meme: lar:///ha.ka.ba/lararium/sensorium/shuffled-kumulipo
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys

from kumulipo_sections import section_corpus_file, source_text_span
from placebo_kumulipo import (
    _RULE_LINE_RE,
    _find_repo_root,
    _is_marker,
    _scopes,
    CARRIERS,
    DEFAULT_SEED,
    LIBRARY_DIR,
)

#: The fixtures home — beside the Markov placebo's, one dir per null.
FIXTURES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "fixtures", "shuffled-kumulipo")

# The envelope swaps ONLY these address strings (file-path first — it contains the
# library path as a substring, so order carries correctness; the placebo's discipline).
_URI_SWAPS = (
    ("bags/@lares/ha.ka.ba/lares/library/hawaii/kumulipo/",
     "packages/lararium-sensorium/scripts/fixtures/shuffled-kumulipo/"),
    ("ha.ka.ba/lares/library/hawaii/kumulipo/",
     "ha.ka.ba/lares/testbed/shuffled/kumulipo/"),
)


def _movable(line: str) -> bool:
    """A line the shuffle may move: non-blank, no sectioner grammar reads it as a
    boundary, and no rule/fence skeleton pins it (those positions hold, mirroring the
    Markov placebo's verbatim skeleton)."""
    return bool(line.strip()) and not _is_marker(line) and not _RULE_LINE_RE.match(line)


def shuffle_text(real_text: str, basename: str, seed: int = DEFAULT_SEED) -> str:
    """The whole transform: envelope verbatim (URIs swapped to the shuffled namespace),
    marker/blank/rule lines pinned at their positions, every other #source-text line
    PERMUTED within its own wa scope. Deterministic under (seed, basename)."""
    for old, new in _URI_SWAPS:
        real_text = real_text.replace(old, new)
    lines = real_text.split("\n")
    span = source_text_span(lines)
    if span is None:
        raise ValueError(f"shuffled_kumulipo: {basename!r} carries no balanced "
                         "#source-text block — nothing to shuffle")
    scope_of, n_scopes = _scopes(lines, span)

    out = list(lines)
    for scope in range(n_scopes):
        idx = [i for i, s in enumerate(scope_of) if s == scope and _movable(lines[i])]
        if len(idx) < 2:
            continue
        contents = [lines[i] for i in idx]
        rng = random.Random(f"shuffle:{seed}:{basename}:{scope}")
        rng.shuffle(contents)
        for i, line in zip(idx, contents):
            out[i] = line
    return "\n".join(out)


def _verify_mirror(basename: str, real_text: str, fake_text: str) -> dict:
    """The self-witness: the sectioner MUST cut real and shuffled at identical labels in
    BOTH modes, every aligned section's LINE MULTISET must match exactly (the shuffle
    preserves content wholesale — a stronger vow than the placebo's +-10% length), and
    enough sections must actually MOVE (a shuffle that fixes everything fakes the cell).
    Compares against the URI-swapped real (the envelope moves addresses in both arms)."""
    for old, new in _URI_SWAPS:
        real_text = real_text.replace(old, new)
    report: dict = {}
    for extract in (False, True):
        real_srcs = section_corpus_file(basename, real_text, extract=extract)
        fake_srcs = section_corpus_file(basename, fake_text, extract=extract)
        mode = "extracted" if extract else "wrapped"
        for r_src, f_src in zip(real_srcs, fake_srcs):
            r_labels = [label for label, _ in r_src["sections"]]
            f_labels = [label for label, _ in f_src["sections"]]
            if r_labels != f_labels:
                raise ValueError(f"shuffled_kumulipo: {r_src['source']} section labels "
                                 f"diverge (extract={extract}): {r_labels} != {f_labels}")
            moved = 0
            for (label, r_body), (_, f_body) in zip(r_src["sections"], f_src["sections"]):
                if sorted(r_body.split("\n")) != sorted(f_body.split("\n")):
                    raise ValueError(f"shuffled_kumulipo: {r_src['source']}/{label} line "
                                     f"multiset drifts (extract={extract}) — the shuffle "
                                     "must preserve content wholesale")
                if r_body != f_body:
                    moved += 1
            if not extract and moved * 2 < len(r_labels):
                raise ValueError(f"shuffled_kumulipo: {r_src['source']} moved only "
                                 f"{moved}/{len(r_labels)} sections — the shuffle "
                                 "under-destroys shape")
            report[f"{r_src['source']}:{mode}"] = {
                "sections": len(r_labels), "moved": moved,
            }
    return report


def generate(library_dir: str, out_dir: str, seed: int = DEFAULT_SEED) -> dict:
    """Generate both shuffled carriers from the real library shelf into `out_dir`,
    self-witnessing the mirror before any byte lands. Returns the witness report."""
    os.makedirs(out_dir, exist_ok=True)
    report: dict = {"seed": seed, "out": out_dir, "carriers": {}}
    for basename in CARRIERS:
        src = os.path.join(library_dir, basename)
        with open(src, encoding="utf-8") as fh:
            real_text = fh.read()
        fake_text = shuffle_text(real_text, basename, seed=seed)
        report["carriers"][basename] = _verify_mirror(basename, real_text, fake_text)
        with open(os.path.join(out_dir, basename), "w", encoding="utf-8") as fh:
            fh.write(fake_text)
    return report


def main() -> None:
    ap = argparse.ArgumentParser(
        description="shuffled_kumulipo — deterministic line-shuffled mirrors of the Kumulipo carriers")
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("generate", help="write both shuffled carriers into the fixtures home")
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
