#!/usr/bin/env python3
"""boundary_score — the pre-registered scorer. It stands BEFORE any instrument runs against it.

WHY PRE-REGISTER. Tune the tolerance, the matching rule, or the boundary count AFTER seeing a result and
the scorer becomes the last place the imposed prior hides: every choice gets made in the direction that
flatters. So the harness lands first, the instrument second, and the harness never moves again.

COORDINATE-AGNOSTIC. The scorer holds no coordinate of its own and no bed of its own — it reads a TRUTH that
carries its own coordinate as a capability (line · character-tick · word) plus the total span it lives in.
An instrument that perceives in ticks (FFZ continuous-pour) scores in ticks; one that perceives in words
(sense_analyze) scores in words; a cue detector that fires on lines scores in lines. Lines survive only as
the answer key's AUTHORING format — `make_truth` reads a bed's line-indexed key, `remap` carries it into any
stream coordinate through an offset map. No magic per-grain ladder: ONE canonical ladder (in the key's native
line units) scales by the truth's own grain (positions-per-key-line), derived, never typed per coordinate.

THE SCORE IS A CURVE, NEVER A NUMBER. `report()` sweeps the tolerance and prints the whole ladder beside its
chance floor. A single tolerance names a choice, and a choice names a prior.

THE NUMBER THAT SAVES US FROM OURSELVES. A detector placing n boundaries UNIFORMLY AT RANDOM among the
candidate cuts still scores, and it scores HIGH once the tolerance opens:

    expected recall  ~=  1 - (1 - (2w+1)/N)^n

So EVERY reported number rides beside its chance floor, and a result that fails to clear the floor reads as
the tolerance doing the work. `lift` carries exactly that: observed recall minus chance recall.

ONE-TO-ONE MATCHING. Greedy, nearest-first, each truth claimed at most once. Without it a burst of
predictions around one true boundary harvests recall for free, and a detector that fires everywhere wins.

THE TWO TESTS TOLERANCE CANNOT REACH:
  · THE HINGE — of the boundaries found, does the STRONGEST rank first, on the pō→ao turn? Chance pays 1/n.
  · THE BRANCH — does the hierarchy hang the branch-wā UNDER its parent, where a witness puts it? Binary.
    Only a hierarchical instrument answers at all; a flat segmenter honestly declines.
"""
from __future__ import annotations

import argparse
import json

#: The canonical tolerance ladder, in the KEY'S NATIVE UNITS (the answer key opens a segment at a LINE). A
#: truth in another coordinate scales this by its grain (positions-per-key-line), so one ladder serves every
#: coordinate — no per-grain magic ladder. It reports whole, always — a single rung names a choice.
TOLERANCES = (0, 2, 5, 10, 20, 50)
#: The hinge tolerance, likewise in key-line units, scaled by grain at score time.
HINGE_TOL = 20


# ── the truth: a nameless key carrying its own coordinate ─────────────────────────────────────────────
def make_truth(g: dict, *, coordinate: str = "line", branch: "dict | None" = None) -> dict:
    """Wrap a bed's line-indexed ground_truth dict into a coordinate-tagged TRUTH (native LINE units). The
    truth carries everything the scorer needs — no bed import, no module constants. `branch` (optional) names
    the hierarchy claim: {"wa": <branch>, "parent": <expected-parent>}."""
    return {
        "bed": g.get("bed"),
        "coordinate": coordinate,
        "n_total": g["n_lines"],
        "key_lines": g["n_lines"],          # the answer key's native line count — the grain denominator
        "boundaries": list(g["boundaries"]),
        "hinge": g.get("hinge"),
        "branch": branch,
    }


def remap(truth: dict, offsets: "list[int]", coordinate: str, n_total: int) -> dict:
    """Carry a truth into another coordinate through an offset map — offsets[L] = the position where line L
    opens in the target coordinate (character ticks, words, …). The #has-coordinate capability: one key, any
    grain. `key_lines` rides UNCHANGED (it stays the grain denominator), so the tolerance ladder scales
    correctly no matter how many coordinates the truth passes through."""
    def at(b: "int | None") -> "int | None":
        if b is None:
            return None
        return offsets[b] if 0 <= b < len(offsets) else n_total
    return {**truth, "coordinate": coordinate, "n_total": n_total,
            "boundaries": [at(b) for b in truth["boundaries"]], "hinge": at(truth.get("hinge"))}


