#!/usr/bin/env python3
"""ffz_address — the rhythmic grain as a MEMBERSHIP TREE: a containment path, never a count.

    Theme . Arc . Measure . Beat . Segment [. block]

A band answers WHICH — which theme, which session, which topic, which turn — and never HOW MANY. The
address names the cell a moment sits in; the SEQUENCE (what came before what) rides the edge-DAG, and
never the address (lar:///ha.ka.ba/lararium/mesh/ffz-clock#the-spine).

WHY A TREE AND NOT A LADDER OF FREQUENCIES. The moment a band hardens into a count that scales
palace-wide, it manufactures a global now — one monotone integer every island must share. And a band
whose COUNT carries the signal cannot be truncated: lop the prefix and the meaning shatters (the Hox
cluster, where gene-ORDER maps to body-order, marks the exact anti-pattern). A LABEL truncates cleanly.
So: each band LABELS a cell; none of them tallies.

ONE OPERATION, THREE READINGS. The path is a materialized path, so the stored string IS the
longest-common-prefix, and the same computation reads three ways:

    ultrametric distance  ~ how far up two moments climb before they share a band
    longest-common-prefix ~ the shared head their two addresses hold
    lattice meet          ~ their lowest common ancestor

Distance therefore asks: THE SAME TURN? only the same session? only the same project? — ORDER-FREE, no
timeline crossed, no clock read. Coarsening is truncation. Two moments in the same Measure sit closer
than two in the same Arc, whatever wall-time separates them.

    d(a, b) = DEPTH - |longest common prefix of a and b|      (an ultrametric: d(a,c) <= max(d(a,b), d(b,c)))

THE TWO MOODS, AND WHY ONE TREE READS BOTH.

  RHIZOME (a live operator-AI chat) — the harness HANDS OVER the Beat: it ticks on the operator's
  grounding act, never on response delivery. Forks are sidechains, injections land where the message
  lands, handbacks are DAG-joins. Order lives on the edge-DAG.

  GEOLOGY (a curated artifact — a chant, a codebase) — NOBODY ever grounded it. There are no turns.
  So the Beat reads NULL, and the tree STILL STANDS: a Measure holds a Beat-less span exactly the way an
  era holds a stratum. A curated corpus must EARN every band it has; a rhizome is given one.

  Membership was never made of clock. That is why one instrument reads both.

THE PATH IS A PREFIX CODE. Every address is prefix-free at each level, so its length reads in BITS —
which puts the rhythmic grain in the SAME CURRENCY as the two-part code (l(G) + l(D|G), #the-cut). The
grain does not sit beside the compression. It folds into it, and `address_bits` prices it.

Usage:
    from ffz_address import FfzAddress, distance, meet, coarsen
    a = FfzAddress(theme="t1", arc="s0f3", measure=2, beat=17, segment=4)
    distance(a, b)                # 0..DEPTH — how far up before they share a band
    coarsen(a, "measure")         # drop everything finer; the prefix still reads
"""
from __future__ import annotations

import math
from dataclasses import dataclass

#: The bands, COARSE to FINE — the order the path is written in, so a prefix is always the coarser read.
BANDS: "tuple[str, ...]" = ("theme", "arc", "measure", "beat", "segment")
DEPTH = len(BANDS)

#: A band nobody grounded. Geology carries no Beat, and the tree reads on without it — the cell exists,
#: unnamed. `_` sorts and compares as a label like any other; it simply names "no container here".
NULL_BAND = "_"

#: The block: an OFFSET inside a segment, never a tick. Content-blocks in one inference share a single
#: emission instant — a finer ADDRESS, no finer beat. Store at the block, navigate at the segment.
BLOCK_SEP = ":"


@dataclass(frozen=True)
class FfzAddress:
    """One moment's rhythmic POSITION. Holds no decay, no age, no 'as of last sync' — a coordinate stays
    exactly as fresh whenever it gets read, because it counts nothing."""

    theme: str = NULL_BAND      # the thread/project cluster — a content community, spanning sessions
    arc: str = NULL_BAND        # the session-island (the source_file — given free)
    measure: str = NULL_BAND    # the topic-shift (a cosine-drop boundary, discovered)
    beat: str = NULL_BAND       # the grounding act — the LONE ratchet. NULL in geology.
    segment: str = NULL_BAND    # one generation step (the tick)
    block: "int | None" = None  # an offset inside the segment — an INDEX, never a tick

    def __post_init__(self) -> None:
        # EVERY BAND IS A STRING, and the law is structural rather than documented: a band LABELS a cell
        # and never tallies one, so a numeric-looking band coerces to its LABEL and no caller can subtract
        # two of them. `beat 17` and `beat 900` sit exactly as far apart as `beat 17` and `beat 18` —
        # the tree measures containment, and arithmetic on a label reads as a category error the type
        # system can simply refuse to spell.
        for b in BANDS:
            object.__setattr__(self, b, str(getattr(self, b)))

    def bands(self) -> "list[str]":
        return [getattr(self, b) for b in BANDS]

    def path(self) -> str:
        """The materialized path. The stored string IS the longest-common-prefix, so distance reads by
        string-prefix and needs no separate index."""
        p = ".".join(self.bands())
        return f"{p}{BLOCK_SEP}{self.block}" if self.block is not None else p

    def __str__(self) -> str:
        return self.path()


