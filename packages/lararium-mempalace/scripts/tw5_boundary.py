#!/usr/bin/env python3
r"""tw5_boundary — the arms, run against the TW5 pidgin bed, scored by the UNCHANGED pre-registered scorer.

THE SCORER NEVER MOVED. `boundary_score.py` stands byte-identical: the tolerance ladder, the one-to-one
matching, the analytic chance floor, the equal-partition floor, the lift column. Only the ANSWER KEY it
reads gets rebound — `boundary_score.ground_truth` points at the TW5 bed instead of the Kumulipo's. The
math the numbers come out of never changed hands, which is the whole point of pre-registering it.

THE ARMS, all reused from `kumulipo_boundary` so the comparison across beds stays honest:
  · foote-{w}      — Foote novelty over the exact-match WORD dotplot, kernel SWEPT and the surface printed.
                     The Kumulipo champion. It presupposes ONE LEXICON, and TW5 is where that bill comes due.
  · branch-h{1,2}  — Harris branching entropy over words.
  · sequitur-depth / -seam / -mdl(BIC) — the induced grammar; the MDL arm INFERS its own cut count.
  · baseline-linelen-pelt — the null every arm must beat: line length alone, no grammar.

AND THE ONE THIS BED EXISTS TO TEST — the LEXICON-FREE channel, carried at three grains:
  · class-foote-{w} — Foote novelty over the CLASS-TRANSITION train (25 symbols: letter|digit|space|punct|
                      other, paired). It knows no word, no language, no code. It survived every Kumulipo bed.
  · class-branch-h1 — branching entropy over the same train.
  · class-pelt      — PELT/BIC over the per-line 25-bin transition histogram. The cut count gets INFERRED.

THE ONE NUMBER THAT CROSSES THE WALL: the cut COUNT k. Every ranked arm hands back exactly as many cuts as
the bed holds boundaries — and so does the analytic chance floor, and so does every draw of the empirical
null. The count therefore buys no arm a single point of LIFT; positions alone earn it. The MDL/PELT arms
take no count at all and stand as the no-count-given control. (Same discipline as the Kumulipo run, named
here rather than left implicit.)

THE PLACEBO. Every arm reruns on the LINE-SHUFFLED bed. A shuffle keeps every line whole and kills only
their ORDER: an arm that still scores read the SHAPE of lines, never the grammar.

THE VERDICT COLUMN. `lift <= 0` reads THE TOLERANCE DID THE WORK. A random detector of the same size scores
recall, and it scores well once tolerance opens; only the lift strips that naked.

Usage (THE venv):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 tw5_boundary.py --null 2000
"""
from __future__ import annotations

import argparse
import json
import math
import random
from collections import Counter, defaultdict

import numpy as np
import ruptures as rpt

import boundary_score as BS
import tw5_bed

# THE REBIND — the scorer's MATH stays byte-identical; only the key it opens changes hands. Every function
# inside boundary_score resolves `ground_truth` through this module global, so one line re-aims the whole
# pre-registered harness at the TW5 bed without editing a character of it.
BS.ground_truth = tw5_bed.ground_truth

from boundary_score import TOLERANCES, render, report, score  # noqa: E402  (must follow the rebind)
from kumulipo_boundary import (  # noqa: E402
    _rank_peaks,
    branching_entropy,
    foote_novelty,
    foote_sweep,
    mdl_growth,
    pelt_bic,
    sequitur_arms,
    to_lines,
    words_of,
)

CLASS_IDX = {c: i for i, c in enumerate(tw5_bed.CLASSES)}


# ── the lexicon-free channel ───────────────────────────────────────────────────────────────────────
def class_train(lines: "list[str]") -> "tuple[np.ndarray, list[int]]":
    """The CLASS-TRANSITION train: every character reduced to its class, then paired with its successor.

    25 symbols, and not one of them knows a word. `owner` carries each transition back to its line — the
    seam from characters to the scorer's line index gets crossed once, here."""
    codes, owner = [], []
    prev = None
    for i, ln in enumerate(lines):
        for ch in ln + "\n":
            c = CLASS_IDX[tw5_bed.char_class(ch)]
            if prev is not None:
                codes.append(prev * 5 + c)
                owner.append(i)
            prev = c
    return np.asarray(codes, dtype=np.int32), owner


