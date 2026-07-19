#!/usr/bin/env python3
"""sense_analyze — the isomorphic ANALYSIS instrument. Point it at a POURED sensorium (one you poured into
sense-memory), read its content STREAM, and detect the boundaries the content's own structure holds. Pour
once (the pour machina); point the instrument at what you poured (this). One tool for any corpus — chant ·
prose · TW5 · pidgin — the per-corpus difference living in the poured data, never in bespoke code.

STREAM, not lines (MAUP-free): a poured sensorium holds a stream of blocks, not the scribe's line breaks, so
the tool reconstructs the stream the SAME way rejim pours it, then reads it word-grained (Foote/MDL find where
vocabulary and grammar change HANDS — a word-level signal). Boundaries report as STREAM POSITIONS (word-index),
never line indices. Two instruments over one pour: rejim reads recurrence/rhythm, this reads change-points.

DETECT-ONLY today — the instrument, blind to any ground-truth (the wall). It reports WHERE the content changes,
not whether it's "right". The scoring layer (a separate, ITERABLE truth spec, refined in feedback loops) rides
on top later; the detector never sees it.

Meme: lar:///ha.ka.ba/lararium/sensorium/sense-analyze
"""
from __future__ import annotations

import numpy as np

from content_io import ContentStore
from rejim_io import _content_stream          # the canonical poured-sensorium stream read (rejim's own door)
from sensorium import sensorium_dir, sensorium_paths

#: Foote kernel half-widths in WORDS — the scale prior in plain sight (how long a block must run to count as
#: one). Never a single width (that manufactures the finding); the sweep reports the surface across scales.
DEFAULT_HALVES = (4, 8, 16, 32, 64, 128)
#: Top-K peaks reported per scale — nobody types the boundary count; each scale offers its K strongest.
K_CUTS = 16


def resolve_content(sensorium: str) -> str:
    """A sensorium NAME (in sense-memory) OR an explicit root → its content-plane dir. `memory` and every
    poured bed resolve through the same roster the pour lands them in."""
    root = sensorium if "/" in sensorium or sensorium.startswith(".") else sensorium_dir(sensorium)
    return sensorium_paths(root).content


def stream_words(stream: str) -> "list[str]":
    """The content stream → words in reading order, lowercased + punctuation-stripped (a scribe's comma
    carries the scribe's decision, not the content's). The word INDEX is the MAUP-free position a cut reports
    at — a poured sensorium holds a stream, no lines, so there is nothing else to report against."""
    toks: list[str] = []
    for w in stream.split():
        w = "".join(c for c in w.lower() if c.isalnum() or c in "ʻ'-")
        if w:
            toks.append(w)
    return toks


def _rank_peaks(strength: np.ndarray, k: int, nms: int) -> "list[int]":
    """The k strongest positions, no two within `nms` — a burst around one seam must not harvest k slots.
    `nms` derives from k and the length (never from a look at the answer)."""
    order = np.argsort(-strength)
    out: list[int] = []
    for i in order:
        if all(abs(int(i) - j) >= nms for j in out):
            out.append(int(i))
            if len(out) == k:
                break
    return out


def foote_novelty(codes: np.ndarray, half: int) -> np.ndarray:
    """Correlate a Gaussian-tapered checkerboard down the diagonal of the EXACT-MATCH dotplot (Foote, ICME
    2000). The kernel factors rank-one and the dotplot is a one-hot Gram matrix, so the correlation collapses
    to novelty(i) = ‖ Σ_a u[a]·e_{i+a} ‖² — the squared norm of the u-weighted symbol histogram over the
    window. O(n·h), exact, which lets the sweep run to a wide kernel."""
    n = len(codes)
    a = np.arange(-half, half, dtype=np.float64)
    u = np.sign(a + 0.5) * np.exp(-0.5 * (a / (half / 2.0)) ** 2)
    nov = np.zeros(n)
    for i in range(n):
        acc: dict = {}
        lo, hi = max(0, i - half), min(n, i + half)
        for p in range(lo, hi):
            c = int(codes[p])
            acc[c] = acc.get(c, 0.0) + u[p - i + half]
        nov[i] = sum(v * v for v in acc.values())
    return nov


def foote_sweep(toks: "list[str]", halves, k: int = K_CUTS) -> dict:
    """Sweep the Foote kernel across scales — each half-width offers its K strongest change-points as WORD
    positions in the stream. The per-scale surface, never one manufactured width."""
    vocab = {w: i for i, w in enumerate(dict.fromkeys(toks))}
    codes = np.fromiter((vocab[w] for w in toks), dtype=np.int32, count=len(toks))
    n = len(codes)
    nms = max(1, n // (2 * k))
    out = {}
    for h in halves:
        if 2 * h >= n:
            continue                                    # a kernel wider than the stream reads nothing
        nov = foote_novelty(codes, h)
        out[f"foote-{2 * h}"] = sorted(_rank_peaks(nov, k, nms))
    return out


def detect(sensorium: str, *, halves=DEFAULT_HALVES) -> dict:
    """DETECT-ONLY over a poured sensorium: reconstruct its content stream → words → Foote change-points at
    each scale, reported as word positions. Blind to any ground-truth (the wall). Returns the boundary
    surface + the stream size, and retains the words in-memory for context snippets (not persisted)."""
    content = resolve_content(sensorium)
    stream = _content_stream(ContentStore(content))
    toks = stream_words(stream)
    return {"sensorium": sensorium, "n_chars": len(stream), "n_words": len(toks),
            "boundaries": foote_sweep(toks, halves) if toks else {}, "_words": toks}


def context(words: "list[str]", pos: int, span: int = 6) -> str:
    """The stream around a boundary word-position — the words just before and after the cut, for the eye to
    read what changed hands. A ⟂ marks the cut."""
    lo, hi = max(0, pos - span), min(len(words), pos + span)
    return " ".join(words[lo:pos]) + "  ⟂  " + " ".join(words[pos:hi])


def main() -> None:
    import argparse
    import json
    ap = argparse.ArgumentParser(description="sense_analyze — detect boundaries in a POURED sensorium's stream")
    ap.add_argument("sensorium", help="a sensorium NAME in sense-memory (or an explicit root path)")
    ap.add_argument("--halves", default=None, help="Foote kernel half-widths (words), comma-separated")
    ap.add_argument("--span", type=int, default=6, help="context words each side of a reported boundary")
    ap.add_argument("--json", action="store_true", help="emit the boundary surface as JSON")
    args = ap.parse_args()
    halves = tuple(int(h) for h in args.halves.split(",")) if args.halves else DEFAULT_HALVES

    res = detect(args.sensorium, halves=halves)
    if args.json:
        print(json.dumps({k: v for k, v in res.items() if not k.startswith("_")}, indent=2))
        return
    words = res["_words"]
    print(f"\n  {args.sensorium} · {res['n_words']:,} words · {res['n_chars']:,} chars\n")
    if not words:
        print("  (empty stream — is this sensorium poured?)")
        return
    for arm, cuts in res["boundaries"].items():
        print(f"  {arm:>10} · {len(cuts)} boundaries: {cuts}")
        for c in cuts[:8]:
            print(f"      @{c:>6}   {context(words, c, args.span)}")


if __name__ == "__main__":
    main()
