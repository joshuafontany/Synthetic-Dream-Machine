#!/usr/bin/env python3
"""sensorium_fusion — the py twin of the mesh H1 cohomological gate (RUN-ARC.md #3).

Ports the CONTRACT of packages/lararium-mesh/src/sensorium-fusion.ts — the gate that
tells apart the two categorically different no-global-nows over a li-assignment:

  H1 = 0 — the EPISTEMIC no-global-now: nothing forbids a global section; the planes
           reconcile toward the H0 consensus (a global section stands reachable).
  H1 > 0 — the ONTOLOGICAL no-global-now: a genuine cocycle — the planes agree on every
           pairwise overlap yet NO global section exists (the hollow-triangle
           obstruction). Nothing averages it away; the gate SURFACES it, carrying the
           reconciliation cost R*_sem = log2(dim H1) (Thomas-Chen).

WHERE THE SUBTLETY LIVES (the TS oracle's honest note, carried whole): the obstruction
rides the simplicial cohomology of the AGREEMENT NERVE — an edge where two planes overlap
AND agree, a triangle where three planes share a common WITNESS unit — NOT the value-
sheaf's cellular H1 (free restrictions make that one vanish identically).

  dim H1 = dim ker(d1) - rank(d0) = (E - rank d1) - rank d0     (rank-nullity; im d0
  sits inside ker d1 because d1 . d0 = 0), computed here through numpy's SVD rank.

THE FUSE, honestly scoped: the H1=0 branch returns the EXACT H0 consensus — the kernel
projection P_ker (the per-unit mean over the planes observing that unit), the target the
TS Chebyshev heat diffusion e^{-tL0} converges to as t grows. The order-K Chebyshev
POLYNOMIAL itself (an approximation dial + telemetry around that same target) stays a
TS-side instrument; the py RUN reads the exact target. Named here so the parity fixture
binds the CONSENSUS, never a truncation artifact.

Cosheaf (ki) planes are REFUSED, exactly as the TS gate refuses them.

The `fixture` face regenerates the committed TS<->py parity fixture:
  ~/.venv/bin/python3 sensorium_fusion.py fixture
  -> packages/lararium-mesh/tests/fixtures/sensorium-fusion-parity.json

Meme: lar:///ha.ka.ba/@lares/api/pono/li-ki-integrities#crucible-tested
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys

import numpy as np

from sensorium_consistency import chebyshev_stalk_metric

_DEFAULT_TOL = 1e-9


def _assert_no_cosheaf(restrictions: list) -> None:
    """Refuse any cosheaf plane — the flow-through-restriction silent corruption."""
    bad = [r for r in restrictions if r.get("variance") != "sheaf"]
    if bad:
        names = ", ".join(r["plane"] for r in bad)
        raise ValueError(
            f"sensorium_fusion: the cohomology gate admits SHEAF planes only; got cosheaf "
            f"plane(s) [{names}] — a ki flow read through a contravariant restriction "
            f"corrupts silently (li-ki-integrities.md#crucible-tested).")


def _domain_of(restriction: dict, stalk_units: set) -> list:
    """A restriction's domain, intersected with the shared stalk (insertion order held)."""
    return [u for u in restriction["value"].keys() if u in stalk_units]


# ── the agreement nerve (edges = overlap AND agree; triangles = a common witness) ─────────


