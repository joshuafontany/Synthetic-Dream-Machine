#!/usr/bin/env python3
r"""pidgin_boundary — the arms, run against the LIVE pidgin bed, scored by the UNCHANGED pre-registered scorer.

THE SCORER NEVER MOVED. `boundary_score.py` stands byte-identical: the tolerance ladder, the one-to-one
nearest-first matching, the analytic chance floor, the equal-partition floor, the lift column. Only the
ANSWER KEY it opens gets rebound — `boundary_score.ground_truth` points at the pidgin bed. The math the
numbers come out of never changed hands, which is the whole reason it was pre-registered.

THE ARMS, all reused from `kumulipo_boundary` and `tw5_boundary` so the comparison ACROSS beds stays honest:
  · foote-{w}      — Foote novelty over the exact-match WORD dotplot, kernel SWEPT and the surface printed.
                     The Kumulipo champion. It presupposes ONE LEXICON. This is where that bill comes due.
  · branch-h{1,2}  — Harris branching entropy over words.
  · sequitur-*     — the induced grammar (depth cliff, top-span seam, and an MDL arm whose cut count BIC
                     infers rather than takes).
  · class-foote-{w} / class-branch-h1 / class-pelt — the LEXICON-FREE channel: the character-class
                     TRANSITION train (letter|digit|space|punct|other, paired — 25 symbols). It knows no
                     word, no language, no code. It survived every Kumulipo bed. This bed asks whether it
                     wins when the grammar itself changes hands.
  · baseline-linelen-pelt — the null every arm must beat: line length alone, no grammar at all.

THE ONE NUMBER CROSSING THE WALL: the cut COUNT k. Every ranked arm hands back exactly as many cuts as the
bed holds register switches — and so does the analytic chance floor, and so does every draw of the empirical
null. The count therefore buys no arm a single point of LIFT; positions alone earn it. The two PELT arms take
no count at all and stand as the no-count-given control.

THE DENSITY THE KUMULIPO NEVER HAD. The chant carries 15 boundaries in 6,600 lines. A transcript carries
300–530 register switches in 7,000 — a switch every few lines. So the WIDE tolerance rungs saturate: a random
detector of the same size recovers nearly everything at ±50, its chance floor climbs to ~1.0, and LIFT there
necessarily collapses toward zero FOR EVERY ARM INCLUDING A REAL ONE. The discriminating region on this bed
sits at ±0 and ±2, and the report prints the whole ladder so the saturation stays visible rather than
becoming a silent ceiling somebody later mistakes for a null result.

THE PLACEBO. Every arm reruns on the LINE-SHUFFLED bed. A shuffle keeps every line whole and kills only their
ORDER: an arm that still scores read the SHAPE of lines, never the register.

Usage (THE venv):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 pidgin_boundary.py --null 2000 --json out.json
"""
from __future__ import annotations

import argparse
import json
import random

import numpy as np

import boundary_score as BS
import tw5_boundary as TB           # importing it rebinds BS.ground_truth at the TW5 bed …
import pidgin_bed

BS.ground_truth = pidgin_bed.ground_truth   # … and this RE-AIMS it at the pidgin bed. Last write wins.

from boundary_score import TOLERANCES, render, report, score  # noqa: E402  (must follow the rebind)


def shuffle_lines(lines: "list[str]", seed: int) -> "list[str]":
    """MEANING-DEATH. Every line survives whole; only their ORDER dies."""
    out = list(lines)
    random.Random(seed).shuffle(out)
    return out


def empirical_null(pred: "list[int]", bed: str, n_lines: int, draws: int, seed: int) -> dict:
    """The floor drawn rather than derived — and it takes the SAME best-over-the-ladder maximum the arms do.

    An arm reports its best rung out of six; a maximum over six rungs beats its own per-rung expectation, so
    a null that did not also maximise would flatter every arm alive."""
    rng = random.Random(seed)
    obs = max(score(pred, bed, t)["lift"] for t in TOLERANCES)
    vals = [max(score(rng.sample(range(n_lines), len(pred)), bed, t)["lift"] for t in TOLERANCES)
            for _ in range(draws)]
    v = np.asarray(vals)
    return {"observed": round(obs, 4), "null_mean": round(float(v.mean()), 4),
            "null_sd": round(float(v.std()), 4), "null_max": round(float(v.max()), 4),
            "p": (int((v >= obs).sum()) + 1) / (draws + 1), "draws": draws}


