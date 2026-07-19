#!/usr/bin/env python3
"""kumulipo_bed — the test bed with an answer key, and the wall that keeps the key from the instrument.

WHY THIS BED. Every rhythm claim we make on our own transcripts grades its own homework: we have no
ground truth there, so an instrument that manufactures its finding passes silently. The Kumulipo hands
us the thing our corpus cannot — HIERARCHICAL STRUCTURE THAT NOBODY BUILT FOR OUR CONVENIENCE. An
18th-century chant, sixteen wā, marked in the source. So the claim becomes falsifiable:

    Does the instrument rediscover the sixteen wā WITHOUT BEING TOLD THEY EXIST?

An instrument that cannot find the wā has no business claiming to find an Arc in a conversation.

WHY IT DEFEATS A WINDOW, ARITHMETICALLY. The Hawaiian wā run 58 to 3352 lines — a 58x ratio. No single
window resolves wā 6 without shredding wā 11 into dozens of false positives. The chant stands as a MAUP
counterexample WITH AN ANSWER KEY: the unit manufactures the finding, and here we can prove it.

THE THREE BEDS (the mixed-grammar stress test):
  · hawaiian    — Beckwith's Kalakaua appendix. THE PRIMARY BED. An instrument that finds the wā in
                  English found the TRANSLATOR, never the chant.
  · beckwith    — the 1951 scholarly English: translation braided with commentary, textual notes, and
                  a critical apparatus. A different grammar entirely.
  · liliuokalani — the 1897 Queen's English. A third grammar, and the one that DISAGREES with the
                  Hawaiian about wā 13 (see THE BRANCH, below).

THE BRANCH — the sidechain, sitting inside the answer key. The Hawaiian names `KA WA UMIKUMAMAKOLU`,
a thirteenth ERA. Liliʻuokalani names the same span "A Branch of the Twelfth Era". The witnesses
disagree about whether 13 stands beside 12 or hangs beneath it. Our own corpus carries the identical
shape (37.6% of records fire `isSidechain`), and no design has resolved it. A hierarchical instrument
earns a real finding here: does it attach 13 UNDER 12, or beside it?

THE HINGE. The reading places the po -> ao turn between wā 8 and wā 9 — the night-born generations
giving way to the day and the human genealogies. Of the fifteen internal boundaries, that one should
carry the largest effect. So the sharp question runs past mere recall: OF THE FIFTEEN, DOES THE
STRONGEST LAND ON THE HINGE? Chance pays 1 in 15, and tolerance games cannot reach it.

THE WALL. `bed_text()` hands out TEXT ALONE. `ground_truth()` sits behind a separate call that no
instrument may make. The scorer crosses the wall; the instrument never does. Structural, not advisory —
an instrument that cannot see the key cannot fit to it.

KULEANA. This chant carries the genealogy of a living people, and we use it here as an instrument.
Name that in the record. Beckwith 1951 stands in the public domain (copyright not renewed); the chant
itself predates copyright entirely.
"""
from __future__ import annotations

import os
import re

_HERE = os.path.dirname(os.path.abspath(__file__))
# fixtures/ stays in the parent scripts/ dir, one level up from this testbeds/ home
_FIX = os.path.join(os.path.dirname(_HERE), "fixtures", "shuffled-kumulipo")

#: The wā markers each bed speaks in its own tongue. The Hawaiian counts to sixteen; the Queen's
#: English counts to twelve, then BRANCHES, then resumes at fourteen — she never writes a thirteenth.
_HAWAIIAN_WA = re.compile(r"^KA WA (AKAHI|ELUA|EKOLU|EHA|ELIMA|EONE|EONO|EHIKU|EWALU|EIWA|UMI"
                          r"|UMIKUMAMAKAHI|UMIKUMAMALUA|UMIKUMAMAKOLU|UMIKUMAMAHA|UMIKUMAMALIMA"
                          r"|UMIKUMAMAONO)\s*$")
_LILIU_WA = re.compile(r"^##\s+(?:The\s+)?(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth"
                       r"|Tenth|Eleventh|Twelfth|Fourteenth|Fifteenth|Sixteenth)\s+Era\s*$", re.I)
_LILIU_BRANCH = re.compile(r"^##\s+A Branch of the Twelfth Era\s*$", re.I)

