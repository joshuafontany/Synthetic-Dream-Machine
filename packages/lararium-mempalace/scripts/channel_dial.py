#!/usr/bin/env python3
"""channel_dial — the RED/BLACK channel dial (lambda) over a wrapped bed's planes.

THE QUESTION THE DIAL ANSWERS. The memetic-wikitext wrapping carries two channels: the
RED channel (the `<<~ … >>` sigil layer — the classifier register that steers) and the
BLACK channel (the prose stream that speaks). The dual-run ablation showed the red
channel PICKS the parser and thereby replaces the structure plane wholesale (3 classes
vs 51) and manufactures form recurrence (3 sigil templates vs 1). The house designed
that fractal-repeating envelope deliberately — so the sensorium wants a DIAL to attend
past the envelope, never a cure that strips it. `lambda` in [0,1] weights the red
channel's contribution to the STRUCTURE and FORM planes:

    lambda = 1   — today's envelope-dominant reading (the wrapped bed as it stands);
    lambda = 0   — the black-channel-only reading (approximates extraction WITHOUT
                   extracting — the wrapping stays on disk, the lens attends past it);
    interior     — a convex mixture of the two channel readings.

THE MECHANISM (dual-derivation + metric mixture — the mechanically honest one):
  · the RED view reads the bed's OWN DURABLE PLANES (the stored parse trees keyed by
    provenance, the stored induced-template memberships) — so lambda=1 reproduces the
    projector's standing assignment BY CONSTRUCTION, never by re-derivation luck;
  · the BLACK view derives fresh per record: strip every sharktooth token (the same
    token grammar the sigil parser reads — the channels complement exactly), demote the
    kind (a carrier the sniff promoted to memetic-wikitext reads as its base grammar
    once the sigils fall silent — markdown here), parse, and re-mine the black forest
    with the plane-fanout defaults;
  · the dial mixes each plane's NATIVE PSEUDOMETRIC convexly —
        d_lambda(a, b) = lambda * d_red(a, b) + (1 - lambda) * d_black(a, b)
    (structure: DECKARD angular-cosine over characteristic vectors; form: Jaccard over
    membership sets; a convex mixture of pseudometrics stays a pseudometric) — then the
    plane's own salience law runs unchanged: hub-centrality over the mixed similarity,
    fractional rank into [0,1]. The mixture rides the metric; the rank step keeps the
    dial honestly nonlinear where centrality orders cross.

WHAT DOES NOT BLEND (surfaced, not fudged): a parse tree admits no interior point, so
STRUCTURE CLASSES at interior lambda count the JOIN partition — distinct (red-hash,
black-hash) pairs — and FORM TEMPLATES report both channels' counts side by side. The
CONTENT plane never takes the dial (the charge scopes it to structure + form); its
salience rides the stored embeddings, lambda-invariant.

THE SPECTRUM IS THE OBSERVABLE, THE DIAL SETTING IS NOT. The mixture rides inside a mean,
so each record's mixed centrality runs EXACTLY AFFINE in lambda and its rank changes ONLY
where two lines cross. `rank_agreement.crossing_spectrum` enumerates those lam* in closed
form; the sweep's ladder falls out of them (one rung per constant-order interval, plus the
endpoints) — CORPUS-DERIVED, hand-set by nobody. A ladder of hand-picked rungs sees only
the intervals it happens to land in and reports the boundaries it happens to straddle.

THE ARMS CARRY UNEQUAL GRANULARITY. A 3-class wrapped structure arm read against a
51-class one ties most of its pairs in BOTH arms, and a midrank correlation scores a
double tie as agreement. Every rank read here routes through `rank_agreement.agreement`,
which reports Kendall tau-c, both Somers' D directions, Fagin's K^(p) partial-ranking
distance, and the PAIR CENSUS — the double-tie count rides beside every scalar.

DETERMINISM + CLOCK PURITY: no RNG rides any dial path; the black forest mines in the
projector's own stable record order (source_file, cid); no wall-clock anywhere; the
comparator ward holds (~/.mempalace refused).

Usage (the mempalace venv):
  ~/.venv/bin/python3 channel_dial.py sweep --root ~/.lares/testbeds/kumulipo-wrapped \
      [--extracted-root ~/.lares/testbeds/kumulipo-extracted] \
      [--lambdas 0,0.25,0.5,0.75,1.0] [--out <dir>]
  ~/.venv/bin/python3 channel_dial.py compare --root-a <bed> --root-b <bed>

Meme: lar:///ha.ka.ba/lararium/sensorium/channel-dial
"""
from __future__ import annotations

