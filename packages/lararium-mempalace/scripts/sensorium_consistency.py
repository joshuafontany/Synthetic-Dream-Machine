#!/usr/bin/env python3
"""sensorium_consistency — the py twin of the mesh H0 organ (RUN-ARC.md #3, owed-py-twin paid).

Ports the CONTRACT of packages/lararium-mesh/src/sensorium-consistency.ts — the Robinson
CONSISTENCY-RADIUS over a sensorium's LI (sheaf) planes — carrying the same three crucible
cautions the TS oracle carries:

  (a) value lives in ENGINEERED OVERLAPS — planes with disjoint domains constrain nothing,
      so the radius reads VACUOUSLY 0 and the verdict flags it rather than faking a glue;
  (b) the restrictions run NON-Lipschitz, so the radius reads as a DISAGREEMENT SIGNAL,
      never a distortion bound (`signalKind` says so on the wire);
  (c) the ki co-consistency mirrors as the cosheaf PUSHFORWARD dual — extension up into a
      shared coface stalk, disagreement on codomain CO-OVERLAPS — never a cosheaf faked
      through a contravariant restriction.

The li-radius verdict:
  radius == 0 and not vacuous  ->  the li-planes GLUE (a global section stands);
  radius  > 0                  ->  an OBSTRUCTION, localized per pair;
  vacuous                      ->  no engineered overlap constrained it — 0 buys nothing.

The native stalk pseudometrics ride along (cosine · jaccard · the DECKARD characteristic-
vector tree distance — the structure plane's hot path). The shelved TS paths (pq-gram
refine, cubic exact TED) stay TS-side; this twin carries the hot path only, named here.

Arithmetic runs PURE python float64 in the TS statement order, so the committed parity
fixture binds the two bodies at 1e-5 without reduction-order drift.

The `fixture` face regenerates the committed TS<->py parity fixture (the migration gate:
one fixture per numeric):
  ~/.venv/bin/python3 sensorium_consistency.py fixture
  -> packages/lararium-mesh/tests/fixtures/sensorium-consistency-parity.json

Meme: lar:///ha.ka.ba/@lares/api/pono/li-ki-integrities#crucible-tested
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys

# ── the li/ki plane taxonomy (the variance vocabulary the dual pair rides) ────────────────

SHEAF_PLANES = ("content", "structure", "form")
COSHEAF_PLANES = ("bands", "coupling")


# ── per-plane NATIVE pseudometrics (the stalk metrics) ────────────────────────────────────


def cosine_distance(a: list, b: list) -> float:
    """Cosine DISTANCE 1 - cos-angle (content's native metric). Both-zero -> 0;
    exactly-one-zero -> 1. Range [0,2]. Mirrors the TS statement order."""
    n = max(len(a), len(b))
    dot = na = nb = 0.0
    for i in range(n):
        x = float(a[i]) if i < len(a) else 0.0
        y = float(b[i]) if i < len(b) else 0.0
        dot += x * y
        na += x * x
        nb += y * y
    if na == 0.0 and nb == 0.0:
        return 0.0
    if na == 0.0 or nb == 0.0:
        return 1.0
    return 1.0 - dot / (math.sqrt(na) * math.sqrt(nb))


def jaccard_distance(a: set, b: set) -> float:
    """Jaccard DISTANCE 1 - |A∩B|/|A∪B| (form's native metric). Both-empty -> 0."""
    if not a and not b:
        return 0.0
    inter = len(a & b)
    union = len(a) + len(b) - inter
    return 0.0 if union == 0 else 1.0 - inter / union


# ── the DECKARD characteristic-vector tree distance (structure's hot path) ────────────────
#
# Trees carry the TS LabeledTree shape: {"label": str, "children": [tree, ...]}.


def _esc(label: str) -> str:
    """Escape the structural delimiters so a label carrying `( ) , \\` never forges a
    false pattern boundary (mirrors the TS esc)."""
    return re.sub(r"([\\(),])", r"\\\1", label)


def _pattern_at(node: dict, levels: int) -> str:
    """Serialize the subtree at `node`, TRUNCATED to `levels` tree-levels — one q-level
    atomic pattern (the DECKARD grain)."""
    kids = node.get("children") or []
    if levels <= 1 or not kids:
        return _esc(node["label"])
    return _esc(node["label"]) + "(" + ",".join(_pattern_at(c, levels - 1) for c in kids) + ")"


def characteristic_vector(tree: dict, q: int = 2) -> dict:
    """The DECKARD characteristic vector — the histogram of q-level atomic subtree
    patterns (Jiang et al. 2007). Iterative walk; a deep chain never blows the stack."""
    vec: dict = {}
    stack = [tree]
    while stack:
        node = stack.pop()
        key = _pattern_at(node, q)
        vec[key] = vec.get(key, 0) + 1
        for c in node.get("children") or []:
            stack.append(c)
    return vec


def _angular_cosine(a: dict, b: dict) -> float:
    """ANGULAR cosine distance over two sparse histograms — arccos(cos)/pi in [0,1], a
    triangle-obeying pseudometric. Equal vectors snap to EXACTLY 0 (acos amplifies a
    1-ULP error near sim=1, so the reflexive case short-circuits, as the TS does)."""
    if a == b:
        return 0.0
    dot = na = nb = 0.0
    for k, x in a.items():
        na += x * x
        y = b.get(k)
        if y is not None:
            dot += x * y
    for y in b.values():
        nb += y * y
    if na == 0.0 and nb == 0.0:
        return 0.0
    if na == 0.0 or nb == 0.0:
        return 1.0
    sim = max(-1.0, min(1.0, dot / math.sqrt(na * nb)))
    return math.acos(sim) / math.pi


def deckard_distance(a: dict, b: dict, q: int = 2) -> float:
    """DECKARD distance — angular cosine over the two trees' characteristic vectors.
    Near-linear, in [0,1]; 0 <-> the characteristic vectors coincide. A DISAGREEMENT
    SIGNAL (caution b), never a distortion bound."""
    return _angular_cosine(characteristic_vector(a, q), characteristic_vector(b, q))


# ── the sup-over-pairs core both postures ride (the ONE Robinson radius mechanism) ────────


def _linf_argmax(vp: dict, vq: dict, cells: list) -> tuple:
    """The shared L-infinity argmax core: max_c |vp(c) - vq(c)| over the shared cells;
    locus = the argmax cell(s), empty when the max reads 0."""
    distance = 0.0
    diffs = []
    for c in cells:
        d = abs(float(vp.get(c, 0.0)) - float(vq.get(c, 0.0)))
        diffs.append((c, d))
        if d > distance:
            distance = d
    locus = [c for c, d in diffs if d == distance] if distance > 0 else []
    return distance, locus


def chebyshev_stalk_metric(vp: dict, vq: dict, overlap: list) -> tuple:
    """L-infinity over the overlap — the default stalk pseudometric (mirrors the TS
    chebyshevStalkMetric)."""
    return _linf_argmax(vp, vq, overlap)


def _sup_over_pairs(restrictions: list, cells: list, metric) -> dict:
    """The SUP-OVER-PAIRS core both postures ride (li restrict/meet · ki extend/coface):
    project each restriction's key set onto the shared cells, read pairwise disagreement
    on each pair's overlap, return the sup + the union of maximizing loci + whether ANY
    pair bound (non-vacuous). Each caller enforces its own variance gate FIRST."""
    cell_set = set(cells)
    domains = []
    for r in restrictions:
        dom = [u for u in r["value"].keys() if u in cell_set]  # insertion order held
        domains.append((dom, set(dom)))

    pairs = []
    radius = 0.0
    binding_loci: list = []
    seen_loci: set = set()
    any_binding = False

    for i in range(len(restrictions)):
        for j in range(i + 1, len(restrictions)):
            overlap = [u for u in domains[i][0] if u in domains[j][1]]
            if not overlap:
                pairs.append({"a": restrictions[i]["plane"], "b": restrictions[j]["plane"],
                              "distance": 0.0, "locus": [], "vacuous": True})
                continue
            any_binding = True
            distance, locus = metric(restrictions[i]["value"], restrictions[j]["value"], overlap)
            pairs.append({"a": restrictions[i]["plane"], "b": restrictions[j]["plane"],
                          "distance": distance, "locus": locus, "vacuous": False})
            if distance > radius:
                radius = distance
            for u in locus:
                if u not in seen_loci:
                    seen_loci.add(u)
                    binding_loci.append(u)

    return {"radius": radius, "vacuous": not any_binding, "pairs": pairs,
            "binding_loci": binding_loci}


# ── the li consistency radius (the sheaf posture) ─────────────────────────────────────────


def consistency_radius(restrictions: list, stalk: dict, stalk_metric=None) -> dict:
    """The Robinson CONSISTENCY-RADIUS over the LI (sheaf) planes — the SUP of pairwise
    disagreement on domain OVERLAPS, restricted to the engineered comparison stalk.
    Admits `variance == "sheaf"` only; a cosheaf here raises LOUD (the silent-corruption
    guard the TS oracle throws). Returns the same verdict shape the TS carries:
    {radius, glues, vacuous, pairs, obstructionLocus, signalKind, note?}."""
    metric = stalk_metric or chebyshev_stalk_metric

    non_sheaf = [r for r in restrictions if r.get("variance") != "sheaf"]
    if non_sheaf:
        names = ", ".join(r["plane"] for r in non_sheaf)
        raise ValueError(
            f"sensorium_consistency: the li-radius admits SHEAF planes only; got cosheaf "
            f"plane(s) [{names}] — a cosheaf read through a restriction map corrupts "
            f"silently (li-ki-integrities.md#crucible-tested). Route bands/coupling to "
            f"ki_co_consistency.")

    units = stalk.get("units") or []
    if not units:
        return {"radius": 0.0, "glues": False, "vacuous": True, "pairs": [],
                "obstructionLocus": [], "signalKind": "disagreement-signal",
                "note": "empty comparison stalk — no engineered overlap; a vacuous 0 (caution a)."}

    core = _sup_over_pairs(restrictions, units, metric)
    out = {
        "radius": 0.0 if core["vacuous"] else core["radius"],
        "glues": (not core["vacuous"]) and core["radius"] == 0.0,
        "vacuous": core["vacuous"],
        "pairs": core["pairs"],
        "obstructionLocus": core["binding_loci"],
        "signalKind": "disagreement-signal",
    }
    if core["vacuous"]:
        out["note"] = "no pair shares a domain overlap — disjoint aspects, a vacuous 0 (caution a)."
    return out


# ── the ki co-consistency (the cosheaf PUSHFORWARD mirror, caution c) ─────────────────────


def ki_co_consistency(co_restrictions: list, stalk: dict, coface_metric=None) -> dict:
    """The KI CO-CONSISTENCY-RADIUS over the KI (cosheaf) faces — the pushforward mirror:
    extension UP into a shared coface stalk, pairwise disagreement on codomain CO-OVERLAPS.
    Admits `variance == "cosheaf"` only; a sheaf here raises LOUD (the mirror corruption).
    Returns {radius, coExtends, vacuous, pairs, offendingCoface, signalKind, note?}."""
    metric = coface_metric or chebyshev_stalk_metric

    non_cosheaf = [r for r in co_restrictions if r.get("variance") != "cosheaf"]
    if non_cosheaf:
        names = ", ".join(r["plane"] for r in non_cosheaf)
        raise ValueError(
            f"sensorium_consistency: the ki-radius admits COSHEAF faces only; got sheaf "
            f"plane(s) [{names}] — a sheaf read through an extension map mirrors the "
            f"silent corruption. Route content/structure/form to consistency_radius.")

    cofaces = stalk.get("cofaces") or []
    if not cofaces:
        return {"radius": 0.0, "coExtends": False, "vacuous": True, "pairs": [],
                "offendingCoface": [], "signalKind": "disagreement-signal",
                "note": "empty coface stalk — no engineered co-overlap; a vacuous 0 (caution a)."}

    core = _sup_over_pairs(co_restrictions, cofaces, metric)
    pairs = [{"a": p["a"], "b": p["b"], "distance": p["distance"],
              "offendingCoface": p["locus"], "vacuous": p["vacuous"]} for p in core["pairs"]]
    out = {
        "radius": 0.0 if core["vacuous"] else core["radius"],
        "coExtends": (not core["vacuous"]) and core["radius"] == 0.0,
        "vacuous": core["vacuous"],
        "pairs": pairs,
        "offendingCoface": core["binding_loci"],
        "signalKind": "disagreement-signal",
    }
    if core["vacuous"]:
        out["note"] = "no pair shares a coface co-overlap — disjoint flows, a vacuous 0 (caution a)."
    return out


# ── the fixture face — regenerate the committed TS<->py parity fixture ────────────────────


def _sheaf(plane: str, value: dict) -> dict:
    return {"plane": plane, "variance": "sheaf", "value": value}


def _mulberry32(seed: int):
    """The TS bench's mulberry32, ported bit-exact — one seeded stream regenerates the
    same fixture on both sides of the boundary."""
    a = seed & 0xFFFFFFFF

    def rand() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = (t ^ (t >> 15)) * (t | 1) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return rand


def _radius_cases() -> list:
    """The consistency-radius parity cases — engineered overlaps, a vacuous pair, locus
    ties, and a seeded random spread (values snapped to a 0.05 grid so no comparison sits
    within float noise of a tie)."""
    cases = []

    cases.append({
        "note": "glue — three planes agree on every overlap",
        "restrictions": [
            _sheaf("content", {"u1": 0.5, "u2": 0.3}),
            _sheaf("structure", {"u2": 0.3, "u3": 0.8}),
            _sheaf("form", {"u3": 0.8, "u1": 0.5}),
        ],
        "stalk": {"units": ["u1", "u2", "u3"]},
    })
    cases.append({
        "note": "obstruction — one pair disagrees by 0.4 at u2",
        "restrictions": [
            _sheaf("content", {"u1": 0.5, "u2": 0.3}),
            _sheaf("structure", {"u2": 0.7, "u3": 0.8}),
            _sheaf("form", {"u3": 0.8, "u1": 0.5}),
        ],
        "stalk": {"units": ["u1", "u2", "u3"]},
    })
    cases.append({
        "note": "vacuous — disjoint domains, no pair binds",
        "restrictions": [
            _sheaf("content", {"a": 0.2}),
            _sheaf("structure", {"b": 0.9}),
        ],
        "stalk": {"units": ["a", "b"]},
    })
    cases.append({
        "note": "locus tie — two units maximize the same pair disagreement",
        "restrictions": [
            _sheaf("content", {"u1": 0.1, "u2": 0.1, "u3": 0.5}),
            _sheaf("structure", {"u1": 0.6, "u2": 0.6, "u3": 0.5}),
        ],
        "stalk": {"units": ["u1", "u2", "u3"]},
    })
    cases.append({
        "note": "stalk gate — units outside the stalk never constrain",
        "restrictions": [
            _sheaf("content", {"u1": 0.5, "ghost": 0.0}),
            _sheaf("structure", {"u1": 0.5, "ghost": 1.0}),
        ],
        "stalk": {"units": ["u1"]},
    })

    rng = _mulberry32(0x51D3)
    for k in range(4):
        units = [f"r{k}u{i}" for i in range(5)]
        restrictions = []
        for plane in SHEAF_PLANES:
            value = {}
            for u in units:
                if rng() < 0.75:
                    value[u] = round(rng() * 20) * 0.05
            restrictions.append(_sheaf(plane, value))
        cases.append({"note": f"seeded random spread #{k}", "restrictions": restrictions,
                      "stalk": {"units": units}})

    for c in cases:
        v = consistency_radius(c["restrictions"], c["stalk"])
        c["expected"] = {
            "radius": v["radius"], "glues": v["glues"], "vacuous": v["vacuous"],
            "obstructionLocus": sorted(v["obstructionLocus"]),
            "pairs": [{"a": p["a"], "b": p["b"], "distance": p["distance"],
                       "locus": sorted(p["locus"]), "vacuous": p["vacuous"]}
                      for p in v["pairs"]],
        }
    return cases


def _metric_cases() -> dict:
    """The native-pseudometric parity cases: cosine · jaccard · DECKARD trees."""
    rng = _mulberry32(0xD15C)

    cosine = []
    for note, a, b in [
        ("orthogonal", [1.0, 0.0, 0.0], [0.0, 1.0, 0.0]),
        ("identical", [0.3, 0.4, 0.5], [0.3, 0.4, 0.5]),
        ("one-zero", [0.0, 0.0], [0.2, 0.9]),
        ("both-zero", [0.0, 0.0], [0.0]),
        ("random", [round(rng() * 20) * 0.05 for _ in range(6)],
         [round(rng() * 20) * 0.05 for _ in range(6)]),
    ]:
        cosine.append({"note": note, "a": a, "b": b, "distance": cosine_distance(a, b)})

    jaccard = []
    for note, a, b in [
        ("identical", ["x", "y"], ["x", "y"]),
        ("disjoint", ["x"], ["y", "z"]),
        ("both-empty", [], []),
        ("half", ["x", "y"], ["y", "z"]),
    ]:
        jaccard.append({"note": note, "a": a, "b": b,
                        "distance": jaccard_distance(set(a), set(b))})

    def t(label: str, *children) -> dict:
        return {"label": label, "children": list(children)}

    tree_a = t("doc", t("h1", t("text")), t("p", t("text"), t("em", t("text"))))
    tree_b = t("doc", t("h1", t("text")), t("p", t("text"), t("strong", t("text"))))
    tree_c = t("doc", t("list", t("item"), t("item"), t("item")))
    tree_esc = t("weird(label)", t("a,b", t("c\\d")))
    deckard = [
        {"note": "identical", "a": tree_a, "b": tree_a, "q": 2,
         "distance": deckard_distance(tree_a, tree_a, 2)},
        {"note": "near", "a": tree_a, "b": tree_b, "q": 2,
         "distance": deckard_distance(tree_a, tree_b, 2)},
        {"note": "far", "a": tree_a, "b": tree_c, "q": 2,
         "distance": deckard_distance(tree_a, tree_c, 2)},
        {"note": "q3", "a": tree_a, "b": tree_b, "q": 3,
         "distance": deckard_distance(tree_a, tree_b, 3)},
        {"note": "delimiter-escape", "a": tree_esc, "b": tree_c, "q": 2,
         "distance": deckard_distance(tree_esc, tree_c, 2)},
    ]
    return {"cosine": cosine, "jaccard": jaccard, "deckard": deckard}


def _fixture_path() -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(
        here, "..", "..", "lararium-mesh", "tests", "fixtures",
        "sensorium-consistency-parity.json"))


def cmd_fixture(args) -> None:
    """Regenerate the committed parity fixture — py computes, TS re-computes and asserts
    agreement (fixtures-as-data across the causal island; no live crossing)."""
    out = {
        "oracle": "sensorium_consistency.py (py twin; TS re-computes and asserts)",
        "radiusCases": _radius_cases(),
        "metricCases": _metric_cases(),
    }
    path = args.out or _fixture_path()
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    sys.stdout.write(f"wrote {path} — {len(out['radiusCases'])} radius cases\n")


def cmd_selftest(args) -> None:
    """A no-fixture check: glue, obstruction, vacuous flag, the variance gate, and the ki
    mirror all behave."""
    glue = consistency_radius(
        [_sheaf("content", {"u": 0.5}), _sheaf("structure", {"u": 0.5})], {"units": ["u"]})
    obst = consistency_radius(
        [_sheaf("content", {"u": 0.1}), _sheaf("structure", {"u": 0.9})], {"units": ["u"]})
    vac = consistency_radius(
        [_sheaf("content", {"a": 0.1}), _sheaf("structure", {"b": 0.9})], {"units": ["a", "b"]})
    try:
        consistency_radius([{"plane": "bands", "variance": "cosheaf", "value": {"u": 1.0}}],
                           {"units": ["u"]})
        gate = False
    except ValueError:
        gate = True
    ki = ki_co_consistency(
        [{"plane": "D1", "variance": "cosheaf", "value": {"c0": 0.0}},
         {"plane": "D2", "variance": "cosheaf", "value": {"c0": 0.3}}],
        {"cofaces": ["c0"]})
    report = {
        "glues": glue["glues"], "obstruction_radius": obst["radius"],
        "vacuous_flagged": vac["vacuous"], "variance_gate_raises": gate,
        "ki_radius": ki["radius"], "ki_co_extends": ki["coExtends"],
    }
    sys.stdout.write(json.dumps(report) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser(
        description="sensorium_consistency — the py H0 consistency-radius twin")
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