def agreement_nerve(assignment: dict, *, stalk_metric=None,
                    agreement_tolerance: float = _DEFAULT_TOL) -> dict:
    """Build the agreement nerve over a li-assignment: an edge stands where two planes
    OVERLAP and AGREE there (disagreement <= tolerance); a triangle fills in where all
    three edges stand AND a common witness unit lies in the triple overlap."""
    restrictions = assignment["restrictions"]
    _assert_no_cosheaf(restrictions)
    metric = stalk_metric or chebyshev_stalk_metric
    eps = agreement_tolerance
    stalk_units = set(assignment["stalk"].get("units") or [])
    n = len(restrictions)
    domains = [_domain_of(r, stalk_units) for r in restrictions]
    domain_sets = [set(d) for d in domains]

    vertices = [{"planes": [i], "names": [restrictions[i]["plane"]], "witness": list(domains[i])}
                for i in range(n)]

    edges = []
    edge_present = [[False] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            overlap = [u for u in domains[i] if u in domain_sets[j]]
            if not overlap:
                continue                      # no shared unit -> no constraint -> no edge
            distance, _ = metric(restrictions[i]["value"], restrictions[j]["value"], overlap)
            if distance > eps:
                continue                      # they DISAGREE -> epistemic, no agreement edge
            edge_present[i][j] = True
            edges.append({"planes": [i, j],
                          "names": [restrictions[i]["plane"], restrictions[j]["plane"]],
                          "witness": overlap})

    triangles = []
    for i in range(n):
        for j in range(i + 1, n):
            if not edge_present[i][j]:
                continue
            for k in range(j + 1, n):
                if not (edge_present[i][k] and edge_present[j][k]):
                    continue
                tri = [u for u in domains[i] if u in domain_sets[j] and u in domain_sets[k]]
                if not tri:
                    continue                  # no common witness -> the triangle stays HOLLOW
                triangles.append({"planes": [i, j, k],
                                  "names": [restrictions[i]["plane"], restrictions[j]["plane"],
                                            restrictions[k]["plane"]],
                                  "witness": tri})

    return {"vertices": vertices, "edges": edges, "triangles": triangles}


# ── the H1 obstruction (Cech d0/d1 over the nerve; numpy carries the ranks) ───────────────


def reconciliation_cost(dim_h1: int) -> float:
    """The reconciliation cost R*_sem = log2(dim H1) (Thomas-Chen); 0 when dim H1 in {0,1}."""
    return math.log2(dim_h1) if dim_h1 > 0 else 0.0


def cohomology_obstruction(assignment: dict, *, stalk_metric=None,
                           agreement_tolerance: float = _DEFAULT_TOL) -> dict:
    """Compute the H1 COHOMOLOGICAL OBSTRUCTION of the assignment — the simplicial
    cohomology of the agreement nerve, H1 = ker(d1)/im(d0) over the reals.
    dim H1 = 0 <-> reconcilable; dim H1 > 0 <-> an ontological cocycle. Raises on a
    cosheaf plane."""
    nerve = agreement_nerve(assignment, stalk_metric=stalk_metric,
                            agreement_tolerance=agreement_tolerance)
    V = len(nerve["vertices"])
    E = len(nerve["edges"])
    T = len(nerve["triangles"])

    edge_index = {",".join(map(str, e["planes"])): idx for idx, e in enumerate(nerve["edges"])}

    # d0 : C0(R^V) -> C1(R^E), one row per edge (i<j): -1 at i, +1 at j.
    d0 = np.zeros((E, V), dtype=float)
    for r, e in enumerate(nerve["edges"]):
        d0[r, e["planes"][0]] = -1.0
        d0[r, e["planes"][1]] = 1.0

    # d1 : C1(R^E) -> C2(R^T), one row per triangle (i<j<k): +[j,k] -[i,k] +[i,j].
    d1 = np.zeros((T, E), dtype=float)
    for r, t in enumerate(nerve["triangles"]):
        i, j, k = t["planes"]
        d1[r, edge_index[f"{j},{k}"]] = 1.0
        d1[r, edge_index[f"{i},{k}"]] = -1.0
        d1[r, edge_index[f"{i},{j}"]] = 1.0

    rank_d0 = int(np.linalg.matrix_rank(d0)) if E > 0 else 0
    rank_d1 = int(np.linalg.matrix_rank(d1)) if T > 0 and E > 0 else 0
    dim_h0 = V - rank_d0                    # = agreement-connected plane clusters
    dim_h1 = (E - rank_d1) - rank_d0        # rank-nullity: im d0 sits inside ker d1

    return {
        "dimH1": dim_h1,
        "dimH0": dim_h0,
        "cost": reconciliation_cost(dim_h1),
        "nerve": nerve,
        "kind": "ontological" if dim_h1 > 0 else "reconcilable",
    }


# ── the H0 consensus (the exact kernel projection) + the gate ─────────────────────────────


def kernel_consensus(assignment: dict) -> dict:
    """The EXACT H0 consensus P_ker — per stalk unit, the mean of the values the observing
    planes carry there (a single observer keeps its own value). The target the TS
    Chebyshev heat diffusion converges to; py reads the target exactly."""
    stalk_units = set(assignment["stalk"].get("units") or [])
    per_unit: dict = {}
    for r in assignment["restrictions"]:
        for u, v in r["value"].items():
            if u in stalk_units:
                per_unit.setdefault(u, []).append(float(v))
    return {u: sum(vals) / len(vals) for u, vals in per_unit.items()}


def fuse(assignment: dict, *, stalk_metric=None,
         agreement_tolerance: float = _DEFAULT_TOL) -> dict:
    """THE COHOMOLOGICAL GATE. Read H1 first, then fork:
      H1 = 0 -> {"verdict": "fuse", "consensus": {unit: value}} — the exact H0 projection;
      H1 > 0 -> {"verdict": "hold-open", "obstruction": {dimH1, cost}} — the ontological
                cell, surfaced whole, never averaged away.
    Raises on a cosheaf plane."""
    obs = cohomology_obstruction(assignment, stalk_metric=stalk_metric,
                                 agreement_tolerance=agreement_tolerance)
    if obs["dimH1"] > 0:
        return {"verdict": "hold-open", "fused": None,
                "obstruction": {"dimH1": obs["dimH1"], "cost": obs["cost"]}}
    return {"verdict": "fuse", "obstruction": None,
            "fused": {"consensus": kernel_consensus(assignment)}}


# ── the fixture face ──────────────────────────────────────────────────────────────────────


def _sheaf(plane: str, value: dict) -> dict:
    return {"plane": plane, "variance": "sheaf", "value": value}


def _hollow_triangle(base: float, gap: float, tag: str = "") -> dict:
    """The classic cocycle: three planes pairwise-overlap on ONE unit each, disagreeing by
    exactly `gap`, with NO unit in all three domains — pairwise-reconcilable within `gap`,
    globally obstructed (the TS bench's corpus cell, one triangle)."""
    a, b, c = f"a{tag}", f"b{tag}", f"c{tag}"
    return {
        "restrictions": [
            _sheaf(f"content{tag}", {a: base, b: base}),
            _sheaf(f"structure{tag}", {b: base + gap, c: base}),
            _sheaf(f"form{tag}", {c: base + gap, a: base + gap}),
        ],
        "stalk": {"units": [a, b, c]},
    }


def _fixture_cases() -> list:
    cases = []

    hollow = _hollow_triangle(0.5, 0.2)
    cases.append({"note": "hollow triangle BELOW tolerance — edges absent, no obstruction",
                  "assignment": hollow, "agreementTolerance": 0.1})
    cases.append({"note": "hollow triangle ABOVE tolerance — one H1 generator",
                  "assignment": hollow, "agreementTolerance": 0.3})

    filled = {
        "restrictions": [
            _sheaf("content", {"w": 0.5, "u1": 0.2}),
            _sheaf("structure", {"w": 0.5, "u2": 0.8}),
            _sheaf("form", {"w": 0.5, "u3": 0.4}),
        ],
        "stalk": {"units": ["w", "u1", "u2", "u3"]},
    }
    cases.append({"note": "filled triangle — a common witness kills the cocycle",
                  "assignment": filled, "agreementTolerance": 1e-9})

    two_comp = {
        "restrictions": [
            _sheaf("p0", {"x": 0.3}), _sheaf("p1", {"x": 0.3}),
            _sheaf("p2", {"y": 0.7}), _sheaf("p3", {"y": 0.7}),
        ],
        "stalk": {"units": ["x", "y"]},
    }
    cases.append({"note": "two agreement components — dimH0 = 2",
                  "assignment": two_comp, "agreementTolerance": 1e-9})

    staircase = {
        "restrictions": (_hollow_triangle(0.5, 0.1, "s0")["restrictions"]
                         + _hollow_triangle(0.5, 0.4, "s1")["restrictions"]),
        "stalk": {"units": ["as0", "bs0", "cs0", "as1", "bs1", "cs1"]},
    }
    cases.append({"note": "two independent triangles, gaps 0.1/0.4 — tolerance 0.2 mints ONE",
                  "assignment": staircase, "agreementTolerance": 0.2})
    cases.append({"note": "two independent triangles — tolerance 0.5 mints BOTH (R*_sem = 1 bit)",
                  "assignment": staircase, "agreementTolerance": 0.5})

    fuse_case = {
        "restrictions": [
            _sheaf("content", {"u1": 0.2, "u2": 0.6}),
            _sheaf("structure", {"u1": 0.2, "u2": 0.6, "u3": 0.4}),
            _sheaf("form", {"u3": 0.4, "u1": 0.2}),
        ],
        "stalk": {"units": ["u1", "u2", "u3"]},
    }
    cases.append({"note": "reconcilable — the gate fuses to the exact H0 consensus",
                  "assignment": fuse_case, "agreementTolerance": 1e-9})

    for c in cases:
        obs = cohomology_obstruction(c["assignment"],
                                     agreement_tolerance=c["agreementTolerance"])
        verdict = fuse(c["assignment"], agreement_tolerance=c["agreementTolerance"])
        c["expected"] = {
            "dimH1": obs["dimH1"], "dimH0": obs["dimH0"], "cost": obs["cost"],
            "kind": obs["kind"],
            "edges": len(obs["nerve"]["edges"]),
            "triangles": len(obs["nerve"]["triangles"]),
            "verdict": verdict["verdict"],
        }
        if verdict["verdict"] == "fuse":
            c["expected"]["consensus"] = verdict["fused"]["consensus"]
    return cases


def _fixture_path() -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(
        here, "..", "..", "lararium-mesh", "tests", "fixtures",
        "sensorium-fusion-parity.json"))


