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
import math
import os
import sys

from corpus_testbed import _refuse_comparator
from form_induction import _preorder_types, _seq_support, induce_forest
from plane_fanout import _DEFAULT_MAX_CANDIDATES, _DEFAULT_MAX_FORMS, _DEFAULT_MIN_SUPPORT
from run_projector import _centrality, _rank_salience, _read_planes, _to_labeled, build_assignment
from sensorium_consistency import (
    _angular_cosine,
    characteristic_vector,
    consistency_radius,
    cosine_distance,
    jaccard_distance,
)
from structure_router import _TOKEN_RE, parse_to_tree, structural_hash

#: The dial's default rungs — the five-point ladder the sweep walks.
DEFAULT_LAMBDAS = (0.0, 0.25, 0.5, 0.75, 1.0)

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


def dial_assignment(planes: dict, black: dict, lam: float) -> dict:
    """The lambda-dialled li-assignment over a wrapped bed: content salience off the
    stored embeddings (lambda-invariant), structure + form salience off the mixed
    channel metrics. A record enters a dialled plane only where BOTH channel views hold
    it (the mixture needs both hands); the black view covers every red record on the
    Kumulipo beds, so the restriction domains match the projector's."""
    records = planes["records"]
    cids = [r["cid"] for r in records]

    # content — stored warm-embed vectors, cosine hub-centrality (no dial: the charge
    # scopes lambda to the structure + form planes).
    vectors = {r["cid"]: r.get("embedding") for r in records if r.get("embedding")}
    ckeys = [c for c in cids if c in vectors]
    content_sal = _rank_salience(_centrality(
        ckeys, lambda a, b: 1.0 - cosine_distance(vectors[a], vectors[b])))

    # structure — DECKARD characteristic vectors per channel, angular-cosine mixed.
    cv_red = {}
    for c in cids:
        t = planes["trees"].get(c)
        if t is not None:
            lt = _to_labeled(t)
            if lt is not None:
                cv_red[c] = characteristic_vector(lt)
    cv_black = {}
    for c in cids:
        t = black["trees"].get(c)
        if t is not None:
            lt = _to_labeled(t)
            if lt is not None:
                cv_black[c] = characteristic_vector(lt)
    skeys = [c for c in cids if c in cv_red and c in cv_black]
    structure_sal = _mixed_rank(
        skeys,
        lambda a, b: _angular_cosine(cv_red[a], cv_red[b]),
        lambda a, b: _angular_cosine(cv_black[a], cv_black[b]),
        lam)

    # form — membership sets per channel, Jaccard mixed. The red sets read the DURABLE
    # form plane; the black sets read the fresh black induction.
    m_red = planes["memberships"]
    m_black = black["memberships"]
    fkeys = [c for c in cids if c in m_red and c in m_black]
    form_sal = _mixed_rank(
        fkeys,
        lambda a, b: jaccard_distance(m_red[a], m_red[b]),
        lambda a, b: jaccard_distance(m_black[a], m_black[b]),
        lam)

    restrictions = [
        {"plane": "content", "variance": "sheaf", "value": content_sal},
        {"plane": "structure", "variance": "sheaf", "value": structure_sal},
        {"plane": "form", "variance": "sheaf", "value": form_sal},
    ]
    return {"restrictions": restrictions, "stalk": {"units": cids}}


def structure_classes(planes: dict, black: dict, lam: float) -> int:
    """The structure-class count the dial can honestly claim at a rung: distinct red
    hashes at lambda=1, distinct black hashes at lambda=0, and at any interior lambda
    the JOIN partition — distinct (red, black) hash pairs — because a parse tree admits
    no interior point (surfaced in the module head, never fudged)."""
    keys = [c for c in black["hash_of"] if c in planes["hash_of"]]
    if lam >= 1.0:
        return len({planes["hash_of"][c] for c in keys})
    if lam <= 0.0:
        return len({black["hash_of"][c] for c in keys})
    return len({(planes["hash_of"][c], black["hash_of"][c]) for c in keys})


# ── spearman (the cross-bed / cross-lambda comparison read) ───────────────────────────────


def _ranks(values: list) -> list:
    """Fractional average-tie ranks (1-based average over tie runs) — the Spearman grain."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        avg = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks


def spearman(a: dict, b: dict) -> "float | None":
    """Spearman rank correlation over the SHARED keys of two salience dicts — Pearson of
    the average-tie ranks. None where a side carries zero variance (the degenerate plane
    the four-way read hit: constant membership yields no rank structure to correlate)."""
    keys = sorted(set(a) & set(b))
    if len(keys) < 3:
        return None
    ra = _ranks([a[k] for k in keys])
    rb = _ranks([b[k] for k in keys])
    n = len(keys)
    ma = sum(ra) / n
    mb = sum(rb) / n
    va = sum((x - ma) ** 2 for x in ra)
    vb = sum((x - mb) ** 2 for x in rb)
    if va == 0.0 or vb == 0.0:
        return None
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    return cov / math.sqrt(va * vb)


def _salience_by_plane(assignment: dict) -> dict:
    return {r["plane"]: r["value"] for r in assignment["restrictions"]}


def _pair_sups(assignment: dict) -> dict:
    """The pairwise sup-disagreements off the standing consistency instrument — the same
    numbers the projector's H0 read reports."""
    h0 = consistency_radius(assignment["restrictions"], assignment["stalk"])
    return {f"{p['a']}-{p['b']}": round(p["distance"], 4) for p in h0["pairs"]}