def _grain(truth: dict) -> float:
    """Positions-per-key-line — the derived scale that carries the canonical (line-unit) tolerance ladder into
    this truth's coordinate. 1.0 for a line truth; n_ticks/n_lines for ticks; n_words/n_lines for words."""
    return truth["n_total"] / max(1, truth.get("key_lines", truth["n_total"]))


def tolerances_for(truth: dict) -> "list[int]":
    """The canonical ladder, scaled into the truth's coordinate by its grain — one ladder, no per-grain magic."""
    g = _grain(truth)
    return sorted(set(max(0, round(t * g)) for t in TOLERANCES))


# ── the pre-registered math (coordinate-blind — a position is a position) ─────────────────────────────
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


def chance_recall(n_pred: int, n_total: int, tol: int) -> float:
    """Expected recall of a detector placing `n_pred` cuts UNIFORMLY AT RANDOM across `n_total` positions.

    A truth escapes one random cut with probability (1 - (2*tol+1)/n_total); it escapes all n of them with
    that raised to the n. The complement names how much a coin flip harvests — and at a wide tolerance it
    harvests a great deal, which is the whole reason this function exists.
    """
    if n_total <= 0 or n_pred <= 0:
        return 0.0
    window = min(1.0, (2 * tol + 1) / n_total)
    return 1.0 - (1.0 - window) ** n_pred


def equal_partition(n_total: int, k: int) -> "list[int]":
    """The second floor: k cuts at even intervals — the detector that knows only 'spans exist'."""
    return [round(n_total * i / (k + 1)) for i in range(1, k + 1)]


def score(pred: "list[int]", truth: dict, tol: int) -> dict:
    """One rung of the ladder: precision, recall, F1, and the LIFT over a random detector of equal size."""
    true = truth["boundaries"]
    pred = sorted(set(int(p) for p in pred))
    hits = match_one_to_one(pred, true, tol)
    prec = len(hits) / len(pred) if pred else 0.0
    rec = len(hits) / len(true) if true else 0.0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
    floor = chance_recall(len(pred), truth["n_total"], tol)
    return {
        "tol": tol, "n_pred": len(pred), "n_true": len(true), "matched": len(hits),
        "precision": round(prec, 4), "recall": round(rec, 4), "f1": round(f1, 4),
        "chance_recall": round(floor, 4),
        "lift": round(rec - floor, 4),          # <= 0 means the tolerance did the work, not the instrument
    }


def hinge_test(ranked: "list[int]", truth: dict, tol: "int | None" = None) -> dict:
    """Of the boundaries the instrument found, does its STRONGEST land on the pō→ao turn?

    `ranked` arrives ordered by the instrument's OWN strength, strongest first. Chance pays 1/n, and no
    widening of the tolerance buys the rank — which is what makes this the honest test.
    """
    hinge = truth.get("hinge")
    true = truth["boundaries"]
    if hinge is None or not ranked:
        return {"scored": False, "reason": "truth carries no hinge, or the instrument ranked nothing"}
    if tol is None:
        tol = max(1, round(HINGE_TOL * _grain(truth)))
    on_hinge = [i for i, p in enumerate(ranked) if abs(p - hinge) <= tol]
    rank = (on_hinge[0] + 1) if on_hinge else None
    return {
        "scored": True, "hinge_pos": hinge, "tol": tol,
        "rank_of_hinge": rank,                       # 1 = the instrument called the hinge its strongest
        "found": rank is not None,
        "strongest_is_hinge": rank == 1,
        "chance": round(1 / max(1, len(true)), 4),
    }


def branch_test(parent_of: "dict | None", truth: dict) -> dict:
    """Does the induced hierarchy hang the branch-wā BENEATH its parent?

    A flat segmenter passes `None` and declines honestly; declining beats guessing. The claim rides in the
    truth (`branch = {"wa", "parent"}`), so the scorer holds no bed-specific number of its own.
    """
    branch = truth.get("branch")
    if not parent_of or not branch:
        return {"scored": False, "reason": "a flat instrument holds no hierarchy — it declines honestly"}
    return {
        "scored": True,
        "branch_wa": branch["wa"], "expected_parent": branch["parent"],
        "found_parent": parent_of.get(branch["wa"]),
        "attaches_correctly": parent_of.get(branch["wa"]) == branch["parent"],
    }


