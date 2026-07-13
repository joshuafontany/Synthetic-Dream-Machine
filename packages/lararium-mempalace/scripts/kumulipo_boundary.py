#!/usr/bin/env python3
"""kumulipo_boundary — the BOUNDARY instrument, standing where the wavelet pour failed.

WHAT THE POUR ALREADY WON, AND WHAT IT NEVER TOUCHED. The two-stage MODWT found the chant's BEAT: band
C7, ~10,240 ticks against a measured wā gap of ~9,400, at q 0.58 real vs 0.21 placebo. Then its crest
placement scored recall 0.06. It found the PERIOD and never the BOUNDARIES — and that gap names a
category error, not a tuning failure:

    A BANDPASS FILTER REPORTS WHERE ENERGY AT ITS SCALE CONCENTRATES.
    A CHANGE-POINT DETECTOR REPORTS WHERE THE GENERATING REGIME TURNS OVER.

Those answer different questions. A detail crest sits at an ANTINODE of an oscillation the band is tuned
to; a wā boundary sits where the chant's vocabulary, its parallelism, its whole grammar changes hands.
The literature keeps the two apart on purpose — periodicity/frequency change gets read in the frequency
domain (Fourier, wavelet), general change-point detection in the TIME domain, and a wavelet fed a LOCAL
ABRUPT CHANGE answers with SPURIOUS LOW-FREQUENCY POWER — a period the signal never held (Hochman, Alpert
et al., "Artificial Detection of Lower-Frequency Periodicity in Climatic Studies by Wavelet Analysis
Demonstrated on Synthetic Time Series", J. Appl. Meteor. Climatol. 58(9), 2019, doi 10.1175/JAMC-D-18-0331.1;
Wu & Zhou, "Frequency Detection and Change Point Estimation for Time Series of Complex Oscillation",
arXiv 2005.01899, who run frequency detection and change-point estimation as TWO SEQUENTIAL STAGES because
one instrument cannot do both). We asked a periodicity instrument a change-point question. It answered the
question it was built for, honestly, and we misread the answer as a failure.

SO THIS FILE CARRIES CHANGE-POINT INSTRUMENTS, and holds every one of them to the no-imposed-prior law.

THE ALPHABET, and why it runs on WORDS. The Hawaiian bed pours 6,597 lines, of which 3,299 stand BLANK,
and only 182 non-blank lines ever repeat verbatim. An exact-match LINE lattice therefore reads the blank
comb and nothing else — the chant's parallelism lives one grain finer, in the repeated word stems and
phrase frames. So every arm symbolizes at the WORD, and the seam back to LINES gets crossed once, here,
rather than wrongly in every caller.

THE FOUR ARMS:

  · SEQUITUR-DEPTH   — grammar depth per position. Chant the grammar compresses hard sits DEEP (nested
                       refrain); fresh unrepeated genealogy sits SHALLOW. A depth CLIFF names a regime
                       turning over. Parameter-free by ABSENCE: two rules, no window, no k, no threshold.
  · SEQUITUR-SEAM    — the ends of the long TOP-LEVEL rule spans. Where a block the chant itself repeats
                       stops, the grammar drew a seam nobody asked it to draw.
  · SEQUITUR-MDL     — the description length the grammar pays per word. A regime change forces NEW rules
                       and NEW terminals; compression stalls. The cut count gets INFERRED by PELT under a
                       BIC/Schwarz penalty (pen = 2 sigma^2 log n) — never typed. Killoran/Truong/Oudre,
                       ruptures 1.1.10; PELT: Killick, Fearnhead & Eckley, JASA 107(500):1590 (2012).
  · FOOTE-NOVELTY    — the exact-match recurrence dotplot with a Gaussian-tapered CHECKERBOARD kernel
                       correlated down its diagonal (Foote, ICME 2000, "Automatic Audio Segmentation Using
                       a Measure of Audio Novelty"). The kernel width IS a scale prior, so the harness
                       SWEEPS it and prints the whole surface. It never picks one — picking would be the
                       manufactured finding, in the open.

THE FLOOR EVERY ARM SHARES. Each ranked arm hands back exactly FIFTEEN cuts — the same count the scorer's
random-detector floor assumes — so the count grants no arm an edge over the coin flip it gets compared
against. The MDL arm hands back whatever count BIC infers, and stands as the honest no-count-given test.

THE PLACEBO. Every arm reruns on the LINE-SHUFFLED bed. A shuffle keeps every line whole and kills only
their ORDER, so an arm that still scores read the SHAPE of lines; an arm that dies read the chant.

THE WALL. This file calls `bed_text` and never `ground_truth`. The scorer crosses; the instrument does not.

KULEANA. The chant carries the genealogy of a living people, and we run it here as an instrument. Named.
"""
from __future__ import annotations