# ── the sweep (the new instrument) ────────────────────────────────────────────────────────


def sweep_lambdas(root: str, *, lambdas=DEFAULT_LAMBDAS, extracted_root: "str | None" = None,
                  base_kind: str = BLACK_BASE_KIND) -> dict:
    """Walk the dial over a wrapped bed: per lambda the plane readings + the cross-plane
    numbers; where an extracted twin rides in, the lambda=0 reading compares against the
    extracted bed's own assignment (how closely the dial reproduces extraction, rho per
    plane over the shared cids)."""
    _refuse_comparator(root)
    planes = _read_planes(root)
    black = derive_black_planes(planes, base_kind=base_kind)
    red_forms = _red_form_dimension(root)

    rows = []
    sal_at: dict = {}
    for lam in lambdas:
        assignment = dial_assignment(planes, black, lam)
        sal = _salience_by_plane(assignment)
        sal_at[lam] = sal
        sups = _pair_sups(assignment)
        rows.append({
            "lambda": lam,
            "structure_classes": structure_classes(planes, black, lam),
            "form_templates": {"red": red_forms, "black": black["forms"]},
            "sup": sups,
            "plane_units": {p: len(v) for p, v in sal.items()},
        })

    out = {"root": root, "black_base_kind": base_kind, "rows": rows,
           "black_induction": black["induction"]}

    if extracted_root:
        ext_planes = _read_planes(extracted_root)
        ext_sal = _salience_by_plane(build_assignment(ext_planes))
        low = min(lambdas)
        lam0 = sal_at[low]
        out["lambda0_vs_extracted"] = {
            "lambda": low,          # the rung compared — 0.0 unless the ladder omits it
            "extracted_root": extracted_root,
            "rho": {p: (None if (r := spearman(lam0.get(p, {}), ext_sal.get(p, {}))) is None
                        else round(r, 4))
                    for p in ("content", "structure", "form")},
            "extracted_sup": _pair_sups(build_assignment(ext_planes)),
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
    """Per-plane Spearman rho between two beds' OWN salience assignments over the shared
    cids — the read the four-way used (real vs placebo, wrapped vs extracted), stood up
    as a durable verb so the shape-placebo cell reads with the same instrument."""
    _refuse_comparator(root_a)
    _refuse_comparator(root_b)
    sal_a = _salience_by_plane(build_assignment(_read_planes(root_a)))
    sal_b = _salience_by_plane(build_assignment(_read_planes(root_b)))
    return {
        "root_a": root_a, "root_b": root_b,
        "rho": {p: (None if (r := spearman(sal_a.get(p, {}), sal_b.get(p, {}))) is None
                    else round(r, 4))
                for p in ("content", "structure", "form")},
        "shared": {p: len(set(sal_a.get(p, {})) & set(sal_b.get(p, {})))
                   for p in ("content", "structure", "form")},
    }


# ── the CLI face ──────────────────────────────────────────────────────────────────────────


def main() -> None:
    ap = argparse.ArgumentParser(
        description="channel_dial — the RED/BLACK channel dial over a wrapped bed's planes")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sweep", help="walk the lambda ladder; emit per-rung plane readings")
    s.add_argument("--root", required=True, help="the wrapped bed root")
    s.add_argument("--extracted-root", default=None, dest="extracted_root",
                   help="the extracted twin — lambda=0 compares against its own assignment")
    s.add_argument("--lambdas", default=",".join(str(x) for x in DEFAULT_LAMBDAS),
                   help="comma-separated lambda rungs in [0,1]")
    s.add_argument("--out", default=None, help="rows land here (default <root>/channel-dial)")
    c = sub.add_parser("compare", help="per-plane salience rho between two beds")
    c.add_argument("--root-a", required=True, dest="root_a")
    c.add_argument("--root-b", required=True, dest="root_b")
    args = ap.parse_args()
    if args.cmd == "compare":
        out = compare_beds(os.path.expanduser(args.root_a), os.path.expanduser(args.root_b))
        sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
        return
    lambdas = tuple(float(x) for x in args.lambdas.split(",") if x.strip() != "")
    for lam in lambdas:
        if not 0.0 <= lam <= 1.0:
            raise SystemExit(f"channel_dial: lambda {lam} falls outside [0,1]")
    root = os.path.expanduser(args.root)
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
