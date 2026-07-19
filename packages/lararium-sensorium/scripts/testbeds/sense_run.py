#!/usr/bin/env python3
"""sense_run — the isomorphic WORD-GRAINED wā harness. Runs sense_analyze's arms on a bed's own word stream
and scores them against a word-coordinate answer key, reusing boundary_score's pre-registered MATH — the
one-to-one match and the chance floor — UNCHANGED. One instrument, any bed, word positions end to end.

WHAT IT REPLACES. The per-bed *_boundary detectors (kumulipo/tw5/pidgin_boundary) each carried the same arm
math and re-aimed the scorer by REBINDING `boundary_score.ground_truth` at their own bed (last-write-wins, a
fragile shared global). sense_analyze now holds the arms once, adapted to the stream; this harness carries
the answer key to it, so the per-bed detectors + their rebind retire.

THE COORDINATE MOVE, and nothing else. The scorer's math never moved — only the grain did, from the scribe's
LINE to the content's WORD, the grain sense_analyze reads (MAUP-free, like FFZ). A boundary at line L maps to
the word index at L's start, in the SAME tokenization the instrument reads, so the key lands in the
instrument's own coordinates. The tolerance ladder carries the SAME physical span: `tol_words = tol_lines *
words-per-line`, so "within X lines" reads as "within X lines' worth of words" — no fresh prior.

THE WALL HOLDS. `bed_text()` stays the instrument's only door; the word mapping crosses on the SCORER's side.
"""
from __future__ import annotations

import argparse
import json

import sense_analyze as sa
from boundary_score import TOLERANCES, chance_recall, match_one_to_one


def line_word_offsets(lines: "list[str]") -> "tuple[list[int], int]":
    """The word index at which each line opens, plus the total word count — the line→word seam, crossed once
    here rather than subtly wrong in every caller. Per-line tokenization sums to the whole-stream tokenization
    (stream_words splits on all whitespace), so offs[L] is exactly the word position of line L's first word."""
    offs, t = [], 0
    for ln in lines:
        offs.append(t)
        t += len(sa.stream_words(ln))
    return offs, t


def word_ground_truth(mod, bed: str) -> dict:
    """Map the bed's LINE-coordinate answer key into WORD coordinates. The SCORER crosses the wall; the
    instrument never does. `mod` is any bed module exposing bed_text(bed) + ground_truth(bed)."""
    lines = mod.bed_text(bed)
    g = mod.ground_truth(bed)
    offs, n_words = line_word_offsets(lines)

    def to_word(line_idx: "int | None") -> "int | None":
        if line_idx is None:
            return None
        return offs[line_idx] if 0 <= line_idx < len(offs) else n_words

    return {
        "bed": bed,
        "n_words": n_words,
        "n_lines": g["n_lines"],
        "boundaries": [to_word(b) for b in g["boundaries"]],
        "hinge": to_word(g.get("hinge")),
        "words_per_line": round(n_words / max(1, g["n_lines"]), 2),
    }


def arm_cuts(lines: "list[str]") -> "tuple[list, dict]":
    """The bed's word stream → {arm: [word positions]}, the whole adapted surface at once. Rides
    sense_analyze.run_arms — the one place the arm sequence composes, shared with the poured-stream read."""
    toks = sa.stream_words("\n".join(lines))
    boundaries, _grammar, _mdl_inferred = sa.run_arms(toks)
    return toks, boundaries


def score_word(pred: "list[int]", truth: dict, tol: int) -> dict:
    """One rung of the ladder in word coordinates — precision/recall/F1 and the LIFT over a random detector
    of equal size. Reuses boundary_score's one-to-one match + chance floor UNCHANGED; only the grain differs."""
    pred = sorted(set(int(p) for p in pred))
    true = truth["boundaries"]
    hits = match_one_to_one(pred, true, tol)
    prec = len(hits) / len(pred) if pred else 0.0
    rec = len(hits) / len(true) if true else 0.0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
    floor = chance_recall(len(pred), truth["n_words"], tol)
    return {"tol": tol, "n_pred": len(pred), "matched": len(hits),
            "precision": round(prec, 4), "recall": round(rec, 4), "f1": round(f1, 4),
            "chance_recall": round(floor, 4), "lift": round(rec - floor, 4)}