def _shape(truth: dict) -> dict:
    """The truth's segment shape IN ITS OWN COORDINATE — recomputed from the boundaries so the ratio reads in
    ticks/words/lines as the coordinate demands, never a stale line-shape carried along."""
    opens = [0] + sorted(truth["boundaries"]) + [truth["n_total"]]
    lengths = [b - a for a, b in zip(opens, opens[1:]) if b > a]
    return {"n_total": truth["n_total"], "coordinate": truth["coordinate"],
            "n_boundaries": len(truth["boundaries"]),
            "segment_lengths": lengths,
            "length_ratio": (max(lengths) / min(lengths)) if lengths else 0.0}


def report(pred: "list[int]", truth: dict, *, ranked: "list[int] | None" = None,
           parent_of: "dict | None" = None) -> dict:
    """The whole ladder, both floors, and the two tolerance-proof tests. The ONLY reporting surface. The
    tolerance ladder scales into the truth's coordinate by its own grain — one canonical ladder, no magic."""
    tols = tolerances_for(truth)
    rows = [score(pred, truth, t) for t in tols]
    even = equal_partition(truth["n_total"], len(truth["boundaries"]))
    return {
        "bed": truth.get("bed"),
        "coordinate": truth["coordinate"],
        "bed_shape": _shape(truth),
        "tolerances": tols,
        "tolerance_curve": rows,
        "equal_partition_floor": [score(even, truth, t) for t in tols],
        "hinge": hinge_test(ranked or pred, truth),
        "branch": branch_test(parent_of, truth),
    }


def render(rep: dict) -> None:
    b = rep["bed_shape"]
    unit = b["coordinate"]
    print(f"\n══ {rep['bed']} · {b['n_total']:,} {unit}s · {b['n_boundaries']} boundaries · "
          f"segments {min(b['segment_lengths'])}–{max(b['segment_lengths'])} {unit}s "
          f"(RATIO {b['length_ratio']:.1f}x — no single window spans this)")
    print(f"\n  {'tol':>6} {'prec':>6} {'recall':>7} {'f1':>6} {'chance':>7} {'LIFT':>7}   "
          f"{'even-partition f1':>18}")
    for row, even in zip(rep["tolerance_curve"], rep["equal_partition_floor"]):
        flag = "  ← tolerance did the work" if row["lift"] <= 0 else ""
        print(f"  {row['tol']:>6} {row['precision']:>6.3f} {row['recall']:>7.3f} {row['f1']:>6.3f} "
              f"{row['chance_recall']:>7.3f} {row['lift']:>+7.3f}   {even['f1']:>18.3f}{flag}")
    h = rep["hinge"]
    if h.get("scored"):
        verdict = ("STRONGEST — the instrument called the hinge first" if h["strongest_is_hinge"]
                   else f"ranked #{h['rank_of_hinge']}" if h["found"] else "MISSED")
        print(f"\n  hinge (pō→ao) at {unit} {h['hinge_pos']}: {verdict}   [chance {h['chance']}]")
    br = rep["branch"]
    if br.get("scored"):
        print(f"  branch (wā {br['branch_wa']} under {br['expected_parent']}): "
              f"{'YES' if br['attaches_correctly'] else f'no — attached to {br['found_parent']}'}")
    else:
        print(f"  branch: {br['reason']}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="score a segmentation against a coordinate-tagged truth")
    ap.add_argument("--truth", required=True,
                    help="JSON truth {boundaries, n_total, coordinate, [key_lines, hinge, branch]}, or '-' for stdin")
    ap.add_argument("--pred", required=True, help="JSON list of predicted positions, or '-' to read stdin")
    ap.add_argument("--ranked", help="JSON list ordered by the instrument's OWN strength, strongest first")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    import sys
    truth = json.load(sys.stdin) if a.truth == "-" else json.loads(a.truth)
    truth.setdefault("key_lines", truth["n_total"])
    truth.setdefault("coordinate", "line")
    pred = json.load(sys.stdin) if a.pred == "-" else json.loads(a.pred)
    rep = report(pred, truth, ranked=json.loads(a.ranked) if a.ranked else None)
    print(json.dumps(rep, indent=1)) if a.json else render(rep)