import argparse
import json
import math
import random
from collections import Counter, defaultdict

import numpy as np
import ruptures as rpt

from boundary_score import TOLERANCES, render, report, score
from kumulipo_bed import bed_names, bed_text
from sequitur_grammar import induce

K_CUTS = 15   # NOT a tuned prior: the scorer's random floor assumes the same count, so it buys no edge.


# ── the alphabet ───────────────────────────────────────────────────────────────────────────────────
def words_of(lines: "list[str]") -> "tuple[list[str], list[int]]":
    """Every word of the bed in reading order, and the LINE each word sits in.

    Lowercased and stripped of punctuation — the chant's parallelism repeats STEMS, and a comma the
    scribe placed carries the scribe's decision, not the chanter's.
    """
    toks, owner = [], []
    for i, ln in enumerate(lines):
        for w in ln.lower().split():
            w = "".join(c for c in w if c.isalnum() or c in "ʻ'-")
            if w:
                toks.append(w)
                owner.append(i)
    return toks, owner


def to_lines(word_idx: "list[int]", owner: "list[int]") -> "list[int]":
    """Cross the seam once: a cut BETWEEN words lands on the line the following word opens."""
    n = len(owner)
    return [owner[min(max(i, 0), n - 1)] for i in word_idx]


def _rank_peaks(strength: np.ndarray, k: int, nms: int) -> "list[int]":
    """The k strongest positions, no two within `nms` — a burst around one seam must not harvest k slots.

    `nms` derives from k and the length (n / 2k), never from a look at the answer. Without it a single
    ragged cliff spends the whole budget and the score reads the raggedness, not the structure.
    """
    order = np.argsort(-strength)
    out: list[int] = []
    for i in order:
        if all(abs(int(i) - j) >= nms for j in out):
            out.append(int(i))
            if len(out) == k:
                break
    return out