def cmd_fixture(args) -> None:
    """Regenerate the committed parity fixture — py computes, TS re-computes and asserts."""
    out = {
        "oracle": "sensorium_fusion.py (py twin; TS re-computes and asserts)",
        "cases": _fixture_cases(),
    }
    path = args.out or _fixture_path()
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    sys.stdout.write(f"wrote {path} — {len(out['cases'])} cases\n")


def cmd_selftest(args) -> None:
    """A no-fixture check: the hollow triangle obstructs, the filled one reconciles, the
    gate forks, and the cosheaf refusal raises."""
    hollow = _hollow_triangle(0.5, 0.2)
    below = cohomology_obstruction(hollow, agreement_tolerance=0.1)
    above = cohomology_obstruction(hollow, agreement_tolerance=0.3)
    gate = fuse(hollow, agreement_tolerance=0.3)
    try:
        cohomology_obstruction({"restrictions": [
            {"plane": "bands", "variance": "cosheaf", "value": {"u": 1.0}}],
            "stalk": {"units": ["u"]}})
        refused = False
    except ValueError:
        refused = True
    report = {
        "below_dimH1": below["dimH1"], "above_dimH1": above["dimH1"],
        "gate_holds_open": gate["verdict"] == "hold-open",
        "cosheaf_refused": refused,
    }
    sys.stdout.write(json.dumps(report) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="sensorium_fusion — the py H1 gate twin")
    sub = ap.add_subparsers(dest="cmd", required=True)
    fx = sub.add_parser("fixture", help="regenerate the committed TS<->py parity fixture")
    fx.add_argument("--out", default=None)
    fx.set_defaults(fn=cmd_fixture)
    st = sub.add_parser("selftest", help="no-fixture behavior check")
    st.set_defaults(fn=cmd_selftest)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()