import argparse
import json
import os
import sys

from corpus_testbed import _refuse_comparator
from form_induction import _preorder_types, _seq_support, induce_forest
from plane_base import (
    BASE_RECORD,
    combine_sum_histogram,
    pushforward_origin,
    records_to_patterns,
    sheaf_section,
    to_labeled,
)
from plane_fanout import _DEFAULT_MAX_CANDIDATES, _DEFAULT_MAX_FORMS, _DEFAULT_MIN_SUPPORT
from rank_agreement import affine_centrality, agreement, crossing_spectrum, spectrum_rungs
from rank_agreement import spearman as _spearman_lists
from run_projector import (
    _centrality,
    _rank_salience,
    _read_planes,
    build_assignment,
    structure_fibers,
)
from sensorium_consistency import (
    _angular_cosine,
    characteristic_vector,
    consistency_radius,
    cosine_distance,
    jaccard_distance,
)
import re as _re

from structure_router import parse_to_tree, structural_hash

# A sharktooth token span: `<<~ … >>` or a closer `<<~/word >>` — the dial's own
# span-finder (it strips sigil SPANS from the black channel; tree shape never enters).
_TOKEN_RE = _re.compile(r"<<~/?[^\n]*?>>")

#: The rungs the dial ALWAYS walks: the two channel-pure endpoints. Every interior rung
#: comes from the bed's own crossing spectrum (`lambda_ladder`) — a hand-picked interior
#: ladder observes only the intervals it lands in and straddles the rest, which is how a
#: five-point ladder over (0, .25, .5, .75, 1) missed every crossing below lam ~ 0.30.
ENDPOINT_LAMBDAS = (0.0, 1.0)

#: The kind demotion law: a carrier the content sniff PROMOTED to memetic-wikitext
#: (structure_router.detect_kind lifts markdown/prose/wikitext on sigil density) reads
#: as its base grammar once the red channel falls silent. The house's witness memes ride
#: markdown carriers, so the demotion lands markdown; a future non-markdown carrier
#: passes its own base kind here.
BLACK_BASE_KIND = "markdown"


# ── the channel split (the mechanical seam) ───────────────────────────────────────────────


def strip_red(text: str) -> str:
    """The BLACK channel of a memetic-wikitext text: every sharktooth token removed, all
    other bytes kept in place. The seam mirrors the sigil parser exactly — parse_sigils
    reads tokens as nodes and inter-token spans as text leaves, so red (the tokens) and
    black (this remainder) complement with nothing dropped and nothing doubled."""
    return _TOKEN_RE.sub("", text)


def black_parse(text: str, kind: str, *, base_kind: str = BLACK_BASE_KIND) -> "dict | None":
    """A record's BLACK-view parse tree: a memetic-wikitext record sheds its red channel
    and parses under the demoted base grammar; any other kind carries no red channel, so
    the black view EQUALS the full view (the dial idles at 1 for it by construction)."""
    if kind == "memetic-wikitext":
        return parse_to_tree(base_kind, strip_red(text))
    return parse_to_tree(kind, text)


# ── the black plane derivation (fresh, plane-fanout defaults) ─────────────────────────────