#: The Hawaiian chant rides as an APPENDIX inside Beckwith's meme; these headings fence it.
_HAWAIIAN_OPEN = re.compile(r"^##\s+The Kalakaua Text \(Hawaiian\)\s*$")
_HAWAIIAN_CLOSE = re.compile(r"^##\s+Textual Notes\s*$")

#: The po -> ao turn: the night-born generations give way to the day. One boundary among the fifteen,
#: and the one an honest instrument should rank FIRST.
HINGE_WA = 9

#: The wā the Queen hangs BENEATH its predecessor rather than beside it.
BRANCH_WA = 13
BRANCH_PARENT_WA = 12


def _read(name: str) -> "list[str]":
    with open(os.path.join(_FIX, name), encoding="utf-8") as f:
        return f.read().splitlines()


def _hawaiian_lines() -> "list[str]":
    """Cut the Kalakaua appendix out of the Beckwith meme — the chant alone, no commentary."""
    lines = _read("kumulipo-beckwith.mem")
    start = end = None
    for i, ln in enumerate(lines):
        if start is None and _HAWAIIAN_OPEN.match(ln):
            start = i + 1
        elif start is not None and _HAWAIIAN_CLOSE.match(ln):
            end = i
            break
    if start is None:
        raise RuntimeError("the Kalakaua appendix went missing from the Beckwith bed")
    return lines[start:end if end is not None else len(lines)]


def _mark(lines: "list[str]", pattern: re.Pattern, extra: "re.Pattern | None" = None) -> "list[int]":
    """The 0-based line indices where a wā opens, in reading order."""
    out = []
    for i, ln in enumerate(lines):
        if pattern.match(ln) or (extra is not None and extra.match(ln)):
            out.append(i)
    return out


def _liliu_marks(lines: "list[str]") -> "list[int]":
    return _mark(lines, _LILIU_WA, _LILIU_BRANCH)


#: bed -> (lines, wā-opening indices). The instrument reads the first; only the scorer reads the second.
_BEDS = {
    "hawaiian": lambda: (lambda L: (L, _mark(L, _HAWAIIAN_WA)))(_hawaiian_lines()),
    "beckwith": lambda: (lambda L: (L, _mark(L, _HAWAIIAN_WA)))(_read("kumulipo-beckwith.mem")),
    "liliuokalani": lambda: (lambda L: (L, _liliu_marks(L)))(_read("kumulipo-liliuokalani.mem")),
}


def bed_names() -> "list[str]":
    return list(_BEDS)


def bed_text(bed: str) -> "list[str]":
    """THE INSTRUMENT'S ONLY DOOR. Lines of the bed, and nothing that names a wā.

    A caller reaching past this for the key has stopped testing an instrument and started fitting one.
    """
    lines, _ = _BEDS[bed]()
    return lines


def ground_truth(bed: str) -> dict:
    """THE KEY. The SCORER crosses this wall; an instrument never does.

    `boundaries` holds the FIFTEEN INTERNAL cuts (the opening of wā 1 names no boundary — every
    segmentation gets the start of the text for free, and counting it would inflate every score by a
    boundary nobody found).
    """
    lines, opens = _BEDS[bed]()
    lengths = [b - a for a, b in zip(opens, opens[1:] + [len(lines)])]
    return {
        "bed": bed,
        "n_lines": len(lines),
        "n_wa": len(opens),
        "wa_opens": opens,
        "boundaries": opens[1:],              # the 15 internal cuts — what a segmenter must find
        "segment_lengths": lengths,
        "hinge": opens[HINGE_WA - 1] if len(opens) >= HINGE_WA else None,
        "length_ratio": (max(lengths) / min(lengths)) if lengths else 0.0,
    }


if __name__ == "__main__":
    for name in bed_names():
        g = ground_truth(name)
        print(f"── {name}")
        print(f"   {g['n_lines']:>6} lines · {g['n_wa']} wā · {len(g['boundaries'])} internal boundaries")
        print(f"   segments: {g['segment_lengths']}")
        print(f"   min {min(g['segment_lengths'])} · max {max(g['segment_lengths'])} "
              f"· RATIO {g['length_ratio']:.1f}x  ← no single window spans this")
        print(f"   hinge (po -> ao, wā {HINGE_WA}) at line {g['hinge']}")