def hinge_word(ranked: "list[int]", truth: dict, tol: int) -> dict:
    """Of the cuts an arm found, does its strongest land on the hinge? Chance pays 1/n_boundaries, and no
    widening of the tolerance buys the rank. `ranked` arrives strongest-first."""
    hinge = truth["hinge"]
    n_true = len(truth["boundaries"])
    if hinge is None or not ranked:
        return {"scored": False}
    on = [i for i, p in enumerate(ranked) if abs(p - hinge) <= tol]
    rank = (on[0] + 1) if on else None
    return {"scored": True, "hinge_word": hinge, "rank_of_hinge": rank,
            "found": rank is not None, "strongest_is_hinge": rank == 1,
            "chance": round(1 / max(1, n_true), 4)}


def run(mod, bed: str) -> dict:
    """One bed, one pass: the arms on its word stream, each scored across the word-scaled tolerance ladder
    against the word-coordinate answer key. Reads no key into the instrument — the wall holds."""
    lines = mod.bed_text(bed)                    # the instrument's ONLY door
    truth = word_ground_truth(mod, bed)          # the SCORER crosses the wall, in word coordinates
    _toks, arms = arm_cuts(lines)
    wpl = truth["n_words"] / max(1, truth["n_lines"])
    tols = sorted(set(max(0, round(t * wpl)) for t in TOLERANCES))   # the SAME physical span, in words
    rows = {}
    for arm, cuts in arms.items():
        curve = [score_word(cuts, truth, t) for t in tols]
        best = max(curve, key=lambda r: r["lift"])
        rows[arm] = {"best": best, "hinge": hinge_word(cuts, truth, tols[len(tols) // 2])}
    return {"bed": bed, "n_words": truth["n_words"], "n_boundaries": len(truth["boundaries"]),
            "words_per_line": truth["words_per_line"], "tolerances_words": tols, "arms": rows}


def render(rep: dict) -> None:
    print(f"\n══ {rep['bed']} · {rep['n_words']:,} words · {rep['n_boundaries']} boundaries "
          f"· {rep['words_per_line']} words/line · tol ladder {rep['tolerances_words']} (words)")
    print(f"\n  {'arm':>16} {'recall':>7} {'chance':>7} {'LIFT':>7} {'@tol':>6}   hinge")
    for arm, r in sorted(rep["arms"].items(), key=lambda kv: -kv[1]["best"]["lift"]):
        b = r["best"]
        h = r["hinge"]
        hv = ("STRONGEST" if h.get("strongest_is_hinge") else
              f"#{h['rank_of_hinge']}" if h.get("found") else "—") if h.get("scored") else ""
        flag = "  ★" if b["lift"] > 0.15 else ""
        print(f"  {arm:>16} {b['recall']:>7.3f} {b['chance_recall']:>7.3f} {b['lift']:>+7.3f} "
              f"{b['tol']:>6}   {hv}{flag}")


_BEDS = {"kumulipo": "kumulipo_bed", "tw5": "tw5_bed", "pidgin": "pidgin_bed"}


def _load(bedset: str):
    import importlib
    return importlib.import_module(_BEDS[bedset])


def main() -> None:
    ap = argparse.ArgumentParser(description="run sense_analyze's arms against a bed's own wā, word-grained")
    ap.add_argument("--bedset", choices=list(_BEDS), default="kumulipo")
    ap.add_argument("--bed", help="a specific bed within the bedset (default: every bed)")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    mod = _load(a.bedset)
    beds = [a.bed] if a.bed else mod.bed_names()
    out = [run(mod, b) for b in beds]
    if a.json:
        print(json.dumps(out, indent=1))
    else:
        for rep in out:
            render(rep)


if __name__ == "__main__":
    main()