# ── ARM 1 & 2: the induced grammar ─────────────────────────────────────────────────────────────────
def sequitur_arms(toks: "list[str]", owner: "list[int]", k: int = K_CUTS) -> dict:
    """Induce the grammar once; read three boundary signals off the one hierarchy it built."""
    g = induce(toks)
    terms, depths, tops = g.expand_depth()
    d = np.asarray(depths, dtype=np.float64)
    n = len(d)
    nms = max(1, n // (2 * k))

    # DEPTH CLIFF — |Δdepth|, where the grammar's reach changes hands.
    cliff = np.abs(np.diff(d, prepend=d[0]))
    depth_idx = _rank_peaks(cliff, k, nms)

    # SEAM — the ends of the LONGEST top-level spans, ranked by the span they close.
    spans = g.top_spans()
    seams = sorted(((e - s, e) for s, e, _r in spans), reverse=True)
    seam_idx, seen = [], []
    for _len, e in seams:
        if all(abs(e - j) >= nms for j in seen) and 0 < e < n:
            seen.append(e)
            seam_idx.append(e)
        if len(seam_idx) == k:
            break

    return {
        "grammar": {"rules": len(g.rules()), "size": g.grammar_size(),
                    "mean_depth": float(d.mean()), "max_depth": int(d.max())},
        "sequitur-depth": to_lines(depth_idx, owner),
        "sequitur-seam": to_lines(seam_idx, owner),
        "_depth_series": d,
        "_tops": tops,
    }


# ── ARM 3: MDL, with the cut count INFERRED ────────────────────────────────────────────────────────
def mdl_growth(toks: "list[str]") -> np.ndarray:
    """The description length the grammar pays per word, poured incrementally.

    Fresh material costs: a word never seen bills one new terminal, and a repetition the grammar can fold
    bills a new rule. So the series reads COMPRESSION STALL — high where the chant turns to matter it has
    no grammar for. A regime change stalls compression; a refrain does not.
    """
    g = induce([])
    seen: set = set()
    out = np.zeros(len(toks))
    prev = g._idx          # rules MINTED so far — a monotone counter, so the pour stays linear
    for i, w in enumerate(toks):
        g.append(w)
        novel = 0 if w in seen else 1
        seen.add(w)
        out[i] = novel + (g._idx - prev)
        prev = g._idx
    return out


def pelt_bic(sig: np.ndarray, owner: "list[int]") -> "tuple[list[int], list[int], int]":
    """PELT under a BIC/Schwarz penalty — the cut COUNT gets inferred, never typed.

    The penalty rides on the residual variance and the length (pen = 2 sigma^2 log n), which is the
    Schwarz criterion for a mean-shift model. Nobody chooses how many wā there are; the criterion pays for
    each cut out of the likelihood it buys, and stops when a cut stops paying.
    """
    x = sig.reshape(-1, 1)
    sigma2 = float(np.var(sig)) or 1e-9
    pen = 2.0 * sigma2 * math.log(len(sig))
    algo = rpt.KernelCPD(kernel="linear", min_size=2).fit(x)
    cps = algo.predict(pen=pen)
    cps = [c for c in cps if 0 < c < len(sig)]
    strength = np.abs(np.diff(sig, prepend=sig[0]))
    ranked = sorted(cps, key=lambda c: -float(strength[min(c, len(sig) - 1)]))
    return to_lines(cps, owner), to_lines(ranked, owner), len(cps)


# ── ARM 4: the recurrence dotplot + Foote's checkerboard ───────────────────────────────────────────
def foote_novelty(codes: np.ndarray, half: int) -> np.ndarray:
    """Correlate a Gaussian-tapered checkerboard down the diagonal of the EXACT-MATCH dotplot.

    The dotplot itself carries NO free parameter — a word either recurs or it does not. The KERNEL WIDTH
    does, and it is a scale prior in plain sight: it declares how long a block must run to count as one.
    So the caller sweeps it and reports the surface. A single width would be the manufactured finding.

    Foote, "Automatic Audio Segmentation Using a Measure of Audio Novelty", IEEE ICME 2000.

    THE KERNEL FACTORS, and the factoring buys the whole run. Foote's checkerboard reads
    K[a,b] = sign(a)·sign(b)·gauss(a)·gauss(b) = u[a]·u[b] — RANK ONE. And an exact-match dotplot IS a
    Gram matrix of one-hot vectors, S[p,q] = <e_p, e_q>. So the correlation collapses:

        novelty(i) = Σ_ab u[a] u[b] <e_{i+a}, e_{i+b}> = ‖ Σ_a u[a] · e_{i+a} ‖²

    — the squared norm of the u-weighted symbol histogram over the window. O(n·h), never O(n·h²), and
    EXACT rather than approximate, which is what lets the sweep run out to a kernel of 256 words.
    """
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


def foote_sweep(toks: "list[str]", owner: "list[int]", halves, k: int = K_CUTS) -> dict:
    vocab = {w: i for i, w in enumerate(dict.fromkeys(toks))}
    codes = np.fromiter((vocab[w] for w in toks), dtype=np.int32, count=len(toks))
    n = len(codes)
    nms = max(1, n // (2 * k))
    out = {}
    for h in halves:
        nov = foote_novelty(codes, h)
        idx = _rank_peaks(nov, k, nms)
        out[f"foote-{2 * h}"] = to_lines(idx, owner)
    return out


# ── ARM 5: branching entropy (Harris successor variety) ────────────────────────────────────────────
def branching_entropy(toks: "list[str]", owner: "list[int]", depths=(1, 2), k: int = K_CUTS) -> dict:
    """Harris's successor variety, carried to entropy: cut where what-comes-next grows UNPREDICTABLE.

    Harris, "From Phoneme to Morpheme", Language 31(2):190 (1955); Zhikov, Takamura & Okumura, EMNLP 2010,
    who select the cut count by MDL rather than by a typed threshold. The n-gram DEPTH stands as a scale
    prior, so it sweeps, exactly as the kernel width does.
    """
    out = {}
    n = len(toks)
    nms = max(1, n // (2 * k))
    for d in depths:
        succ = defaultdict(Counter)
        for i in range(n - d):
            succ[tuple(toks[i:i + d])][toks[i + d]] += 1
        h = np.zeros(n)
        for i in range(n - d):
            c = succ[tuple(toks[i:i + d])]
            tot = sum(c.values())
            h[i + d] = -sum((v / tot) * math.log2(v / tot) for v in c.values()) if tot else 0.0
        out[f"branch-h{d}"] = to_lines(_rank_peaks(h, k, nms), owner)
    return out


# ── the run ────────────────────────────────────────────────────────────────────────────────────────
def all_arms(lines: "list[str]", *, halves, k: int = K_CUTS) -> dict:
    toks, owner = words_of(lines)
    arms: dict = {}
    s = sequitur_arms(toks, owner, k)
    grammar = s.pop("grammar")
    s.pop("_depth_series")
    s.pop("_tops")
    arms.update(s)
    flat, ranked, n_inf = pelt_bic(mdl_growth(toks), owner)
    arms["sequitur-mdl(BIC-inferred)"] = ranked
    arms.update(foote_sweep(toks, owner, halves, k))
    arms.update(branching_entropy(toks, owner, (1, 2), k))
    # the null arm every other arm must beat: the raw line-length series, no grammar at all
    ll = np.asarray([len(x) for x in lines], dtype=float)
    arms["baseline-linelen-pelt"] = pelt_bic(ll, list(range(len(lines))))[1]
    return {"arms": arms, "grammar": grammar, "n_words": len(toks), "mdl_inferred_cuts": n_inf}


def scale_hierarchy(coarse: "list[int]", fine: "list[int]", tol: int = 50) -> dict:
    """THE BRANCH, answered by SCALE NESTING rather than by a guess.

    A cut a COARSE kernel already sees names an era standing BESIDE its neighbour — the chant changes hands
    at a scale visible from far off. A cut only a FINE kernel sees names a turn INSIDE the preceding era —
    visible up close, invisible from the era's own distance. That is precisely the disagreement the two
    witnesses stage: the Hawaiian hears a thirteenth ERA; the Queen hears "A Branch of the Twelfth".

    So the instrument reads the branch from its OWN two scales and never from the key: the fine cuts,
    sorted, open segments 2..16; a segment whose opening cut the coarse kernel MISSES hangs BENEATH its
    predecessor. `parent_of[i] = i-1` says exactly that.
    """
    fine_sorted = sorted(fine)
    parent_of: dict = {}
    for j, c in enumerate(fine_sorted):
        wa = j + 2                                  # the fine cuts open wā 2 through 16
        seen_coarse = any(abs(c - x) <= tol for x in coarse)
        if not seen_coarse:
            parent_of[wa] = wa - 1                  # fine-only → a BRANCH of the era before it
    return parent_of


def shuffle_lines(lines: "list[str]", seed: int) -> "list[str]":
    """MEANING-DEATH. Every line survives whole; only their ORDER dies. An arm that still scores read the
    shape of lines — their length, their character mix — properties a shuffle preserves exactly."""
    out = list(lines)
    random.Random(seed).shuffle(out)
    return out


def empirical_null(pred: "list[int]", bed: str, n_lines: int, draws: int, seed: int) -> dict:
    """The floor the ANALYTIC chance model only approximates — drawn, not derived.

    `boundary_score.chance_recall` hands back a closed form for a uniform-random detector, but the arms
    report the BEST lift over the whole tolerance ladder, and a maximum over six rungs beats its own
    per-rung expectation. So the null must take the SAME maximum: draw fifteen cuts at random, score the
    ladder, keep the best rung, and repeat. A p read off that draw cannot be flattered by the ladder.
    """
    rng = random.Random(seed)
    obs = max(score(pred, bed, t)["lift"] for t in TOLERANCES)
    vals = []
    for _ in range(draws):
        r = rng.sample(range(n_lines), len(pred))
        vals.append(max(score(r, bed, t)["lift"] for t in TOLERANCES))
    v = np.asarray(vals)
    beat = int((v >= obs).sum())
    return {"observed": round(obs, 4), "null_mean": round(float(v.mean()), 4),
            "null_sd": round(float(v.std()), 4), "null_max": round(float(v.max()), 4),
            "p": (beat + 1) / (draws + 1), "draws": draws}


def run(bed: str, *, halves, seed: int, placebo: bool, draws: int = 0) -> dict:
    lines = bed_text(bed)                       # THE INSTRUMENT'S ONLY DOOR
    print(f"\n{'═' * 92}\n  {bed.upper()} · {len(lines)} lines\n{'═' * 92}")
    real = all_arms(lines, halves=halves)
    g = real["grammar"]
    print(f"  SEQUITUR over {real['n_words']:,} words: {g['rules']} rules · grammar size {g['size']:,} "
          f"· depth mean {g['mean_depth']:.2f} max {g['max_depth']}")
    print(f"  MDL/PELT inferred {real['mdl_inferred_cuts']} cuts (nobody typed 15)\n")

    plac = all_arms(shuffle_lines(lines, seed), halves=halves) if placebo else None

    print(f"  {'arm':<28} {'n':>3} {'best-lift':>10} {'@tol':>5} {'recall':>7} {'chance':>7} "
          f"{'hinge':>7}   placebo-lift")
    rows = {}
    for name, pred in real["arms"].items():
        if not pred:
            continue
        rep = report(pred, bed, ranked=pred)
        best = max(rep["tolerance_curve"], key=lambda r: r["lift"])
        h = rep["hinge"]
        hs = ("#1 ★" if h.get("strongest_is_hinge") else
              f"#{h['rank_of_hinge']}" if h.get("found") else "miss")
        pl = ""
        if plac and name in plac["arms"] and plac["arms"][name]:
            prep = report(plac["arms"][name], bed, ranked=plac["arms"][name])
            pbest = max(prep["tolerance_curve"], key=lambda r: r["lift"])
            pl = f"{pbest['lift']:+.3f}"
        rows[name] = {"report": rep, "best": best, "placebo_lift": pl}
        print(f"  {name:<28} {best['n_pred']:>3} {best['lift']:>+10.3f} {best['tol']:>5} "
              f"{best['recall']:>7.3f} {best['chance_recall']:>7.3f} {hs:>7}   {pl}")

    if rows:
        star = max(rows, key=lambda kk: rows[kk]["best"]["lift"])
        print(f"\n  ── STRONGEST ARM: {star}")
        # THE BRANCH — read off the instrument's OWN coarse/fine scale pair, never off the key.
        fine_k, coarse_k = f"foote-{2 * min(halves)}", f"foote-{2 * max(halves)}"
        parent = None
        if fine_k in real["arms"] and coarse_k in real["arms"]:
            parent = scale_hierarchy(real["arms"][coarse_k], real["arms"][fine_k])
            print(f"  (hierarchy: {fine_k} cuts nested under {coarse_k} → "
                  f"branch-wā {sorted(parent) or '—'})")
        render(report(real["arms"][star], bed, ranked=real["arms"][star], parent_of=parent))
        if draws:
            nl = empirical_null(real["arms"][star], bed, len(lines), draws, seed)
            print(f"\n  empirical null ({nl['draws']} random {len(real['arms'][star])}-cut detectors, "
                  f"same best-over-ladder statistic): observed {nl['observed']:+.3f} · "
                  f"null {nl['null_mean']:+.3f}±{nl['null_sd']:.3f} (max {nl['null_max']:+.3f}) "
                  f"· p = {nl['p']:.4f}")
    return {"bed": bed, "arms": {k2: v["best"] for k2, v in rows.items()}}


def main() -> None:
    ap = argparse.ArgumentParser(description="find the wā BOUNDARIES — change-point, not periodicity")
    ap.add_argument("--bed", action="append", choices=bed_names())
    ap.add_argument("--halves", default="4,8,16,32,64", help="Foote kernel half-widths to SWEEP (words)")
    ap.add_argument("--seed", type=int, default=4241)
    ap.add_argument("--no-placebo", action="store_true")
    ap.add_argument("--null", type=int, default=0, metavar="N",
                    help="draw N random 15-cut detectors and read the strongest arm's p off them")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    halves = [int(x) for x in a.halves.split(",")]
    out = [run(b, halves=halves, seed=a.seed, placebo=not a.no_placebo, draws=a.null)
           for b in (a.bed or bed_names())]
    if a.json:
        print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