def derive_black_planes(planes: dict, *, base_kind: str = BLACK_BASE_KIND,
                        min_support: int = _DEFAULT_MIN_SUPPORT,
                        max_forms: int = _DEFAULT_MAX_FORMS,
                        max_candidates: int = _DEFAULT_MAX_CANDIDATES) -> dict:
    """Derive the BLACK channel's structure + form views over a bed's records: per record
    a black parse tree + structural hash; over the black forest (mined in the projector's
    stable record order) the black constructicon + per-record membership sets. Returns
    {trees, hash_of, memberships, forms, induction} — the black twin of the shape
    run_projector._read_planes gives the red channel."""
    records = planes["records"]
    trees: dict = {}
    hash_of: dict = {}
    for r in records:
        meta = r.get("metadata") or {}
        kind = meta.get("lar_kind") or ""
        tree = black_parse(r.get("document") or "", kind, base_kind=base_kind)
        if tree is None:
            continue
        cid = r["cid"]
        trees[cid] = tree
        hash_of[cid] = structural_hash(tree)

    cids = [r["cid"] for r in records if r["cid"] in trees]
    forest = [trees[c] for c in cids]
    memberships: dict = {}
    n_forms = 0
    induction = None
    if len(forest) >= min_support:
        res = induce_forest(forest, min_support=min_support, max_forms=max_forms,
                            max_candidates=max_candidates)
        forms = res["forms"]
        induction = res["summary"]
        n_forms = len(forms)
        for cid in cids:
            stream: list = []
            _preorder_types(trees[cid], stream)
            memberships[cid] = {i for i, f in enumerate(forms)
                                if _seq_support([stream], tuple(f["seq"])) > 0}
    return {"trees": trees, "hash_of": hash_of, "memberships": memberships,
            "forms": n_forms, "induction": induction}


# ── the dial: metric mixture → the plane's own salience law ───────────────────────────────


def _mixed_rank(keys: list, d_red, d_black, lam: float) -> dict:
    """The dialled salience for one plane: hub-centrality over the CONVEX-MIXED similarity
    1 - (lam*d_red + (1-lam)*d_black), then the fractional rank — the same two steps the
    projector's build_assignment runs on a single-channel metric."""
    lam = float(lam)
    cent = _centrality(keys, lambda a, b: 1.0 - (lam * d_red(a, b) + (1.0 - lam) * d_black(a, b)))
    return _rank_salience(cent)


def channel_views(planes: dict, black: dict) -> dict:
    """The two channels' native pseudometrics, per dialled plane, over the RECORD base and
    over the keys BOTH channels hold (the mixture needs both hands). One derivation feeds
    both the dialled assignment and the crossing spectrum, so the lines the spectrum solves
    and the ranks the sweep reads come from the same metric — never two drifting copies.

    THE BASE LAW. The red structure channel keys on PATTERNS; it reaches the record base
    only through `structure_fibers` (the `lar_provenance` pushforward, sum-histogram
    colimit). The black structure channel derives one tree per record, so it stands over
    the record base natively. Both arms therefore sit over BASE_RECORD before the mixture
    touches them, and the mixture never crosses a universe."""
    cids = [r["cid"] for r in planes["records"]]

    cv_red = structure_fibers(planes["registry"], cids)
    cv_black = {}
    for c in cids:
        t = black["trees"].get(c)
        if t is not None:
            lt = to_labeled(t)
            if lt is not None:
                cv_black[c] = characteristic_vector(lt)
    skeys = [c for c in cids if c in cv_red and c in cv_black]

    m_red = planes["memberships"]
    m_black = black["memberships"]
    fkeys = [c for c in cids if c in m_red and c in m_black]

    return {
        "structure": {
            "keys": skeys,
            "red": lambda a, b: _angular_cosine(cv_red[a], cv_red[b]),
            "black": lambda a, b: _angular_cosine(cv_black[a], cv_black[b]),
        },
        "form": {
            "keys": fkeys,
            "red": lambda a, b: jaccard_distance(m_red[a], m_red[b]),
            "black": lambda a, b: jaccard_distance(m_black[a], m_black[b]),
        },
    }


def dial_assignment(planes: dict, black: dict, lam: float,
                    views: "dict | None" = None) -> dict:
    """The lambda-dialled li-assignment over a wrapped bed: content salience off the
    stored embeddings (lambda-invariant), structure + form salience off the mixed
    channel metrics. A record enters a dialled plane only where BOTH channel views hold
    it; the black view covers every red record on the Kumulipo beds, so the restriction
    domains match the projector's."""
    records = planes["records"]
    cids = [r["cid"] for r in records]
    v = views or channel_views(planes, black)

    # content — stored warm-embed vectors, cosine hub-centrality (no dial: the charge
    # scopes lambda to the structure + form planes).
    vectors = {r["cid"]: r.get("embedding") for r in records if r.get("embedding")}
    ckeys = [c for c in cids if c in vectors]
    content_sal = _rank_salience(_centrality(
        ckeys, lambda a, b: 1.0 - cosine_distance(vectors[a], vectors[b])))

    structure_sal = _mixed_rank(v["structure"]["keys"], v["structure"]["red"],
                                v["structure"]["black"], lam)
    form_sal = _mixed_rank(v["form"]["keys"], v["form"]["red"], v["form"]["black"], lam)

    restrictions = [
        sheaf_section("content", content_sal, base=BASE_RECORD),
        # the red half of this arm crossed from the pattern base by the extension map; the
        # origin travels with it, so the H0 gate sees how it earned its record-base reading.
        sheaf_section("structure", structure_sal, base=BASE_RECORD,
                      origin=pushforward_origin(combine_sum_histogram)),
        sheaf_section("form", form_sal, base=BASE_RECORD),
    ]
    return {"restrictions": restrictions, "stalk": {"units": cids}}