def foote_small(codes: np.ndarray, half: int, vocab: int) -> np.ndarray:
    """Foote novelty, EXACT, for a small alphabet — the same rank-one factoring, run as a correlation.

    Foote's checkerboard factors as u[a]·u[b], and an exact-match dotplot is a Gram matrix of one-hots, so
    novelty(i) = ‖Σ_a u[a]·e_{i+a}‖². With a 25-symbol alphabet the u-weighted histogram is 25 correlations
    of length n rather than an O(n·h) dict pour — which is what lets the class train sweep to a kernel of
    512 characters on a CPU. Identical output to `kumulipo_boundary.foote_novelty`; `--selfcheck` proves it."""
    n = len(codes)
    a = np.arange(-half, half, dtype=np.float64)
    u = np.sign(a + 0.5) * np.exp(-0.5 * (a / (half / 2.0)) ** 2)
    nov = np.zeros(n)
    for s in range(vocab):
        ind = (codes == s).astype(np.float64)
        if not ind.any():
            continue
        full = np.correlate(ind, u, mode="full")   # full[i + half - 1] == Σ_a u[a]·ind[i+a]
        acc = full[half - 1: half - 1 + n]
        nov += acc * acc
    return nov


def class_arms(lines: "list[str]", *, halves, k: int) -> dict:
    codes, owner = class_train(lines)
    n = len(codes)
    nms = max(1, n // (2 * k))
    out: dict = {}
    for h in halves:
        nov = foote_small(codes, h, 25)
        out[f"class-foote-{2 * h}"] = to_lines(_rank_peaks(nov, k, nms), owner)

    # branching entropy over the SAME train — what-comes-next, with no lexicon to come next IN
    succ = defaultdict(Counter)
    for i in range(n - 1):
        succ[int(codes[i])][int(codes[i + 1])] += 1
    h1 = np.zeros(n)
    for i in range(n - 1):
        c = succ[int(codes[i])]
        tot = sum(c.values())
        h1[i + 1] = -sum((v / tot) * math.log2(v / tot) for v in c.values()) if tot else 0.0
    out["class-branch-h1"] = to_lines(_rank_peaks(h1, k, nms), owner)

    # PELT/BIC over the per-LINE transition histogram — the cut count INFERRED, never typed
    hist = np.zeros((len(lines), 25))
    for c, o in zip(codes, owner):
        hist[o, int(c)] += 1
    tot = hist.sum(axis=1, keepdims=True)
    hist = hist / np.where(tot == 0, 1, tot)
    sigma2 = float(np.var(hist)) or 1e-9
    pen = 2.0 * sigma2 * math.log(len(lines)) * 25          # Schwarz, scaled by the 25 dimensions it pays for
    algo = rpt.KernelCPD(kernel="linear", min_size=2).fit(hist)
    cps = [c for c in algo.predict(pen=pen) if 0 < c < len(lines)]
    strength = np.abs(np.diff(hist, axis=0, prepend=hist[:1])).sum(axis=1)
    out["class-pelt(BIC-inferred)"] = sorted(cps, key=lambda c: -float(strength[c]))
    return out


# ── the run ────────────────────────────────────────────────────────────────────────────────────────
def all_arms(lines: "list[str]", *, halves, class_halves, k: int) -> dict:
    toks, owner = words_of(lines)
    arms: dict = {}
    s = sequitur_arms(toks, owner, k)
    grammar = s.pop("grammar")
    s.pop("_depth_series")
    s.pop("_tops")
    arms.update(s)
    _flat, ranked, n_inf = pelt_bic(mdl_growth(toks), owner)
    arms["sequitur-mdl(BIC-inferred)"] = ranked
    arms.update(foote_sweep(toks, owner, halves, k))
    arms.update(branching_entropy(toks, owner, (1, 2), k))
    arms.update(class_arms(lines, halves=class_halves, k=k))
    ll = np.asarray([len(x) for x in lines], dtype=float)
    arms["baseline-linelen-pelt"] = pelt_bic(ll, list(range(len(lines))))[1]
    return {"arms": arms, "grammar": grammar, "n_words": len(toks), "mdl_inferred_cuts": n_inf}


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
    vals = []
    for _ in range(draws):
        r = rng.sample(range(n_lines), len(pred))
        vals.append(max(score(r, bed, t)["lift"] for t in TOLERANCES))
    v = np.asarray(vals)
    return {"observed": round(obs, 4), "null_mean": round(float(v.mean()), 4),
            "null_sd": round(float(v.std()), 4), "null_max": round(float(v.max()), 4),
            "p": (int((v >= obs).sum()) + 1) / (draws + 1), "draws": draws}


def selfcheck() -> None:
    """The fast Foote must equal the reference Foote, or every class arm below reads a different instrument."""
    rng = np.random.default_rng(7)
    codes = rng.integers(0, 25, size=400).astype(np.int32)
    for h in (4, 16):
        a = foote_novelty(codes, h)
        b = foote_small(codes, h, 25)
        assert np.allclose(a, b, atol=1e-9), f"foote_small diverges from the reference at half={h}"
    print("  selfcheck: foote_small == kumulipo_boundary.foote_novelty (exact)")


def run(bed: str, *, halves, class_halves, seed: int, placebo: bool, draws: int) -> dict:
    lines = tw5_bed.bed_text(bed)                       # THE INSTRUMENT'S ONLY DOOR
    k = len(tw5_bed.ground_truth(bed)["boundaries"])    # the ONE number crossing the wall — see the header
    print(f"\n{'═' * 104}\n  {bed.upper()} · {len(lines)} lines · every ranked arm hands back {k} cuts "
          f"(so does the chance floor, and so does every null draw)\n{'═' * 104}")
    real = all_arms(lines, halves=halves, class_halves=class_halves, k=k)
    g = real["grammar"]
    print(f"  SEQUITUR over {real['n_words']:,} words: {g['rules']} rules · size {g['size']:,} "
          f"· depth mean {g['mean_depth']:.2f} max {g['max_depth']} · "
          f"MDL/PELT inferred {real['mdl_inferred_cuts']} cuts (nobody typed {k} for it)\n")

    plac = all_arms(shuffle_lines(lines, seed), halves=halves, class_halves=class_halves,
                    k=k) if placebo else None

    print(f"  {'arm':<28} {'n':>4} {'best-lift':>10} {'@tol':>5} {'recall':>7} {'chance':>7}   placebo-lift")
    rows = {}
    for name, pred in real["arms"].items():
        if not pred:
            continue
        rep = report(pred, bed, ranked=pred)
        best = max(rep["tolerance_curve"], key=lambda r: r["lift"])
        pl = ""
        if plac and plac["arms"].get(name):
            prep = report(plac["arms"][name], bed, ranked=plac["arms"][name])
            pl = f"{max(prep['tolerance_curve'], key=lambda r: r['lift'])['lift']:+.3f}"
        rows[name] = {"best": best, "placebo_lift": pl}
        flag = "  ← FOUND NOTHING" if best["lift"] <= 0.005 else ""
        print(f"  {name:<28} {best['n_pred']:>4} {best['lift']:>+10.3f} {best['tol']:>5} "
              f"{best['recall']:>7.3f} {best['chance_recall']:>7.3f}   {pl:>7}{flag}")

    out = {"bed": bed, "k": k, "arms": {n: v["best"] | {"placebo_lift": v["placebo_lift"]}
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
    ap = argparse.ArgumentParser(description="find the TW5 register switch — with the cue, and without it")
    ap.add_argument("--bed", action="append", choices=tw5_bed.bed_names())
    ap.add_argument("--halves", default="4,8,16,32,64", help="word-Foote kernel half-widths to SWEEP")
    ap.add_argument("--class-halves", default="32,64,128,256", help="class-train kernel half-widths to SWEEP")
    ap.add_argument("--seed", type=int, default=tw5_bed.SEED)
    ap.add_argument("--no-placebo", action="store_true")
    ap.add_argument("--null", type=int, default=0, metavar="N")
    ap.add_argument("--json")
    a = ap.parse_args()
    m = tw5_bed.manifest()
    print(f"TW5 commit {m['tw5_commit'][:12]} · seed {m['seed']} — the bed rebuilds byte-identical from these")
    selfcheck()
    halves = [int(x) for x in a.halves.split(",")]
    chalves = [int(x) for x in a.class_halves.split(",")]
    out = [run(b, halves=halves, class_halves=chalves, seed=a.seed,
               placebo=not a.no_placebo, draws=a.null)
           for b in (a.bed or tw5_bed.bed_names())]
    if a.json:
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump({"manifest": m, "runs": out}, f, indent=1)
        print(f"\n  → {a.json}")


if __name__ == "__main__":
    main()
