#!/usr/bin/env python3
"""boundary_score — the pre-registered scorer. It stands BEFORE any instrument runs against it.

WHY PRE-REGISTER. Tune the tolerance, the matching rule, or the boundary count AFTER seeing a result and
the scorer becomes the last place the imposed prior hides: every choice gets made in the direction that
flatters. So the harness lands first, the instrument second, and the harness never moves again.

THE SCORE IS A CURVE, NEVER A NUMBER. `report()` sweeps the tolerance and prints the whole ladder beside
its chance floor. A single tolerance names a choice, and a choice names a prior.

THE NUMBER THAT SAVES US FROM OURSELVES. A detector placing n boundaries UNIFORMLY AT RANDOM among the
candidate cuts still scores, and it scores HIGH once the tolerance opens:

    expected recall  ~=  1 - (1 - (2w+1)/N)^n

On the Hawaiian bed (N ~ 6600, n = 15), a coin-flip detector recovers a real share of the wā at w = 50.
So EVERY reported number rides beside its chance floor, and a result that fails to clear the floor reads
as the tolerance doing the work. `lift` carries exactly that: observed recall minus chance recall.

THE SECOND FLOOR — EQUAL PARTITION. Fifteen cuts laid at even intervals. The wā run 58 to 3352 lines, so
an even partition scores badly, and HOW badly calibrates how much of any result rides real structure
rather than "spans sit roughly evenly spaced."

ONE-TO-ONE MATCHING. Greedy, nearest-first, each truth claimed at most once. Without it a burst of
predictions around one true boundary harvests recall for free, and a detector that fires everywhere wins.

THE TWO TESTS TOLERANCE CANNOT REACH:
  · THE HINGE — of the fifteen, does the STRONGEST rank first, on the po -> ao turn? Chance pays 1/15.
    A detector may score well on recall and still fail this, which is what makes it sharp.
  · THE BRANCH — does the hierarchy hang wā 13 UNDER wā 12, where the Queen's witness puts it? Binary.
    Only a hierarchical instrument answers at all; a flat segmenter honestly declines.
"""
from __future__ import annotations

import argparse
import json

from kumulipo_bed import BRANCH_PARENT_WA, BRANCH_WA, HINGE_WA, bed_names, ground_truth

#: The tolerance ladder. It reports whole, always — a single rung names a choice.
TOLERANCES = (0, 2, 5, 10, 20, 50)


def match_one_to_one(pred: "list[int]", true: "list[int]", tol: int) -> "list[tuple]":
    """Greedy nearest-first pairing, each truth claimed once. Returns the (pred, true) pairs that hold.

    Nearest-first, never left-to-right: a left-to-right sweep lets an early sloppy prediction consume the
    truth a later exact one deserved, which quietly rewards firing early.
    """
    pairs = sorted(
        ((abs(p - t), p, t) for p in pred for t in true if abs(p - t) <= tol),
    )
    taken_p, taken_t, out = set(), set(), []
    for _, p, t in pairs:
        if p in taken_p or t in taken_t:
            continue
        taken_p.add(p)
        taken_t.add(t)
        out.append((p, t))
    return out


def chance_recall(n_pred: int, n_lines: int, tol: int) -> float:
    """Expected recall of a detector placing `n_pred` cuts UNIFORMLY AT RANDOM.

    A truth escapes one random cut with probability (1 - (2*tol+1)/n_lines); it escapes all n of them
    with that raised to the n. The complement names how much a coin flip harvests — and at a wide
    tolerance it harvests a great deal, which is the whole reason this function exists.
    """
    if n_lines <= 0 or n_pred <= 0:
        return 0.0
    window = min(1.0, (2 * tol + 1) / n_lines)
    return 1.0 - (1.0 - window) ** n_pred


def equal_partition(n_lines: int, k: int) -> "list[int]":
    """The second floor: k cuts at even intervals — the detector that knows only 'spans exist'."""
    return [round(n_lines * i / (k + 1)) for i in range(1, k + 1)]


def score(pred: "list[int]", bed: str, tol: int) -> dict:
    """One rung of the ladder: precision, recall, F1, and the LIFT over a random detector of equal size."""
    g = ground_truth(bed)
    true = g["boundaries"]
    pred = sorted(set(int(p) for p in pred))
    hits = match_one_to_one(pred, true, tol)
    prec = len(hits) / len(pred) if pred else 0.0
    rec = len(hits) / len(true) if true else 0.0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
    floor = chance_recall(len(pred), g["n_lines"], tol)
    return {
        "tol": tol, "n_pred": len(pred), "n_true": len(true), "matched": len(hits),
        "precision": round(prec, 4), "recall": round(rec, 4), "f1": round(f1, 4),
        "chance_recall": round(floor, 4),
        "lift": round(rec - floor, 4),          # <= 0 means the tolerance did the work, not the instrument
    }