# ── the crossing spectrum (the dial's whole observable content) ───────────────────────────


def dial_spectrum(planes: dict, black: dict, views: "dict | None" = None) -> dict:
    """Per dialled plane, the exact affine centrality lines and every lam* in (0,1) where
    two of them cross — the rank order stands constant between consecutive lam*, so this
    exhausts what the dial can show. A DEGENERATE CONFLUENCE (many crossings piled on one
    lam*, as the wrapped bed piles them on lam = 1) reads here as a coincident cut, not as
    a cliff: the sweep's ladder merges it to one boundary."""
    v = views or channel_views(planes, black)
    out: dict = {}
    for plane in ("structure", "form"):
        keys = v[plane]["keys"]
        coeffs = affine_centrality(keys, v[plane]["red"], v[plane]["black"])
        sp = crossing_spectrum(coeffs)
        out[plane] = {
            "units": len(keys),
            "interior_crossings": len(sp),
            "lambda_star": [round(r["lambda"], 6) for r in sp],
            "coefficients": {k: {"A": c[0], "B": c[1]} for k, c in coeffs.items()},
        }
    return out


def lambda_ladder(spectrum: dict) -> tuple:
    """The rungs the CORPUS dictates: the endpoints plus one representative inside every
    constant-order interval the union of both planes' crossings carves out of [0,1]. No
    rung comes from a hand. An empty spectrum (no interior crossing anywhere) collapses to
    the endpoints, which then carry the whole truth."""
    merged = sorted(
        ({"lambda": lam}
         for plane in spectrum
         for lam in spectrum[plane]["lambda_star"]),
        key=lambda r: r["lambda"])
    return tuple(spectrum_rungs(merged))


def structure_classes(planes: dict, black: dict, lam: float) -> int:
    """The structure-class count the dial can honestly claim at a rung: the RED class of a
    record reads as the SET of patterns lying over it (the registry's fiber, not one
    last-write-wins hash); the BLACK class reads its own structural hash. lambda=1 counts
    the red partition, lambda=0 the black one, and any interior lambda the JOIN — distinct
    (red-set, black-hash) pairs — because a parse tree admits no interior point (surfaced
    in the module head, never fudged)."""
    cids = [r["cid"] for r in planes["records"]]
    red = records_to_patterns(planes["registry"], cids)
    keys = [c for c in cids if c in black["hash_of"] and red.get(c)]
    if lam >= 1.0:
        return len({red[c] for c in keys})
    if lam <= 0.0:
        return len({black["hash_of"][c] for c in keys})
    return len({(red[c], black["hash_of"][c]) for c in keys})


# ── the rank reads (tie-aware; spearman scoped) ───────────────────────────────────────────


def spearman(a: dict, b: dict) -> "float | None":
    """Spearman rho over the SHARED keys of two salience dicts.

    SAFE HERE, AND ONLY HERE: this verb serves the SAME-PLANE, SAME-GRANULARITY read — one
    plane's salience on bed A against the same plane's salience on bed B (real vs placebo,
    wrapped vs wrapped), where both arms come out of the same derivation over the same
    record count and carry the same distinct-value budget, so double ties stay incidental.
    Point it across granularities (a 3-class arm against a 51-class one) and it inflates
    toward agreement, because a double tie reads as concordance while carrying zero
    ordering information. Every cross-granularity read routes through
    `rank_agreement.agreement`, which reports tau-c / Somers' D / Fagin beside the census.
    None where a side carries zero rank variance."""
    keys = sorted(set(a) & set(b))
    if len(keys) < 3:
        return None
    return _spearman_lists([a[k] for k in keys], [b[k] for k in keys])


