#!/usr/bin/env python3
"""run_projector — the py RUN surface over a populated 3-plane test-bed (RUN-ARC.md #3).

THE PROJECTOR ARC: read the three POPULATED planes of a test-bed root (content ·
structure · form — the plane-fanout landed them over shared cids), stand a per-record
salience restriction per plane by that plane's OWN mechanism, then sweep the ARL0 dial
(alpha = 1/ARL0, the arl-dial law) and emit one row per rung carrying the four order
parameters the concept-witness bench proved on synthetic data:

    dim H1      — the cohomological obstruction of the agreement nerve (sensorium_fusion)
    deltaF      — F(fitted) - F(structural-null), predictive_coding's F as evidence-
                  codelength; comparative deltaF stays non-vacuous where absolute F does
                  not (the FEP-vacuity pre-emption)
    complexity  — excess entropy (Feldman-Crutchfield) of the alpha-symbolized structure-
                  class stream — pure Shannon-H, NEVER a thermodynamic S
    efe_gate    — the H1-first gate regime (sensorium_efe): 0 = select · 1 = surface

plus the surrogate-null significance protocol for H1 / deltaF / complexity — each trace
names the null that destroys ITS OWN structure (H1 -> salience JITTER, its obstruction
count shrugs off a permutation; deltaF -> iid-SHUFFLE banding the RAW fitted F, the
trace value rides already null-differenced; complexity -> symbol-SHUFFLE). The
family-wise maxT band stays a NAMED FOLLOW-UP (the bench's studentized Westfall-Young
shape ports when the bigger corpuses raise the multiplicity stakes).

THE INDEPENDENCE LAW (the whole point): each plane's salience derives from that plane's
own store and native pseudometric —
    content   — the stored warm-embed vectors, cosine hub-centrality;
    structure — the stored parse trees, DECKARD characteristic-vector centrality;
    form      — the stored induced-template memberships, Jaccard centrality;
NEVER structure/form surrogated from the content embeddings. Each centrality reads as a
fractional RANK in [0,1] — the common hub-weight reading all three lenses give the same
unit, so they can agree or disagree there (the engineered comparison stalk).

CLOCK PURITY: no wall-clock on any path here; every draw rides a seeded PRNG; the
sighting registers stay the stores' own. The comparator ward holds (~/.mempalace refused).

HONESTY, 12 records deep: this surface WITNESSES that the instruments run end-to-end
over real, genuinely-independent planes and emit sane rows. A LOAD-BEARING bifurcation
claim awaits the bigger corpuses — a 12-doc sweep cannot seat one.

Usage (the mempalace venv):
  ~/.venv/bin/python3 run_projector.py run --sensorium <lararium>/sensoriums/human-text-lares-memes \
      [--rungs 28] [--arl-hi 200] [--arl-lo 1.6] [--trials 60] [--alpha-sig 0.05] \
      [--seed 333073] [--out <dir>]

Meme: lar:///ha.ka.ba/lararium/sensorium/run-projector
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys

import content_io as cio
from capture_corpus import refuse_comparator as _refuse_comparator
from predictive_coding import free_energy
from sensorium_consistency import (
    _angular_cosine,
    characteristic_vector,
    consistency_radius,
    cosine_distance,
    jaccard_distance,
)
from plane_base import (
    BASE_RECORD,
    combine_sum_histogram,
    pushforward,
    pushforward_origin,
    read_pattern_registry,
    records_to_patterns,
    sheaf_section,
    to_labeled,
)
from plane_capacity import ceiling_index
from sensorium_efe import efe_gate
from sensorium_fusion import cohomology_obstruction

# The bench's fixed verb-set + quiescent C-vector — the gate's H1=0 branch scores these
# (bifurcation-bench.ts BENCH_VERBS/BENCH_C, carried by contract).
_VERBS = [
    {"verb": "hold", "scale": 1, "shift": 0, "precisionGain": 1},
    {"verb": "align", "scale": 0, "shift": 0, "precisionGain": 1},
    {"verb": "collapse", "scale": 1, "shift": 0, "precisionGain": 1e4},
    {"verb": "expand", "scale": 1, "shift": 0, "precisionGain": 1e-3},
]
_C = {"mu": {"content": 0.0, "structure": 0.0, "form": 0.0}}

# The H1 structural-null jitter amplitude — wide enough to dissolve coordinated rank
# gaps on the [0,1] salience scale (the bench's H1_JITTER_AMP, same reasoning).
_H1_JITTER_AMP = 0.5

_PLANE_ORDER = ("content", "structure", "form")


# ── the dial (arl-dial.ts law: alpha = 1/ARL0) ────────────────────────────────────────────


def geom_arl0_range(hi: float, lo: float, n: int) -> list:
    """A geometric ladder of ARL0 rungs, strict (tiny alpha) -> loose (large alpha), so
    alpha sweeps ASCENDING and a bifurcation reads as a rising curve (the bench shape)."""
    if n <= 1:
        return [hi]
    ratio = (lo / hi) ** (1.0 / (n - 1))
    return [hi * ratio ** i for i in range(n)]


def _alpha_to_confidence(alpha: float) -> float:
    """Map the rung's miscoverage alpha onto the top-down confidence vow the deltaF trace
    hands F as the precision gain (the bench's alphaToConfidence, by contract): strict
    alpha -> a sharp vow; the floor 10 keeps the gain >= 1 across the sweep."""
    return min(18.0, max(10.0, 18.0 - 10.0 * min(1.0, max(0.0, alpha))))


# ── reading the populated planes (each by its OWN store) ──────────────────────────────────


def _read_planes(root: str) -> dict:
    """Read the durable plane stores under `root`, EACH OVER ITS OWN BASE.

    · content — rows + warm-embed vectors, keyed by drawer cid (the RECORD base).
    · structure — the PATTERN REGISTRY, read as itself: a fiber per structural hash carrying its
      recurrence count, its sightings, and the record list `lar_provenance` lays it over. It does
      NOT get flattened to one-tree-per-record here; the pushforward does that later, explicitly,
      and a record exhibiting several patterns keeps all of them (plane_base).
    · form — induced-template membership sets, keyed by drawer cid (the RECORD base).

    Record order sorts on (source_file, cid): a stable, content-free corpus order every series
    reads through."""
    from form_encoder import FormPalaceStore
    from sensorium import sensorium_paths

    paths = sensorium_paths(root)
    store = cio.ContentStore(paths.content)
    records = []
    offset = 0
    while True:
        page = store.scan(offset, 256)
        records.extend(page.get("records") or [])
        if page.get("next") is None:
            break
        offset = page["next"]
    records.sort(key=lambda r: ((r.get("metadata") or {}).get("source_file", ""), r["cid"]))

    registry = read_pattern_registry(root)   # the cosheaf, whole

    form_store = FormPalaceStore(paths.form)
    fgot = form_store._col.get(include=["embeddings"])  # noqa: SLF001
    memberships: dict = {}
    fids = fgot.get("ids") or []
    fembs = fgot.get("embeddings")
    for i, cid in enumerate(fids):
        vec = fembs[i] if fembs is not None and i < len(fembs) else None
        if vec is None:
            continue
        memberships[cid] = {j for j, v in enumerate(vec) if float(v) > 0.0}

    return {"records": records, "registry": registry, "memberships": memberships}


def _rank_salience(values: dict) -> dict:
    """Fractional average-tie rank of each value into [0,1] — the plane's own centrality
    spread expressed as the common hub-weight reading (scale-free per plane, so cross-
    plane disagreement reads rank structure, never raw-scale artifacts)."""
    n = len(values)
    if n == 0:
        return {}
    if n == 1:
        return {k: 0.5 for k in values}
    ordered = sorted(values.items(), key=lambda kv: kv[1])
    ranks: dict = {}
    i = 0
    while i < n:
        j = i
        while j + 1 < n and ordered[j + 1][1] == ordered[i][1]:
            j += 1
        avg = (i + j) / 2.0            # 0-based average rank across the tie run
        for k in range(i, j + 1):
            ranks[ordered[k][0]] = avg / (n - 1)
        i = j + 1
    return ranks


def structure_fibers(registry, cids: list) -> dict:
    """THE STRUCTURE PLANE'S RECORD-BASE READING — and the ONLY way it is allowed to get one.

    Each PATTERN carries its own DECKARD characteristic vector (a histogram over q-level subtree
    patterns) — a fiber over the pattern base. `pushforward` carries those fibers along
    `lar_provenance` onto the records they lie over, and `combine_sum_histogram` takes the colimit:
    a record's characteristic vector = the SUM of the vectors of every pattern it exhibits.

    A record exhibiting ONE pattern gets that pattern's vector back unchanged, so a one-to-one
    corpus reads exactly as before. A record exhibiting several gets all of them — never whichever
    one the store's row order happened to hand over last."""
    def fiber(h):
        lt = to_labeled(registry.trees[h])
        return characteristic_vector(lt) if lt is not None else None

    return pushforward(registry, cids, fiber, combine_sum_histogram)


def _centrality(keys: list, sim) -> dict:
    """Mean pairwise similarity per key — the hub-centrality read a plane's native
    pseudometric gives its own units."""
    out = {}
    for i, a in enumerate(keys):
        sims = [sim(a, b) for j, b in enumerate(keys) if j != i]
        out[a] = sum(sims) / len(sims) if sims else 0.0
    return out


def build_assignment(planes: dict) -> dict:
    """Stand the li-assignment: one sheaf restriction per plane over the shared RECORD base, each
    value = the plane's OWN rank-centrality at that record.

    THE INDEPENDENCE LAW holds by construction — each block touches ONE store's data only. THE BASE
    LAW holds by declaration — content and form key on records natively; structure keys on PATTERNS
    and reaches the record base only through `structure_fibers`, whose section stamps its origin as
    the pushforward. Every restriction leaves here carrying the universe it stands over, so the H0
    radius and the H1 gate can refuse a crossing they cannot see into."""
    records = planes["records"]
    cids = [r["cid"] for r in records]
    registry = planes["registry"]

    # content — stored warm-embed vectors, cosine hub-centrality (the content mechanism). Native.
    vectors = {r["cid"]: r.get("embedding") for r in records if r.get("embedding")}
    ckeys = [c for c in cids if c in vectors]
    content_sal = _rank_salience(_centrality(
        ckeys, lambda a, b: 1.0 - cosine_distance(vectors[a], vectors[b])))

    # structure — the PATTERN registry, pushed forward onto records, then DECKARD centrality there.
    labeled = structure_fibers(registry, cids)
    skeys = [c for c in cids if c in labeled]
    structure_sal = _rank_salience(_centrality(
        skeys, lambda a, b: 1.0 - _angular_cosine(labeled[a], labeled[b])))

    # form — stored induced-template membership sets, Jaccard centrality. Native.
    members = planes["memberships"]
    fkeys = [c for c in cids if c in members]
    form_sal = _rank_salience(_centrality(
        fkeys, lambda a, b: 1.0 - jaccard_distance(members[a], members[b])))

    restrictions = [
        sheaf_section("content", content_sal, base=BASE_RECORD),
        sheaf_section("structure", structure_sal, base=BASE_RECORD,
                      origin=pushforward_origin(combine_sum_histogram)),
        sheaf_section("form", form_sal, base=BASE_RECORD),
    ]
    return {"restrictions": restrictions, "stalk": {"units": cids},
            "coverage": registry.coverage(cids)}


def _plane_reads(assignment: dict, cids: list) -> dict:
    """Per-plane salience SERIES in corpus order — the frames the deltaF/EFE forward
    models fit (a plane contributes the units it observes, in order)."""
    reads = {}
    for r in assignment["restrictions"]:
        series = [r["value"][c] for c in cids if c in r["value"]]
        reads[r["plane"]] = series
    return reads


def _structure_symbols(planes: dict, cids: list) -> tuple:
    """The symbol stream the complexity trace reads: each record's STRUCTURE CLASS on the RECORD
    base — the SET of patterns lying over it, interned to a small alphabet in corpus order.

    The class is a set because the pushforward is a set (plane_base): two records share a structure
    symbol when they exhibit the SAME patterns, not when a store iteration order happened to hand
    them the same one."""
    per_record = records_to_patterns(planes["registry"], cids)
    classes: dict = {}
    symbols = []
    for cid in cids:
        fs = per_record.get(cid)
        if not fs:
            continue
        key = tuple(sorted(fs))
        if key not in classes:
            classes[key] = len(classes)
        symbols.append(classes[key])
    return symbols, max(1, len(classes))


# ── the order parameters (the bench contract: (corpus, alpha) -> scalar) ──────────────────


def _block_entropy_bits(symbols: list, L: int) -> float:
    """Shannon block entropy H(L) in bits — plug-in over the sliding length-L windows.
    Pure Shannon-H over symbol counts, never a thermodynamic S."""
    m = len(symbols) - L + 1
    if L <= 0 or m <= 0:
        return 0.0
    counts: dict = {}
    for i in range(m):
        key = tuple(symbols[i:i + L])
        counts[key] = counts.get(key, 0) + 1
    H = 0.0
    for c in counts.values():
        p = c / m
        H -= p * math.log2(p)
    return H


def excess_entropy_bits(symbols: list, l_max: int) -> float:
    """Excess entropy E = sum_L (h(L) - h_mu) (Feldman-Crutchfield 0806.4789) — the memory
    the stream carries, decaying to 0 as noise dissolves the correlation."""
    H = [0.0]
    for L in range(1, l_max + 1):
        H.append(_block_entropy_bits(symbols, L))
    h = [H[L] - H[L - 1] for L in range(1, l_max + 1)]
    hmu = h[-1] if h else 0.0
    return sum(x - hmu for x in h)


def _noisy_readout(symbols: list, alphabet: int, alpha: float, seed: int) -> list:
    """Symbolize at control alpha: resample each symbol from the flat alphabet with
    probability min(0.95, 1.4*alpha) — noise rising with alpha (the bench's readout,
    seeded per rung so the sweep regenerates identically)."""
    eps = min(0.95, 1.4 * alpha)
    rng = random.Random(f"readout:{seed}:{round(alpha * 1e6)}")
    return [rng.randrange(alphabet) if rng.random() < eps else s for s in symbols]


def _shuffled_planes(reads: dict, seed: int) -> dict:
    """The deltaF structural null: destroy each plane's TEMPORAL order by a seeded
    permutation (one shared draw stream), leaving the value multisets intact."""
    rng = random.Random(f"dF-null:{seed}")
    out = {}
    for name in _PLANE_ORDER:
        s = list(reads.get(name) or [])
        rng.shuffle(s)
        out[name] = s
    return out


def _fitted_f(reads: dict, alpha: float) -> float:
    """The RAW fitted free energy F (predictive_coding, model ar1) at the rung's
    confidence vow — deltaF's BAND statistic (the trace value rides already
    null-differenced; a second differencing would double-count, the bench discipline)."""
    conf = _alpha_to_confidence(alpha)
    confidences = {name: conf for name in reads}
    return float(free_energy({k: list(v) for k, v in reads.items()},
                             model="ar1", confidences=confidences)["F"])


def _delta_f(reads: dict, alpha: float, seed: int) -> float:
    """deltaF = F(fitted) - F(structural-null) — the model-comparison free energy; > 0
    where the fitted model EARNS its evidence on real temporal structure."""
    return _fitted_f(reads, alpha) - _fitted_f(_shuffled_planes(reads, seed), alpha)


# ── the surrogate-null significance (each trace names ITS OWN null) ───────────────────────


def _band(observed: float, draws: list, alpha_sig: float) -> dict:
    """The (1-alpha_sig) null quantile + right-tail p — the null-harness surrogateNull
    convention, carried by contract (threshold index, the +1 conservative p)."""
    ns = sorted(draws)
    idx = min(len(ns) - 1, max(0, math.ceil((1.0 - alpha_sig) * len(ns)) - 1))
    threshold = ns[idx]
    ge = sum(1 for d in draws if d >= observed)
    p = (ge + 1) / (len(draws) + 1)
    return {"band": threshold, "p": p, "sig": 1 if observed > threshold else 0}


def _jittered_assignment(assignment: dict, rng: random.Random, amp: float) -> dict:
    """The H1 structural null: JITTER every salience by uniform +/-amp — a permutation
    preserves the value multiset and near-preserves the obstruction count, so jitter
    (dissolving the coordinated agreement gaps) names the null that destroys H1's own
    structure."""
    restrictions = []
    for r in assignment["restrictions"]:
        value = {u: v + (rng.random() * 2.0 - 1.0) * amp for u, v in r["value"].items()}
        # base + origin ride through the null unchanged: a surrogate that dropped the base would
        # sail past the very gate the real assignment must clear, and the null would test a
        # DIFFERENT instrument than the observation does.
        restrictions.append({**r, "value": value})
    return {"restrictions": restrictions, "stalk": assignment["stalk"]}


# ── the sweep ─────────────────────────────────────────────────────────────────────────────


def sweep(planes: dict, *, rungs: int, arl_hi: float, arl_lo: float, trials: int,
          alpha_sig: float, seed: int) -> dict:
    """Sweep the ARL0 dial over the populated planes: one row per rung carrying the four
    order parameters + the per-trace surrogate-null significance columns."""
    assignment = build_assignment(planes)
    cids = [r["cid"] for r in planes["records"]]
    reads = _plane_reads(assignment, cids)
    symbols, alphabet = _structure_symbols(planes, cids)
    l_max = 4

    rows = []
    for r_i, arl0 in enumerate(geom_arl0_range(arl_hi, arl_lo, rungs)):
        arl0 = max(1.0, arl0)
        alpha = 1.0 / arl0            # the arl-dial law: ONE scalar refracts every threshold

        obs = cohomology_obstruction(assignment, agreement_tolerance=alpha)
        h1 = obs["dimH1"]
        d_f = _delta_f(reads, alpha, seed)
        readout = _noisy_readout(symbols, alphabet, alpha, seed)
        complexity = excess_entropy_bits(readout, l_max)
        gate = efe_gate(assignment, reads, _VERBS, _C, agreement_tolerance=alpha)
        regime = 1 if gate["verdict"] == "surface-disagreement" else 0

        row = {"arl0": arl0, "alpha": alpha, "h1_dimH1": h1, "r_sem": obs["cost"],
               "deltaF": d_f, "complexity": complexity, "efe_gate": regime}

        # H1 — jitter null (its own structure-destroyer).
        rng = random.Random(f"h1:{seed}:{r_i}")
        draws = [cohomology_obstruction(
            _jittered_assignment(assignment, rng, _H1_JITTER_AMP),
            agreement_tolerance=alpha)["dimH1"] for _ in range(trials)]
        for k, v in _band(float(h1), draws, alpha_sig).items():
            row[f"h1_dimH1_{k}"] = v

        # deltaF — iid-shuffle null banding the RAW fitted F.
        rng = random.Random(f"dF:{seed}:{r_i}")
        f_obs = _fitted_f(reads, alpha)
        draws = []
        for _ in range(trials):
            shuffled = {n: sorted(reads[n], key=lambda _: rng.random()) for n in reads}
            draws.append(_fitted_f(shuffled, alpha))
        for k, v in _band(f_obs, draws, alpha_sig).items():
            row[f"deltaF_{k}"] = v

        # complexity — symbol-shuffle null on the SAME rung readout.
        rng = random.Random(f"cE:{seed}:{r_i}")
        draws = []
        for _ in range(trials):
            s = list(readout)
            rng.shuffle(s)
            draws.append(excess_entropy_bits(s, l_max))
        for k, v in _band(complexity, draws, alpha_sig).items():
            row[f"complexity_{k}"] = v

        rows.append(row)

    return {"rows": rows, "assignment": assignment, "symbols": symbols,
            "alphabet": alphabet, "reads": reads}


def to_csv(rows: list) -> str:
    """Rows as CSV — arl0/alpha lead, the trace columns follow sorted (the bench idiom)."""
    if not rows:
        return ""
    lead = ["arl0", "alpha"]
    rest = sorted(k for k in rows[0] if k not in lead)
    cols = lead + rest
    body = [",".join(str(r.get(c, "")) for c in cols) for r in rows]
    return "\n".join([",".join(cols)] + body)


# ── the CLI face ──────────────────────────────────────────────────────────────────────────


def run(root: str, *, rungs: int, arl_hi: float, arl_lo: float, trials: int,
        alpha_sig: float, seed: int, out_dir: "str | None") -> dict:
    """The whole RUN pass: ward the comparator, read the planes, sweep, write the data
    out (JSON rows + CSV), and return the witness summary."""
    _refuse_comparator(root)
    planes = _read_planes(root)
    n = len(planes["records"])
    result = sweep(planes, rungs=rungs, arl_hi=arl_hi, arl_lo=arl_lo, trials=trials,
                   alpha_sig=alpha_sig, seed=seed)
    rows = result["rows"]

    out = out_dir or os.path.join(root, "projector")
    os.makedirs(out, exist_ok=True)
    rows_path = os.path.join(out, "sweep-rows.json")
    csv_path = os.path.join(out, "sweep-rows.csv")
    with open(rows_path, "w") as f:
        json.dump({"root": root, "seed": seed, "rows": rows}, f, indent=2)
    with open(csv_path, "w") as f:
        f.write(to_csv(rows) + "\n")

    per_plane = {r["plane"]: len(r["value"]) for r in result["assignment"]["restrictions"]}

    # NO PLANE GETS REPORTED WITHOUT ITS CEILING BESIDE IT. Every salience series below rides a
    # channel whose capacity is an exact, estimator-free upper bound (plane_capacity); a plane whose
    # RECORD-base ceiling sits far under log2(N) cannot carry the record signal, and every downstream
    # rank, disagreement and dial rung reading it is walking over a channel that already threw the
    # signal away. The projector prints the bound so that never goes unnoticed again.
    ceilings = ceiling_index(root)
    plane_report = {}
    for r in result["assignment"]["restrictions"]:
        p = r["plane"]
        c = ceilings.get(p, {})
        plane_report[p] = {
            "units": len(r["value"]),
            "base": r.get("base"),
            "origin": r.get("origin"),
            "ceiling_bits": c.get("record_ceiling_bits"),
            "record_bits": None if c.get("error") else round(math.log2(n), 4) if n > 1 else 0.0,
            "share": c.get("share"),
            "verdict": c.get("verdict") or c.get("error"),
        }

    h1_series = [r["h1_dimH1"] for r in rows]
    gate_series = [r["efe_gate"] for r in rows]
    first_h1 = next((i for i, v in enumerate(h1_series) if v > 0), -1)
    first_flip = next((i for i, v in enumerate(gate_series) if v == 1), -1)

    # The H0 read over the real planes — WHERE on the alpha axis the three lenses sit:
    # each pair's sup-disagreement names the tolerance an agreement edge would need.
    h0 = consistency_radius(result["assignment"]["restrictions"],
                            result["assignment"]["stalk"])
    consistency = {
        "radius": h0["radius"], "glues": h0["glues"], "vacuous": h0["vacuous"],
        "pairs": [{"a": p["a"], "b": p["b"], "distance": p["distance"]}
                  for p in h0["pairs"]],
    }

    symbols = result["symbols"]
    blocks2 = list(zip(symbols, symbols[1:]))
    saturated = len(symbols) > 2 and len(set(blocks2)) == len(blocks2)
    return {
        "root": root,
        "records": n,
        "plane_units": per_plane,
        "planes": plane_report,                  # every plane, its base, its origin, ITS CEILING
        "pushforward_coverage": result["assignment"]["coverage"],
        "alphabet": result["alphabet"],
        "consistency": consistency,
        "rungs": len(rows),
        "data_out": {"rows": rows_path, "csv": csv_path},
        "h1_trace": h1_series,
        "efe_gate_trace": gate_series,
        "gate_flip_coincides_with_h1": first_h1 == first_flip,
        "sample_rows": [rows[0], rows[len(rows) // 2], rows[-1]],
        "honesty": {
            "corpus_grain": (f"{n} records — the instruments RUN and emit sane rows; a "
                             "load-bearing bifurcation claim awaits the bigger corpuses"),
            "maxT": "family-wise maxT = a named follow-up (the bench's studentized "
                    "Westfall-Young shape ports when multiplicity stakes rise)",
            "form_induction_debt": "unhit here (the projector reads the durable form "
                                   "plane, never re-mines); named at form_induction."
                                   "cmd_induce where the unbounded batch walk bites",
            **({"complexity": (f"the {len(symbols)}-symbol structure-class stream "
                               f"(alphabet {result['alphabet']}) carries NO repeated "
                               "length-2 block — the plug-in excess entropy SATURATES "
                               "at its ceiling and reads a constant across the noise "
                               "dial (its shuffle null coincides); the complexity "
                               "trace needs recurrent blocks (the bigger corpuses)")}
               if saturated else {}),
            **({"h1": ("dim H1 reads 0 at every rung — honest, not vacuous: the "
                       "pairwise sup-disagreements ("
                       + " · ".join(f"{p['a']}-{p['b']}={p['distance']:.3f}"
                                    for p in consistency["pairs"])
                       + ") leave at most a partial edge set inside the swept alpha "
                       "range, and no hollow triangle mints without all three edges")}
               if first_h1 < 0 else {}),
        },
    }


def main() -> None:
    ap = argparse.ArgumentParser(
        description="run_projector — the py RUN surface over a populated 3-plane test-bed")
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="sweep the ARL0 dial over the planes; emit rows + witness")
    r.add_argument("--sensorium", required=True,
                   help="the populated test-bed sensorium (never ~/.mempalace — the ward refuses)")
    r.add_argument("--rungs", type=int, default=28)
    r.add_argument("--arl-hi", type=float, default=200.0, dest="arl_hi")
    r.add_argument("--arl-lo", type=float, default=1.6, dest="arl_lo")
    r.add_argument("--trials", type=int, default=60)
    r.add_argument("--alpha-sig", type=float, default=0.05, dest="alpha_sig")
    r.add_argument("--seed", type=int, default=0x51611)
    r.add_argument("--out", default=None)
    args = ap.parse_args()
    w = run(os.path.expanduser(args.sensorium), rungs=args.rungs, arl_hi=args.arl_hi,
            arl_lo=args.arl_lo, trials=args.trials, alpha_sig=args.alpha_sig,
            seed=args.seed, out_dir=args.out)
    sys.stdout.write(json.dumps(w, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