def hinge_test(ranked: "list[int]", bed: str, tol: int = 20) -> dict:
    """Of the boundaries the instrument found, does its STRONGEST land on the po -> ao turn?

    `ranked` arrives ordered by the instrument's OWN strength, strongest first. Chance pays 1/15, and no
    widening of the tolerance buys the rank — which is what makes this the honest test.
    """
    g = ground_truth(bed)
    hinge = g["hinge"]
    if hinge is None or not ranked:
        return {"scored": False, "reason": "bed carries no hinge, or the instrument ranked nothing"}
    on_hinge = [i for i, p in enumerate(ranked) if abs(p - hinge) <= tol]
    rank = (on_hinge[0] + 1) if on_hinge else None
    return {
        "scored": True, "hinge_line": hinge, "tol": tol,
        "rank_of_hinge": rank,                       # 1 = the instrument called the hinge its strongest
        "found": rank is not None,
        "strongest_is_hinge": rank == 1,
        "chance": round(1 / max(1, len(g["boundaries"])), 4),
        "wa": HINGE_WA,
    }


def branch_test(parent_of: "dict | None", bed: str) -> dict:
    """Does the induced hierarchy hang wā 13 BENEATH wā 12?

    The witnesses disagree: the Hawaiian names a thirteenth ERA; the Queen names "A Branch of the Twelfth
    Era". So a hierarchical instrument answers a question the beds themselves argue over — and our own
    corpus carries the identical shape in `isSidechain`. A flat segmenter passes `None` and declines
    honestly; declining beats guessing.
    """
    if not parent_of:
        return {"scored": False, "reason": "a flat instrument holds no hierarchy — it declines honestly"}
    return {
        "scored": True,
        "branch_wa": BRANCH_WA, "expected_parent": BRANCH_PARENT_WA,
        "found_parent": parent_of.get(BRANCH_WA),
        "attaches_correctly": parent_of.get(BRANCH_WA) == BRANCH_PARENT_WA,
    }


def report(pred: "list[int]", bed: str, *, ranked: "list[int] | None" = None,
           parent_of: "dict | None" = None) -> dict:
    """The whole ladder, both floors, and the two tolerance-proof tests. The ONLY reporting surface."""
    g = ground_truth(bed)
    rows = [score(pred, bed, t) for t in TOLERANCES]
    even = equal_partition(g["n_lines"], len(g["boundaries"]))
    return {
        "bed": bed,
        "bed_shape": {"n_lines": g["n_lines"], "n_wa": g["n_wa"],
                      "segment_lengths": g["segment_lengths"],
                      "length_ratio": round(g["length_ratio"], 1)},
        "tolerance_curve": rows,
        "equal_partition_floor": [score(even, bed, t) for t in TOLERANCES],
        "hinge": hinge_test(ranked or pred, bed),
        "branch": branch_test(parent_of, bed),
    }


def render(rep: dict) -> None:
    b = rep["bed_shape"]
    print(f"\n══ {rep['bed']} · {b['n_lines']} lines · {b['n_wa']} wā · "
          f"segments {min(b['segment_lengths'])}–{max(b['segment_lengths'])} "
          f"(RATIO {b['length_ratio']}x — no single window spans this)")
    print(f"\n  {'tol':>4} {'prec':>6} {'recall':>7} {'f1':>6} {'chance':>7} {'LIFT':>7}   "
          f"{'even-partition f1':>18}")
    for row, even in zip(rep["tolerance_curve"], rep["equal_partition_floor"]):
        flag = "  ← tolerance did the work" if row["lift"] <= 0 else ""
        print(f"  {row['tol']:>4} {row['precision']:>6.3f} {row['recall']:>7.3f} {row['f1']:>6.3f} "
              f"{row['chance_recall']:>7.3f} {row['lift']:>+7.3f}   {even['f1']:>18.3f}{flag}")
    h = rep["hinge"]
    if h.get("scored"):
        verdict = ("STRONGEST — the instrument called the hinge first" if h["strongest_is_hinge"]
                   else f"ranked #{h['rank_of_hinge']}" if h["found"] else "MISSED")
        print(f"\n  hinge (pō→ao, wā {h['wa']}, line {h['hinge_line']}): {verdict}   "
              f"[chance {h['chance']}]")
    br = rep["branch"]
    if br.get("scored"):
        print(f"  branch (wā {br['branch_wa']} under {br['expected_parent']}): "
              f"{'YES' if br['attaches_correctly'] else f'no — attached to {br['found_parent']}'}")
    else:
        print(f"  branch: {br['reason']}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="score a segmentation against the Kumulipo's own wā")
    ap.add_argument("--bed", choices=bed_names(), required=True)
    ap.add_argument("--pred", required=True,
                    help="JSON list of predicted boundary line indices, or '-' to read stdin")
    ap.add_argument("--ranked", help="JSON list ordered by the instrument's OWN strength, strongest first")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    import sys
    pred = json.load(sys.stdin) if a.pred == "-" else json.loads(a.pred)
    rep = report(pred, a.bed, ranked=json.loads(a.ranked) if a.ranked else None)
    print(json.dumps(rep, indent=1)) if a.json else render(rep)