def _salience_by_plane(assignment: dict) -> dict:
    return {r["plane"]: r["value"] for r in assignment["restrictions"]}


def _pair_sups(assignment: dict) -> dict:
    """The pairwise sup-disagreements off the standing consistency instrument — the same
    numbers the projector's H0 read reports. A sup over FRACTIONAL RANKS inherits the tie
    disease whole: where one arm holds 3 classes and the other 51, most of the sup's pairs
    sit in tie blocks, so the sweep reports `_pair_agreement` beside every sup and no
    reader takes the sup alone."""
    h0 = consistency_radius(assignment["restrictions"], assignment["stalk"])
    return {f"{p['a']}-{p['b']}": round(p["distance"], 4) for p in h0["pairs"]}


def _pair_agreement(sal: dict) -> dict:
    """The tie-aware cross-plane read at one rung: for each plane pair, tau-c, both Somers'
    D directions, Fagin's K^(p) and the PAIR CENSUS over the shared cids. The census is the
    number the sup-norm never carried — a double-tie mass near 1 says the planes' arms
    agree only because neither arm orders the pairs at all."""
    planes = ("content", "structure", "form")
    out: dict = {}
    for i, p in enumerate(planes):
        for q in planes[i + 1:]:
            out[f"{p}-{q}"] = agreement(sal.get(p, {}), sal.get(q, {}))
    return out


# ── the sweep (the new instrument) ────────────────────────────────────────────────────────


def sweep_lambdas(root: str, *, lambdas=None, extracted_root: "str | None" = None,
                  base_kind: str = BLACK_BASE_KIND) -> dict:
    """Walk the dial over a wrapped bed: per rung the plane readings, the cross-plane sups
    and the TIE-AWARE agreement bundle beside them; where an extracted twin rides in, the
    lowest rung compares against the extracted bed's own assignment.

    `lambdas = None` (the default) takes the ladder from the bed's OWN crossing spectrum —
    every constant-order interval gets one rung and the endpoints close it. An operator MAY
    pass rungs explicitly; the output names which source ran, because a hand-set ladder
    reads whatever it lands on and stays silent about the crossings it stepped over."""
    _refuse_comparator(root)
    planes = _read_planes(root)
    black = derive_black_planes(planes, base_kind=base_kind)
    red_forms = _red_form_dimension(root)

    views = channel_views(planes, black)
    spectrum = dial_spectrum(planes, black, views)
    rungs = tuple(lambdas) if lambdas else lambda_ladder(spectrum)

    rows = []
    sal_at: dict = {}
    for lam in rungs:
        assignment = dial_assignment(planes, black, lam, views)
        sal = _salience_by_plane(assignment)
        sal_at[lam] = sal
        rows.append({
            "lambda": lam,
            "structure_classes": structure_classes(planes, black, lam),
            "form_templates": {"red": red_forms, "black": black["forms"]},
            "sup": _pair_sups(assignment),
            "agreement": _pair_agreement(sal),
            "plane_units": {p: len(v) for p, v in sal.items()},
        })

    out = {
        "root": root,
        "black_base_kind": base_kind,
        "lambda_source": "corpus-crossing-spectrum" if not lambdas else "operator-supplied",
        "spectrum": {p: {k: v for k, v in spectrum[p].items() if k != "coefficients"}
                     for p in spectrum},
        "rungs": list(rungs),
        "rows": rows,
        "black_induction": black["induction"],
    }

    if extracted_root:
        ext_planes = _read_planes(extracted_root)
        ext_assignment = build_assignment(ext_planes)
        ext_sal = _salience_by_plane(ext_assignment)
        low = min(rungs)
        lam0 = sal_at[low]
        out["lambda0_vs_extracted"] = {
            "lambda": low,          # the rung compared — 0.0 unless the ladder omits it
            "extracted_root": extracted_root,
            # the dialled-black arm and the extracted arm carry DIFFERENT class budgets, so
            # the bundle rides here and the census travels with every scalar.
            "agreement": {p: agreement(lam0.get(p, {}), ext_sal.get(p, {}))
                          for p in ("content", "structure", "form")},
            "extracted_sup": _pair_sups(ext_assignment),
        }
    return out


