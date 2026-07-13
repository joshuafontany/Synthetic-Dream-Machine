#!/usr/bin/env python3
"""kumulipo_run — pour the chant as a character stream and score it against its own wā.

THE QUESTION, and the whole reason the bed exists:

    Does the instrument rediscover the sixteen wā WITHOUT BEING TOLD THEY EXIST?

The pour reads LINES OF TEXT and nothing else. The wā ride behind `kumulipo_bed.ground_truth`, which the
SCORER reads and the INSTRUMENT never does. Structural, never advisory — an instrument that cannot see
the key cannot fit to it.

WHAT RUNS (each answering a way the instrument could lie):

  · THE POUR — the corpus end-to-end as one character stream, MODWT to the whole-pour scale, per-band
    energy against per-band block-shuffle surrogates. Boundaries fall out of each peaked band's crests.
  · THE SCORE — the pre-registered ladder: the tolerance CURVE, never a number, each rung beside the
    recall a COIN FLIP would harvest at that width. The `lift` column strips a tolerance-driven score
    naked: a random detector scores 0.20 at +-50 and lifts by -0.007.
  · THE PLACEBO — the same pour over a LINE-SHUFFLED bed. Shuffling holds every line intact and destroys
    only their ORDER, so a band that survives it read the SHAPE of lines; a band that dies with it read
    the chant's own sequence. Meaning-death separates the two, and a discovery that survives meaning-death
    never found meaning.
  · THE DISCOVERED WEIGHT — each structural mark poured its own unit-height channel, so the ladder now
    MEASURES which mark bears the rhythm at which scale. The typed constant is gone; the reading replaces
    it. A mark that peaks nowhere carries no rhythm, whatever weight a designer would have felt like
    giving it.
  · THE ZONING SWEEP (`--zoning`) — the gate the grain law has owed since it was written. A band earns
    REPRODUCED only by surviving RE-ZONING, never by surviving mere resampling: a real band holds still
    under a change of grain, and an ALIAS MOVES. Re-pour at several coarse-stage decimations and watch
    whether a band's scale holds.

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

from boundary_score import render, report
from ffz_continuous_pour import (
    COARSE_DECIM,
    band_boundaries,
    band_lock,
    null_profile,
    peak_read,
    pour_ticks,
    two_stage_bands,
)
from kumulipo_bed import bed_names, bed_text, ground_truth


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

    The instrument speaks in TICKS; the answer key speaks in LINES. The scoring crosses that seam here,
    once, rather than in every caller getting it subtly wrong.
    """
    out, t = [], 0
    for ln in lines:
        out.append(t)
        t += len(ln) + 1
    return out


def ticks_to_lines(ticks: "list[int]", offsets: "list[int]") -> "list[int]":
    """Each boundary tick lands on the line whose span holds it."""
    return [max(0, int(np.searchsorted(offsets, t, side="right")) - 1) for t in ticks]


def pour_bed(lines: "list[str]", *, seed: int, surrogates: int,
             coarse_decim: int = COARSE_DECIM) -> dict:
    """One bed, one pour: every signal decoupled, gated, and read for boundaries. Reads no answer key."""
    poured = pour_ticks(frames_from_lines(lines))
    offsets = line_offsets(lines)
    out = {"n_ticks": poured["n_ticks"], "signals": {}}
    for name, sig in poured["signals"].items():
        if float(np.var(sig)) < 1e-12:
            out["signals"][name] = {"note": "flat — skipped", "peaked": []}
            continue
        bands = two_stage_bands(sig, coarse_decim=coarse_decim)
        locks = [band_lock(b["series"], b["level"]) for b in bands]
        surr = null_profile(sig, bands, n_surrogates=surrogates, seed=seed)
        verdicts = peak_read(bands, locks, surr)
        peaked = []
        for row, v in zip(bands, verdicts):
            if not v["peaked"]:
                continue
            bounds = band_boundaries(row)
            peaked.append({
                "band": row["band"], "scale_ticks": row["scale_ticks"],
                "energy_excess": v["energy_excess"],
                "boundary_lines": ticks_to_lines(bounds, offsets),
            })
        out["signals"][name] = {
            "peaked": peaked,
            "max_excess": max((v["energy_excess"] for v in verdicts), default=0.0),
        }
    return out


def run_bed(bed: str, *, seed: int, surrogates: int, placebo: bool, zoning: bool) -> dict:
    lines = bed_text(bed)                       # the instrument's ONLY door
    g = ground_truth(bed)                       # the SCORER crosses the wall; the pour never does
    print(f"\n{'═' * 78}\n  {bed.upper()} · {len(lines)} lines · {g['n_wa']} wā "
          f"· segments {min(g['segment_lengths'])}–{max(g['segment_lengths'])} "
          f"(ratio {g['length_ratio']:.0f}x)\n{'═' * 78}")

    real = pour_bed(lines, seed=seed, surrogates=surrogates)
    print(f"  poured {real['n_ticks']:,} character ticks\n")

    # THE DISCOVERED WEIGHT — what a typed constant used to assert, now measured.
    print("  ── DISCOVERED BREAK WEIGHT (the prior we cut, now a reading)")
    for name in ("break-newline", "break-sentence", "break-clause"):
        s = real["signals"].get(name, {})
        peaks = s.get("peaked", [])
        scales = ", ".join(f"{p['band']}@{p['scale_ticks']}t×{p['energy_excess']:.2f}" for p in peaks)
        print(f"     {name:<16} max-excess {s.get('max_excess', 0):>6.2f}  "
              f"{'peaks: ' + scales if peaks else 'NO PEAK — this mark bears no rhythm'}")

    plac = pour_bed(_shuffle_lines(lines, seed), seed=seed, surrogates=surrogates) if placebo else None

    print("\n  ── THE WĀ TEST — each peaked band scored against the chant's own sixteen")
    results = {}
    for name, s in real["signals"].items():
        for p in s.get("peaked", []):
            bl = p["boundary_lines"]
            if not bl:
                continue
            rep = report(bl, bed, ranked=bl)
            best = max(rep["tolerance_curve"], key=lambda r: r["lift"])
            # A band that beats BOTH floors and survives meaning-death has found the chant, not itself.
            surviving = None
            if plac:
                pb = [q for q in plac["signals"].get(name, {}).get("peaked", [])
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

    if results:
        star = max(results, key=lambda k: results[k]["best"]["lift"])
        print(f"\n  ── THE STRONGEST BAND: {star}")
        render(results[star]["report"])

    if zoning:
        print("\n  ── THE ZONING SWEEP (the gate the grain law owed: a real band HOLDS, an alias MOVES)")
        for decim in (32, 64, 128):
            z = pour_bed(lines, seed=seed, surrogates=surrogates, coarse_decim=decim)
            rec = z["signals"].get("recurrence", {})
            scales = [f"{p['band']}@{p['scale_ticks']}t" for p in rec.get("peaked", [])]
            print(f"     decim {decim:>4}: recurrence peaks {scales or '—'}")

    return {"bed": bed, "results": {k: v["best"] for k, v in results.items()}}


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
    ap.add_argument("--zoning", action="store_true", help="run the re-zoning gate")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    beds = a.bed or bed_names()
    out = [run_bed(b, seed=a.seed, surrogates=a.surrogates,
                   placebo=not a.no_placebo, zoning=a.zoning) for b in beds]
    if a.json:
        print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
