#!/usr/bin/env python3
"""kumulipo_run — pour the chant as a character stream and score it against its own wā.

THE QUESTION, and the whole reason the bed exists:

    Does the instrument rediscover the sixteen wā WITHOUT BEING TOLD THEY EXIST?

The pour reads LINES OF TEXT and nothing else. The wā ride behind `kumulipo_bed.ground_truth`, which the
SCORER reads and the INSTRUMENT never does. Structural, never advisory — an instrument that cannot see
the key cannot fit to it.

WHAT RUNS (each answering a way the instrument could lie):

  · THE POUR — the corpus end-to-end as one character stream, MODWT at a LADDER of zonings, per-band
    energy against per-band block-shuffle surrogates.
  · THE ZONING GATE — a scale earns REPRODUCED only by peaking under EVERY zoning eligible to resolve
    it. A real band HOLDS under a change of grain; an ALIAS MOVES. A scale that moves gets REFUSED, and
    emits no boundaries at all — so only scales that survived re-zoning ever reach the scorer. The gate
    stands upstream of every number below it.
  · THE SCORE — the pre-registered ladder: the tolerance CURVE, never a number, each rung beside the
    recall a COIN FLIP would harvest at that width. The `lift` column strips a tolerance-driven score
    naked: a random detector scores 0.20 at +-50 and lifts by -0.007.
  · THE PLACEBO — the same pour over a LINE-SHUFFLED bed. Shuffling holds every line intact and destroys
    only their ORDER, so a band that survives it read the SHAPE of lines; a band that dies with it read
    the chant's own sequence. Meaning-death separates the two, and a discovery that survives meaning-death
    never found meaning.

WHY THIS CHANT AND NOT OUR OWN TRANSCRIPTS. The wā run 58 to 3352 lines — a 58x ratio. No single window
resolves the sixth without shredding the eleventh. The chant stands as a MAUP counterexample WITH AN
ANSWER KEY, which is precisely what our own corpus can never be: there, an instrument that manufactures
its finding passes in silence.

KULEANA. This chant carries the genealogy of a living people and we use it here as an instrument. Say so.
"""
from __future__ import annotations

import argparse
import json
import random

import numpy as np

from boundary_score import make_truth, remap, render, report
from ffz_continuous_pour import (
    ZONING_LADDER,
    band_boundaries,
    pour_ticks,
    reference_row,
    zoning_gate,
    zoning_read,
)
from kumulipo_bed import BRANCH_PARENT_WA, BRANCH_WA, bed_names, bed_text, ground_truth


def frames_from_lines(lines: "list[str]", stream: str = "kumulipo"):
    """One frame per LINE, newline carried.

    The newline pours as a character the text itself holds — never as a segmentation the instrument
    imposes. A human or a scribe CHOSE that break; dropping it would erase a decision already sitting in
    the data, and the strongest structural channel we have with it.
    """
    for i, ln in enumerate(lines):
        yield {"stream": stream, "seq": i, "text": ln + "\n"}


def line_offsets(lines: "list[str]") -> "list[int]":
    """Tick offset at which each line opens — the map from the character stream back to line numbers.

    The instrument speaks in TICKS; the answer key speaks in LINES. The scoring crosses that shore here,
    once, rather than in every caller getting it subtly wrong.
    """
    out, t = [], 0
    for ln in lines:
        out.append(t)
        t += len(ln) + 1
    return out


def pour_bed(lines: "list[str]", *, seed: int, surrogates: int) -> dict:
    """One bed, one pour: every signal poured at the whole zoning ladder, ruled by the gate, and read
    for boundaries ONLY where a scale HELD. Reads no answer key."""
    poured = pour_ticks(frames_from_lines(lines))
    out = {"n_ticks": poured["n_ticks"], "signals": {}}
    for name, sig in poured["signals"].items():
        if float(np.var(sig)) < 1e-12:
            out["signals"][name] = {"note": "flat — skipped", "gate": [], "reproduced": []}
            continue
        reads = zoning_read(sig, ladder=ZONING_LADDER, n_surrogates=surrogates, seed=seed)
        gate = zoning_gate(reads, poured["n_ticks"], ZONING_LADDER)
        reproduced = []
        for g in gate:
            if not g["reproduced"]:
                continue
            ref = reference_row(reads, g["scale_ticks"], g["eligible_zonings"])
            if ref is None:
                continue
            row, _lk, _v = ref
            reproduced.append({
                "band": g["band"], "scale_ticks": g["scale_ticks"],
                "energy_excess": g["energy_excess_by_zoning"].get(str(row["zoning"]), 0.0),
                "boundary_ticks": band_boundaries(row),          # the instrument's NATIVE tick positions
            })
        out["signals"][name] = {"gate": gate, "reproduced": reproduced}
    return out