def _red_form_dimension(root: str) -> "int | None":
    """The wrapped bed's induced-constructicon size, read off the durable form store's
    own pinned dimension (the count the membership vectors carry)."""
    from form_encoder import FormPalaceStore

    store = FormPalaceStore(os.path.join(root, "form"))
    got = store._col.get(limit=1, include=["metadatas"])  # noqa: SLF001 — the dial reads the raw plane
    metas = got.get("metadatas") or []
    if metas and metas[0]:
        dim = metas[0].get("dimension")
        return int(dim) if dim is not None else None
    return None


# ── the cross-bed comparison (compare two beds' own assignments) ──────────────────────────


def compare_beds(root_a: str, root_b: str) -> dict:
    """Per-plane comparison of two beds' OWN salience assignments over the shared cids —
    the read the four-way used (real vs placebo, wrapped vs extracted).

    Spearman rides here beside the bundle because a SAME-PLANE, SAME-DERIVATION pair often
    carries comparable granularity (wrapped structure against wrapped-placebo structure:
    3 classes each) — but a WRAPPED bed against an EXTRACTED one does not (3 against 51),
    so the bundle's `spearman_safe` flag decides per pair, and the census travels with the
    scalars either way."""
    _refuse_comparator(root_a)
    _refuse_comparator(root_b)
    sal_a = _salience_by_plane(build_assignment(_read_planes(root_a)))
    sal_b = _salience_by_plane(build_assignment(_read_planes(root_b)))
    planes = ("content", "structure", "form")
    bundles = {p: agreement(sal_a.get(p, {}), sal_b.get(p, {})) for p in planes}
    return {
        "root_a": root_a, "root_b": root_b,
        "agreement": bundles,
        "rho": {p: bundles[p].get("spearman") for p in planes},
        "rho_safe": {p: bundles[p].get("spearman_safe") for p in planes},
        "shared": {p: len(set(sal_a.get(p, {})) & set(sal_b.get(p, {}))) for p in planes},
    }


# ── the CLI face ──────────────────────────────────────────────────────────────────────────


def main() -> None:
    ap = argparse.ArgumentParser(
        description="channel_dial — the RED/BLACK channel dial over a wrapped bed's planes")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sweep", help="walk the corpus-derived ladder; emit per-rung readings")
    s.add_argument("--root", required=True, help="the wrapped bed root")
    s.add_argument("--extracted-root", default=None, dest="extracted_root",
                   help="the extracted twin — the lowest rung compares against its assignment")
    s.add_argument("--lambdas", default=None,
                   help="comma-separated rungs in [0,1]; omitted, the bed's own crossing "
                        "spectrum sets the ladder")
    s.add_argument("--out", default=None, help="rows land here (default <root>/channel-dial)")
    x = sub.add_parser("spectrum", help="the analytic lambda* crossing spectrum of a bed")
    x.add_argument("--root", required=True, help="the wrapped bed root")
    c = sub.add_parser("compare", help="per-plane tie-aware agreement between two beds")
    c.add_argument("--root-a", required=True, dest="root_a")
    c.add_argument("--root-b", required=True, dest="root_b")
    args = ap.parse_args()
    if args.cmd == "compare":
        out = compare_beds(os.path.expanduser(args.root_a), os.path.expanduser(args.root_b))
        sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
        return
    root = os.path.expanduser(args.root)
    if args.cmd == "spectrum":
        _refuse_comparator(root)
        planes = _read_planes(root)
        black = derive_black_planes(planes)
        spec = dial_spectrum(planes, black)
        out = {"root": root,
               "spectrum": {p: {k: v for k, v in spec[p].items() if k != "coefficients"}
                            for p in spec},
               "ladder": list(lambda_ladder(spec))}
        sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
        return
    lambdas = None
    if args.lambdas:
        lambdas = tuple(float(v) for v in args.lambdas.split(",") if v.strip() != "")
        for lam in lambdas:
            if not 0.0 <= lam <= 1.0:
                raise SystemExit(f"channel_dial: lambda {lam} falls outside [0,1]")
    out = sweep_lambdas(root, lambdas=lambdas,
                        extracted_root=os.path.expanduser(args.extracted_root)
                        if args.extracted_root else None)
    out_dir = args.out or os.path.join(root, "channel-dial")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "dial-rows.json"), "w") as f:
        json.dump(out, f, indent=2)
    sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
