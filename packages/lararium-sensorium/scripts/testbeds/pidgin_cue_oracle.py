#!/usr/bin/env python3
r"""pidgin_cue_oracle — the CONTROL the bed cannot be read without. Not an instrument; a proof of solvability.

WHY IT EXISTS. If every real arm scores near zero on this bed, a reader cannot tell two very different things
apart:

    (a) the arms cannot find the register switch, or
    (b) the bed's answer key does not line up with its own text, and NOTHING could find it.

So a DELIBERATELY STUPID detector runs first and settles it. It reads no language, no grammar, no statistics.
It fires on the surface cue and nothing else: the envelope tag line and the code fence. On the CUED arm it
should score near-perfectly — the cue sits exactly where the switch sits, by construction. On the DECUED arm
it should COLLAPSE — the decue removed the very tokens it reads.

That pair of numbers calibrates the whole run:
  · cued lift HIGH   → the key lines up with the text; a detector that finds the delimiter aces the bed.
  · decued lift ~0   → the decue really did remove the cheap cue, rather than merely renaming it.
  · any real arm scoring at the oracle's cued level HAS FOUND THE DELIMITER, never the grammar.

The oracle is the manufactured finding, built on purpose and labelled, so no other arm can smuggle it in.
"""
from __future__ import annotations

import argparse
import json
import re

import pidgin_bed
from boundary_score import make_truth, render, report

_ENVELOPE = re.compile(r"^\s*</?(?:tool_use|param)\b")
_FENCE = re.compile(r"^\s*```")


def cue_cuts(lines: "list[str]") -> "list[int]":
    """Fire where the SURFACE says a unit opens. Zero linguistics; zero statistics; zero shame."""
    out = []
    for i, ln in enumerate(lines):
        if i and (_ENVELOPE.match(ln) or _FENCE.match(ln)):
            out.append(i)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="the surface-cue oracle — the bed's solvability control")
    ap.add_argument("--bed", action="append", choices=pidgin_bed.bed_names())
    ap.add_argument("--json")
    a = ap.parse_args()
    out = []
    for bed in (a.bed or pidgin_bed.bed_names()):
        lines = pidgin_bed.bed_text(bed)                    # THE INSTRUMENT'S ONLY DOOR
        pred = cue_cuts(lines)
        g = pidgin_bed.ground_truth(bed)
        k = len(g["boundaries"])
        rep = report(pred, make_truth(g), ranked=pred)      # cues fire on lines → a line-coordinate truth
        best = max(rep["tolerance_curve"], key=lambda r: r["lift"])
        print(f"\n▓▓ CUE ORACLE · {bed} · {len(pred)} cue lines vs {k} true switches")
        render(rep)
        out.append({"bed": bed, "n_cue": len(pred), "k": k, "best": best})
    if a.json:
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=1)


if __name__ == "__main__":
    main()