def run_bed(bed: str, *, seed: int, surrogates: int, placebo: bool) -> dict:
    lines = bed_text(bed)                       # the instrument's ONLY door
    g = ground_truth(bed)                       # the SCORER crosses the wall; the pour never does
    print(f"\n{'═' * 78}\n  {bed.upper()} · {len(lines)} lines · {g['n_wa']} wā "
          f"· segments {min(g['segment_lengths'])}–{max(g['segment_lengths'])} "
          f"(ratio {g['length_ratio']:.0f}x)\n{'═' * 78}")

    real = pour_bed(lines, seed=seed, surrogates=surrogates)
    print(f"  poured {real['n_ticks']:,} character ticks\n")
    # the answer key rides into the instrument's OWN coordinate — the line-indexed wā opens map to character
    # ticks, so FFZ scores where it perceives (ticks) instead of round-tripping through lines. Lines survive
    # only as the key's authoring format; nothing perceives in them.
    truth = remap(make_truth(g, branch={"wa": BRANCH_WA, "parent": BRANCH_PARENT_WA}),
                  line_offsets(lines), "tick", real["n_ticks"])

    print("  ── THE ZONING GATE (a real band HOLDS under re-zoning; an alias MOVES)")
    for name, s in real["signals"].items():
        if s.get("note"):
            print(f"     {name:<18} {s['note']}")
            continue
        if not s["gate"]:
            print(f"     {name:<18} no scale cleared the energy null at any zoning")
            continue
        for row in s["gate"]:
            ex = ", ".join(f"D{d}:{row['energy_excess_by_zoning'].get(str(d), 0):.2f}"
                           for d in row["eligible_zonings"])
            print(f"     {name:<18} {row['band']:<8} {row['scale_ticks']:>7}t  "
                  f"{row['verdict']:<10} held {len(row['held_zonings'])}/"
                  f"{len(row['eligible_zonings'])} rungs  [{ex}]")

    plac = pour_bed(_shuffle_lines(lines, seed), seed=seed, surrogates=surrogates) if placebo else None

    print("\n  ── THE WĀ TEST — the scales that SURVIVED the gate, scored against the chant's sixteen")
    results = {}
    for name, s in real["signals"].items():
        for p in s.get("reproduced", []):
            bt = p["boundary_ticks"]
            if not bt:
                continue
            rep = report(bt, truth, ranked=bt)
            best = max(rep["tolerance_curve"], key=lambda r: r["lift"])
            # A scale that beats BOTH floors and survives meaning-death has found the chant, not itself.
            surviving = None
            if plac:
                pb = [q for q in plac["signals"].get(name, {}).get("reproduced", [])
                      if q["band"] == p["band"]]
                surviving = bool(pb)
            key = f"{name}/{p['band']}"
            results[key] = {"report": rep, "best": best, "excess": p["energy_excess"],
                            "scale_ticks": p["scale_ticks"], "survives_shuffle": surviving}
            verdict = ("SHAPE-BORNE (survives meaning-death)" if surviving
                       else "CONTENT-BORNE (meaning-death kills it)" if surviving is False else "")
            flag = "  ★" if best["lift"] > 0.15 else ""
            print(f"     {key:<28} scale {p['scale_ticks']:>7}t  "
                  f"best-lift {best['lift']:+.3f} @±{best['tol']:<3} "
                  f"(recall {best['recall']:.2f} vs chance {best['chance_recall']:.2f})  "
                  f"{verdict}{flag}")
    if not results:
        print("     nothing to score — the gate refused every candidate scale")

    if results:
        star = max(results, key=lambda k: results[k]["best"]["lift"])
        print(f"\n  ── THE STRONGEST SURVIVING SCALE: {star}")
        render(results[star]["report"])

    return {"bed": bed,
            "gate": {name: [{k: row[k] for k in ("band", "scale_ticks", "verdict",
                                                 "held_zonings", "eligible_zonings")}
                            for row in s.get("gate", [])]
                     for name, s in real["signals"].items()},
            "results": {k: v["best"] for k, v in results.items()}}


def _shuffle_lines(lines: "list[str]", seed: int) -> "list[str]":
    """THE PLACEBO. Every line survives whole; only their ORDER dies.

    A band that still peaks read the SHAPE of lines (their lengths, their character mix) — properties a
    shuffle preserves exactly. A band that dies read the chant's own SEQUENCE. So the shuffle splits
    shape from meaning without touching a single character, and a rhythm that shrugs at meaning-death
    never found meaning.
    """
    out = list(lines)
    random.Random(seed).shuffle(out)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="pour the Kumulipo and ask whether it finds its own wā")
    ap.add_argument("--bed", action="append", choices=bed_names(),
                    help="repeatable; every bed when omitted")
    ap.add_argument("--seed", type=int, default=4241)
    ap.add_argument("--surrogates", type=int, default=3)
    ap.add_argument("--no-placebo", action="store_true", help="skip the meaning-death control")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    beds = a.bed or bed_names()
    out = [run_bed(b, seed=a.seed, surrogates=a.surrogates, placebo=not a.no_placebo)
           for b in beds]
    if a.json:
        print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