def parse(path: str) -> FfzAddress:
    """Read a path back. A short path fills NULL to the right — a truncated address stays a valid one."""
    head, _, blk = path.partition(BLOCK_SEP)
    parts = head.split(".")
    parts += [NULL_BAND] * (DEPTH - len(parts))
    return FfzAddress(*parts[:DEPTH], block=int(blk) if blk else None)


def common_prefix(a: FfzAddress, b: FfzAddress) -> int:
    """How many bands two moments share, reading coarse→fine. The LCP, the lattice-meet DEPTH, and the
    complement of the ultrametric — one computation, three names.

    A NULL band never MATCHES: two moments both lacking a Beat share no Beat, they share an ABSENCE. So a
    geology bed cannot manufacture closeness out of the band it never had.
    """
    n = 0
    for x, y in zip(a.bands(), b.bands()):
        if x == y and x != NULL_BAND:
            n += 1
        else:
            break
    return n


def distance(a: FfzAddress, b: FfzAddress) -> int:
    """THE ULTRAMETRIC — how far up two moments climb before they share a band.

    0 = the same segment · 1 = the same beat · … · DEPTH = they share nothing but the root. ORDER-FREE:
    it crosses no timeline, reads no clock, and asks only WHICH CONTAINER, never HOW FAR APART IN TIME.
    """
    return DEPTH - common_prefix(a, b)


def meet(a: FfzAddress, b: FfzAddress) -> FfzAddress:
    """The lattice MEET — the lowest common ancestor, as an address. The coarsest cell holding both."""
    n = common_prefix(a, b)
    kept = a.bands()[:n] + [NULL_BAND] * (DEPTH - n)
    return FfzAddress(*kept)


def coarsen(a: FfzAddress, to_band: str) -> FfzAddress:
    """Zoom out by TRUNCATION — drop every band finer than `to_band`; the prefix still reads.

    This is what a label buys and a count cannot: lop a Hox sequence's prefix and its colinear meaning
    shatters, because the position WAS the content. Lop a membership path and the coarser container
    simply remains.
    """
    i = BANDS.index(to_band)
    kept = a.bands()[: i + 1] + [NULL_BAND] * (DEPTH - i - 1)
    return FfzAddress(*kept)


def address_bits(a: FfzAddress, alphabet: "dict[str, int] | None" = None) -> float:
    """THE PATH'S PRICE, IN BITS — the grain in the SAME CURRENCY as the two-part code.

    A materialized path is a PREFIX CODE: each band names one cell among the siblings at its level, so
    the address costs sum(log2 |siblings at that level|) bits. Hand `alphabet` the observed branching
    factor per band (a count off the corpus, never a typed constant) and the address prices itself.

    Why this matters: the rhythmic grain stops sitting BESIDE the compression and folds INTO it. A
    boundary, a template, and a position all pay in one currency, and a claim that lengthens the code
    fails for the same reason whichever it was.
    """
    if not alphabet:
        return 0.0
    bits = 0.0
    for band, label in zip(BANDS, a.bands()):
        if label == NULL_BAND:
            continue                      # an ungrounded band costs nothing — geology pays for what it has
        k = max(1, alphabet.get(band, 1))
        bits += math.log2(k)
    return bits


def branching(addresses: "list[FfzAddress]") -> "dict[str, int]":
    """The observed branching factor per band — a COUNT off the corpus, never a typed constant. Feeds
    `address_bits`, so the address's price derives from the tree that actually stands."""
    out: dict = {}
    for band in BANDS:
        out[band] = len({getattr(a, band) for a in addresses if str(getattr(a, band)) != NULL_BAND})
    return out


if __name__ == "__main__":
    same_turn = FfzAddress("proj", "s0f3", 2, 17, 4)
    next_seg = FfzAddress("proj", "s0f3", 2, 17, 5)
    next_turn = FfzAddress("proj", "s0f3", 2, 18, 1)
    other_sess = FfzAddress("proj", "a91c", 0, 1, 1)
    geology = FfzAddress("kumulipo", "hawaiian", 11, NULL_BAND, 340)   # no grounding act, ever

    print("  ── the ultrametric: how far up before two moments share a band")
    for label, other in (("same beat, next segment", next_seg),
                         ("next turn", next_turn),
                         ("another session", other_sess),
                         ("a chant (no Beat)", geology)):
        print(f"     d = {distance(same_turn, other)}   meet = {meet(same_turn, other)}   ({label})")
    print(f"\n  ── truncation coarsens: {same_turn}  ->  {coarsen(same_turn, 'measure')}")
    alpha = branching([same_turn, next_seg, next_turn, other_sess, geology])
    print(f"  ── the path is a PREFIX CODE: {same_turn} costs {address_bits(same_turn, alpha):.2f} bits")
    print(f"     geology pays only for the bands it EARNED: {address_bits(geology, alpha):.2f} bits")