def run(bed: str, *, halves, class_halves, seed: int, placebo: bool, draws: int) -> dict:
    lines = pidgin_bed.bed_text(bed)                       # THE INSTRUMENT'S ONLY DOOR
    k = len(pidgin_bed.ground_truth(bed)["boundaries"])    # the ONE number crossing the wall — see the header
    print(f"\n{'═' * 106}\n  {bed.upper()} · {len(lines)} lines · every ranked arm hands back {k} cuts "
          f"(so does the chance floor, and so does every null draw)\n{'═' * 106}")
    real = TB.all_arms(lines, halves=halves, class_halves=class_halves, k=k)
    g = real["grammar"]
    print(f"  SEQUITUR over {real['n_words']:,} words: {g['rules']} rules · size {g['size']:,} "
          f"· depth mean {g['mean_depth']:.2f} max {g['max_depth']} · "
          f"MDL/PELT inferred {real['mdl_inferred_cuts']} cuts (nobody typed {k} for it)\n")

    plac = TB.all_arms(shuffle_lines(lines, seed), halves=halves, class_halves=class_halves,
                       k=k) if placebo else None

    print(f"  {'arm':<28} {'n':>4} {'best-lift':>10} {'@tol':>5} {'recall':>7} {'prec':>6} {'chance':>7}"
          f"   {'lift@0':>7} {'lift@2':>7}   placebo")
    rows = {}
    for name, pred in real["arms"].items():
        if not pred:
            continue
        rep = report(pred, bed, ranked=pred)
        curve = {r["tol"]: r for r in rep["tolerance_curve"]}
        best = max(rep["tolerance_curve"], key=lambda r: r["lift"])
        pl = ""
        if plac and plac["arms"].get(name):
            prep = report(plac["arms"][name], bed, ranked=plac["arms"][name])
            pl = f"{max(prep['tolerance_curve'], key=lambda r: r['lift'])['lift']:+.3f}"
        rows[name] = {"best": best, "placebo_lift": pl,
                      "lift_0": curve[0]["lift"], "lift_2": curve[2]["lift"]}
        flag = "  ← FOUND NOTHING" if best["lift"] <= 0.005 else ""
        print(f"  {name:<28} {best['n_pred']:>4} {best['lift']:>+10.3f} {best['tol']:>5} "
              f"{best['recall']:>7.3f} {best['precision']:>6.3f} {best['chance_recall']:>7.3f}"
              f"   {curve[0]['lift']:>+7.3f} {curve[2]['lift']:>+7.3f}   {pl:>7}{flag}")

    out = {"bed": bed, "k": k, "n_lines": len(lines),
           "arms": {n: v["best"] | {"placebo_lift": v["placebo_lift"],
                                    "lift_0": v["lift_0"], "lift_2": v["lift_2"]}
                    for n, v in rows.items()}}
    if rows:
        star = max(rows, key=lambda kk: rows[kk]["best"]["lift"])
        print(f"\n  ── STRONGEST ARM: {star}  (lift {rows[star]['best']['lift']:+.3f})")
        render(report(real["arms"][star], bed, ranked=real["arms"][star]))
        if draws:
            nl = empirical_null(real["arms"][star], bed, len(lines), draws, seed)
            print(f"\n  empirical null ({nl['draws']} random {k}-cut detectors, same best-over-ladder "
                  f"statistic): observed {nl['observed']:+.3f} · null {nl['null_mean']:+.3f}"
                  f"±{nl['null_sd']:.3f} (max {nl['null_max']:+.3f}) · p = {nl['p']:.4f}")
            out["null"] = nl
        out["strongest"] = star
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="find the REGISTER SWITCH — with the cue, and without it")
    ap.add_argument("--bed", action="append", choices=pidgin_bed.bed_names())
    ap.add_argument("--halves", default="4,8,16,32,64", help="word-Foote kernel half-widths to SWEEP")
    ap.add_argument("--class-halves", default="32,64,128,256", help="class-train kernel half-widths to SWEEP")
    ap.add_argument("--seed", type=int, default=pidgin_bed.SEED)
    ap.add_argument("--no-placebo", action="store_true")
    ap.add_argument("--null", type=int, default=0, metavar="N")
    ap.add_argument("--json")
    a = ap.parse_args()
    m = pidgin_bed.manifest()
    for s in m["sessions"]:
        print(f"  {s['bed']}  sha256:{s['sha256']}  {s['path']}")
    TB.selfcheck()
    halves = [int(x) for x in a.halves.split(",")]
    chalves = [int(x) for x in a.class_halves.split(",")]
    out = [run(b, halves=halves, class_halves=chalves, seed=a.seed,
               placebo=not a.no_placebo, draws=a.null)
           for b in (a.bed or pidgin_bed.bed_names())]
    if a.json:
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump({"manifest": m, "runs": out}, f, indent=1)
        print(f"\n  → {a.json}")


if __name__ == "__main__":
    main()
