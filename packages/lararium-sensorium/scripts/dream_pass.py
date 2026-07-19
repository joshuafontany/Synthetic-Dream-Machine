#!/usr/bin/env python3
"""dream_pass — deep-dream v0: the consolidation pass that READS an eidetic sensorium's
three planes and WRITES a consolidated Dream sensorium beside it.

THE TWO-STORE LAW (CLS, ruled): the eidetic sensorium holds the append-only immutable
ground — this pass READS it and NEVER writes it (the ward below proves that per run);
the Dream sensorium holds the mutable schema — a re-dream REPLACES its own prior content
whole (the mutability carries the design, not a defect).

SERIALIZE THE DERIVATION, NEVER THE CARRIER: every Dream record REFERENCES eidetic cids
and carries derived schema only — no content bytes, no eidetic embeddings ride along.
Each Dream record lands with a LOCATOR vector (a content-address-derived constant-width
fingerprint of the record's own cid) so the mutable ContentStore composes cleanly; the
locator addresses, it never carries semantics — recall over the Dream store rides
get/scan + the lar_dream_* metadata, not nearest-neighbor similarity.

THE LAYOUT (chosen, documented): the Dream sensorium stands as a SIBLING directory
`<eidetic-root>-dream` beside the eidetic root — never inside it — so the whole eidetic
tree stays untouched at the directory grain and the two stores read as two sensoria:

    <root>/            — the eidetic ground (content · structure · form), READ only
    <root>-dream/
      content/            — the mutable Dream ContentStore (append_only OFF)
      dream-manifest.json — the sensorium marker: kind=dream · mutable · provenance

THE PASS, two consolidations over one read of the planes:
  · SCHEMA — form induction re-runs over the eidetic structure forest at a dream-grade
    budget (above capture's per-pass bound, still bounded); the induced constructicon
    lands as first-class template records plus one membership record per eidetic cid.
  · COHERENCE — the plane restrictions stand by the projector idiom (each plane's own
    store and native pseudometric), then the H0 radius + the H1 gate write ONE coherence
    record: where H1=0 the kernel-consensus salience lands as the consolidated reading;
    where H1>0 the disagreement lands HELD OPEN (loci capped), never averaged — the
    honest Dream of an incoherent corpus records the incoherence.

PROVENANCE + CLOCK PURITY: every Dream record carries the eidetic root and an `as_of`
marker DERIVED from the eidetic content store (a fingerprint over its cids) — no
wall-clock touches the record path; host-time stays a sighting register the underlying
stores keep for themselves.

THE NEVER-WRITES-EIDETIC WARD, two instruments (a probe witnessed the split): a bare
chroma OPEN re-writes bookkeeping bytes inside chroma.sqlite3 with zero record writes,
so the sqlite carrier cannot hold a byte-identity witness. The ward therefore checks
  (a) the LOGICAL hash — every record (ids · documents · metadatas · vectors) across all
      three eidetic plane stores, canonically serialized, before vs after; and
  (b) the BYTE hash — every eidetic plane PAYLOAD file (the hnsw index binaries hold
      byte-identical), the sqlite carrier and the dot-prefixed one-time open markers
      set aside, before vs after;
and the pass FAILS LOUD on either drift.

RE-DREAM DETERMINISM (ranking sites cured downstream; one residual named): the MDL's
RANKING tie-breaks now hold a total order in form_induction (the closed-sequence sort
and the MDL candidate pool), so equal candidates rank by content, never arrival. A
RESIDUAL site remains in the subtree miner's BOUNDED enumeration: the walk iterates
set-seeded dict order, so the per-pass budget truncates a process-varying candidate
SET (witnessed post-cure over the 12-record bed: 46/49/79 surfaced subtrees, 3-vs-5
kept templates across fresh processes) — a differing set, which no ranking order can
re-align. Until that walk holds a total order too, cross-process re-dreams over
identical ground may keep equivalent MDL grammars that differ at the margin; within
one process the grammar re-settles identically, the replacement law holds regardless,
and the as_of provenance never varies (it keys to the ground).

THE DAYDREAM SEAM (named, out of scope): daydream carries the READ-cheap concurrent
reflection — it reads the Dream store's read face (get/scan + dream-manifest.json)
alongside the eidetic planes and writes nothing; deep-dream (this pass) stays the one
WRITE-expensive re-pass. A future daydream verb rides these same stores through their
read faces only.

Usage (the mempalace venv):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 dream_pass.py run \
      --eidetic <data>/sensoriums/human-text-lares-memes [--dream <root>] \
      [--tolerance 0.25] [--min-support 2] [--max-forms 64] [--max-candidates 384] \
      [--loci-cap 32]

Meme: lar:///ha.ka.ba/lararium/sensorium/dream-pass
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys

import content_io as cio
from capture_corpus import refuse_comparator as _refuse_comparator
from form_induction import _preorder_types, _seq_support, induce_forest
from plane_base import sole_pattern_tree
from run_projector import _read_planes, build_assignment
from sensorium_consistency import consistency_radius
from sensorium_fusion import cohomology_obstruction, fuse

# The locator width — constant so the Dream collection's pinned dimension never drifts
# across re-dreams; 8 address bytes suffice (the locator addresses, it never ranks).
_LOCATOR_DIM = 8

# The dream-grade induction budget: ABOVE capture's per-pass bound (plane_fanout pins 96)
# — the consolidation pass affords a deeper mine — yet still bounded, so a pathological
# corpus can never turn the re-dream into an unbounded grind.
_DREAM_MAX_CANDIDATES = 384

_DEFAULT_TOLERANCE = 0.25    # the agreement tolerance the H1 gate reads at (one dial, recorded)
_DEFAULT_MIN_SUPPORT = 2
_DEFAULT_MAX_FORMS = 64
_DEFAULT_LOCI_CAP = 32       # caps the loci/pairs a coherence record carries; totals ride beside

_PLANE_DIRS = ("content", "structure", "form")
_SQLITE_CARRIER = "chroma.sqlite3"
_MANIFEST_NAME = "dream-manifest.json"


def _canonical(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _locator(cid: str) -> list:
    """The address-derived locator vector: the record's own cid hashed into a constant
    8-wide fingerprint. It satisfies the store's vector slot and nothing more — no
    eidetic embedding ever rides into the Dream (the derivation law)."""
    digest = hashlib.sha256(cid.encode("utf-8")).digest()
    return [b / 255.0 for b in digest[:_LOCATOR_DIM]]


def dream_root_for(eidetic_root: str) -> str:
    """The default layout: the Dream sensorium stands as the `<root>-dream` sibling."""
    return os.path.expanduser(eidetic_root).rstrip(os.sep) + "-dream"


# ── the ward (the eidetic ground stays untouched — proven, never presumed) ────────────


def _ward_roots(eidetic_root: str, dream_root: str) -> None:
    """Refuse the crossings that would let the pass touch ground it must not: the
    comparator (~/.mempalace), a Dream root inside the eidetic tree (or the reverse),
    and the two roots collapsing to one. Designation carries authority; fail loud."""
    _refuse_comparator(eidetic_root)
    _refuse_comparator(dream_root)
    e = os.path.realpath(os.path.expanduser(eidetic_root))
    d = os.path.realpath(os.path.expanduser(dream_root))
    if e == d:
        raise SystemExit("dream_pass: REFUSED — the Dream root and the eidetic root "
                         "collapse to one path; the two-store law keeps them separate")
    if d.startswith(e + os.sep):
        raise SystemExit(f"dream_pass: REFUSED — the Dream root {dream_root!r} sits inside "
                         "the eidetic root; the Dream stands BESIDE the ground, never in it")
    if e.startswith(d + os.sep):
        raise SystemExit(f"dream_pass: REFUSED — the eidetic root {eidetic_root!r} sits inside "
                         "the Dream root; the ground never nests under the mutable store")
    # A POPULATED store per plane, proven by its carrier file BEFORE any open: the store
    # opens run create=True, so opening a bare/empty plane dir would CREATE chroma
    # scaffolding inside the eidetic root — a write to the ground the byte ward cannot
    # see (it sets the sqlite carrier aside). Refuse loud instead; the pass never opens
    # what it cannot already read.
    missing = [p for p in _PLANE_DIRS
               if not os.path.isfile(os.path.join(e, p, _SQLITE_CARRIER))]
    if missing:
        raise SystemExit(f"dream_pass: the eidetic root {eidetic_root!r} misses populated "
                         f"plane store(s) {missing} — the pass reads a populated 3-plane "
                         "bed; it never creates stores inside the ground")


def eidetic_byte_hash(root: str) -> str:
    """sha256 over every eidetic plane PAYLOAD file — the sqlite carrier (+ journals)
    and the dot-prefixed open markers set aside. A probe witnessed a bare chroma open,
    with zero record writes, re-writing sqlite bookkeeping bytes AND stamping the
    one-time migration markers (.blob_seq_ids_migrated · .collection_type_fixed), so
    neither can witness byte-identity; every payload file (the hnsw index binaries)
    must hold byte-identical and this hash proves it. The record grain rides
    eidetic_logical_hash beside it."""
    h = hashlib.sha256()
    root = os.path.expanduser(root)
    for sub in _PLANE_DIRS:
        base = os.path.join(root, sub)
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames.sort()
            for fn in sorted(filenames):
                if fn.startswith(_SQLITE_CARRIER) or fn.startswith("."):
                    continue                   # open-side bookkeeping, never record data
                path = os.path.join(dirpath, fn)
                h.update(os.path.relpath(path, root).encode("utf-8"))
                with open(path, "rb") as f:
                    h.update(f.read())
    return h.hexdigest()


def eidetic_logical_hash(root: str) -> str:
    """sha256 over the RECORD GRAIN of all three eidetic plane stores — ids, documents,
    metadatas, and vectors, read through each store's own face and canonically
    serialized. The record grain carries the never-writes-eidetic witness where the
    sqlite carrier's bookkeeping churn cannot."""
    from form_encoder import FormPalaceStore
    from structurepalace_io import StructurePalaceStore

    root = os.path.expanduser(root)
    snapshot: dict = {}

    store = cio.ContentStore(os.path.join(root, "content"))
    rows = []
    offset = 0
    while True:
        page = store.scan(offset, 256)
        rows.extend(page.get("records") or [])
        if page.get("next") is None:
            break
        offset = page["next"]
    snapshot["content"] = sorted(
        ({"cid": r["cid"], "document": r.get("document") or "",
          "metadata": r.get("metadata") or {},
          "embedding": [float(x) for x in (r.get("embedding") or [])]} for r in rows),
        key=lambda r: r["cid"])

    s_store = StructurePalaceStore(os.path.join(root, "structure"))
    got = s_store._col.get(include=["documents", "metadatas"])  # noqa: SLF001 — the ward reads the raw plane
    snapshot["structure"] = sorted(
        ({"id": (got.get("ids") or [])[i],
          "document": (got.get("documents") or [None])[i],
          "metadata": (got.get("metadatas") or [{}])[i] or {}}
         for i in range(len(got.get("ids") or []))),
        key=lambda r: r["id"])

    f_store = FormPalaceStore(os.path.join(root, "form"))
    fgot = f_store._col.get(include=["embeddings", "metadatas"])  # noqa: SLF001
    fids = fgot.get("ids") or []
    fembs = fgot.get("embeddings")
    fmetas = fgot.get("metadatas") or []
    snapshot["form"] = sorted(
        ({"id": fids[i],
          "embedding": [float(x) for x in fembs[i]] if fembs is not None and i < len(fembs) else None,
          "metadata": fmetas[i] if i < len(fmetas) else {}}
         for i in range(len(fids))),
        key=lambda r: r["id"])

    return hashlib.sha256(_canonical(snapshot).encode("utf-8")).hexdigest()


def _as_of(planes: dict) -> str:
    """The as-of marker, DERIVED from the eidetic content store (a fingerprint over its
    sorted cids) — the Dream's provenance keys to the ground's own state, never to a
    wall-clock (clock purity on the record path)."""
    cids = sorted(r["cid"] for r in planes["records"])
    digest = hashlib.sha256("\n".join(cids).encode("utf-8")).hexdigest()
    return f"eidetic-{len(cids)}-{digest[:16]}"


# ── the two consolidations ─────────────────────────────────────────────────────────────


def consolidate_schema(planes: dict, *, min_support: int, max_forms: int,
                       max_candidates: int) -> dict:
    """SCHEMA consolidation: re-run blind form induction over the eidetic structure
    forest at the dream-grade budget, then read each record's membership against the
    fresh constructicon (the miners' own support relation — a template counts where its
    symbol sequence rides the record's pre-order stream). Returns the induced forms,
    the per-record membership map, and the per-template member lists."""
    cids = [r["cid"] for r in planes["records"]]
    # Induction reads ONE pre-order stream per record, so it needs a FUNCTIONAL structure map. The
    # registry does not promise one — `sole_pattern_tree` hands it over where the corpus supplies it
    # and raises, naming the records, where it does not (plane_base). It never picks.
    trees = sole_pattern_tree(planes["registry"], cids,
                              instrument="dream_pass.consolidate_schema")
    forest = [trees[c] for c in cids if c in trees]
    res = induce_forest(forest, min_support=min_support, max_forms=max_forms,
                        max_candidates=max_candidates)
    forms = res["forms"]

    membership: dict = {}
    for c in cids:
        tree = trees.get(c)
        if tree is None:
            continue                    # no structure -> no membership (the chain holds honest)
        stream: list = []
        _preorder_types(tree, stream)
        membership[c] = [f["struct_hash"] for f in forms
                         if _seq_support([stream], tuple(f["seq"])) > 0]

    members = {f["struct_hash"]: [c for c, hits in membership.items()
                                  if f["struct_hash"] in hits] for f in forms}
    return {"forms": forms, "membership": membership, "members": members,
            "summary": res["summary"]}


def consolidate_coherence(planes: dict, *, tolerance: float, loci_cap: int) -> dict:
    """COHERENCE consolidation: stand the plane restrictions by the projector idiom
    (each plane's own store and native pseudometric), read the H0 radius, then run the
    H1 gate at the recorded tolerance. H1=0 lands the kernel-consensus salience as the
    consolidated reading; H1>0 lands the disagreement HELD OPEN (loci capped) — the
    obstruction records whole, never averaged."""
    assignment = build_assignment(planes)
    h0 = consistency_radius(assignment["restrictions"], assignment["stalk"])
    obs = cohomology_obstruction(assignment, agreement_tolerance=tolerance)
    verdict = fuse(assignment, agreement_tolerance=tolerance)

    body = {
        "tolerance": tolerance,
        "radius": h0["radius"],
        "glues": h0["glues"],
        "vacuous": h0["vacuous"],
        "dim_h0": obs["dimH0"],
        "dim_h1": obs["dimH1"],
        "r_sem": obs["cost"],
        "kind": obs["kind"],
        # capped list + the uncapped total beside it — a capped seam always names how
        # much it holds back (three planes yield 3 pairs; bigger fleets outgrow the cap).
        "pairs": [{"a": p["a"], "b": p["b"], "distance": p["distance"]}
                  for p in h0["pairs"]][:loci_cap],
        "pairs_total": len(h0["pairs"]),
    }
    if verdict["verdict"] == "fuse":
        body["reading"] = "consensus"
        # the exact H0 kernel projection — per eidetic cid, the consolidated salience.
        body["consensus"] = verdict["fused"]["consensus"]
    else:
        nerve = obs["nerve"]
        loci = [{"simplex": "edge", "names": e["names"], "witness": e["witness"][:4]}
                for e in nerve["edges"]]
        loci += [{"simplex": "triangle", "names": t["names"], "witness": t["witness"][:4]}
                 for t in nerve["triangles"]]
        body["reading"] = "held-open"
        body["held_open"] = {
            "dim_h1": obs["dimH1"],
            "r_sem": obs["cost"],
            "loci": loci[:loci_cap],
            "loci_total": len(loci),
            "note": "the planes' disagreement stands recorded whole — never averaged",
        }
    return body


# ── the Dream write (mutable: a re-dream supersedes the prior content whole) ──────────


def write_dream(dream_root: str, *, eidetic_root: str, as_of: str, schema: dict,
                coherence: dict, params: dict) -> dict:
    """Land the consolidation into the Dream store. The REPLACEMENT leg leads: every
    prior Dream row sweeps out before the fresh content lands, so a re-dream over a
    re-curated ground leaves no stale template behind (supersede-whole, the mutable
    law). The manifest re-writes beside the store, marking the sensorium."""
    store = cio.ContentStore(os.path.join(dream_root, "content"), append_only=False)

    prior: list = []
    offset = 0
    while True:
        page = store.scan(offset, 256)
        prior.extend(r["cid"] for r in (page.get("records") or []))
        if page.get("next") is None:
            break
        offset = page["next"]
    if prior:
        store._col.delete(ids=prior)  # noqa: SLF001 — the mutable Dream supersedes its own prior content

    provenance = {"lar_dream_eidetic_root": os.path.expanduser(eidetic_root),
                  "lar_dream_as_of": as_of}
    counts = {"template": 0, "membership": 0, "coherence": 0}

    for f in schema["forms"]:
        h = f["struct_hash"]
        cid = f"dream:template:{h}"
        members = schema["members"].get(h, [])
        body = {"struct_hash": h, "seq": f["seq"], "origin": f.get("origin", "seq"),
                "support": f.get("support", 0), "members": members}
        for opt in ("name_hint", "dp", "tree"):
            if opt in f:
                body[opt] = f[opt]
        # Metadata stays SCALAR + filterable (kind/support/origin + a member COUNT);
        # the member cid list rides the document body alone — an unbounded JSON blob in
        # chroma metadata buys no filter and walls at scale.
        meta = {"lar_dream_kind": "template", **provenance,
                "lar_dream_support": int(f.get("support", 0)),
                "lar_dream_origin": str(f.get("origin", "seq")),
                "lar_dream_member_count": len(members)}
        store.put(cid, _canonical(body), _locator(cid), meta)
        counts["template"] += 1

    for c, hits in schema["membership"].items():
        cid = f"dream:membership:{c}"
        body = {"eidetic_cid": c, "templates": hits}
        meta = {"lar_dream_kind": "membership", **provenance,
                "lar_dream_ref_cid": c,
                "lar_dream_template_count": len(hits)}
        store.put(cid, _canonical(body), _locator(cid), meta)
        counts["membership"] += 1

    cid = "dream:coherence"
    meta = {"lar_dream_kind": "coherence", **provenance,
            "lar_dream_reading": coherence["reading"],
            "lar_dream_dim_h1": int(coherence["dim_h1"])}
    store.put(cid, _canonical(coherence), _locator(cid), meta)
    counts["coherence"] += 1

    manifest = {
        "kind": "dream",
        "mutable": True,
        "note": "the MUTABLE Dream sensorium — a re-dream supersedes this content whole; "
                "the eidetic ground it derives from stays append-only and untouched",
        "eidetic_root": os.path.expanduser(eidetic_root),
        "as_of": as_of,
        "replaced": len(prior),
        "counts": counts,
        "induction": schema["summary"],
        "params": params,
    }
    with open(os.path.join(dream_root, _MANIFEST_NAME), "w") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)

    return {"replaced": len(prior), "counts": counts, "store": store}


# ── the pass ──────────────────────────────────────────────────────────────────────────


def run(eidetic_root: str, dream_root: "str | None" = None, *,
        tolerance: float = _DEFAULT_TOLERANCE,
        min_support: int = _DEFAULT_MIN_SUPPORT,
        max_forms: int = _DEFAULT_MAX_FORMS,
        max_candidates: int = _DREAM_MAX_CANDIDATES,
        loci_cap: int = _DEFAULT_LOCI_CAP) -> dict:
    """The whole deep-dream pass: ward the roots, fingerprint the ground, read the
    planes, run both consolidations, land the Dream, then PROVE the ground untouched
    (logical + byte, fail loud on drift). Returns the witness."""
    eidetic_root = os.path.expanduser(eidetic_root)
    dream_root = os.path.expanduser(dream_root) if dream_root else dream_root_for(eidetic_root)
    _ward_roots(eidetic_root, dream_root)

    byte_before = eidetic_byte_hash(eidetic_root)
    logical_before = eidetic_logical_hash(eidetic_root)

    planes = _read_planes(eidetic_root)
    if not planes["records"]:
        raise SystemExit(f"dream_pass: the eidetic root {eidetic_root!r} holds no content "
                         "records — nothing to dream over")
    as_of = _as_of(planes)

    params = {"tolerance": tolerance, "min_support": min_support, "max_forms": max_forms,
              "max_candidates": max_candidates, "loci_cap": loci_cap}
    schema = consolidate_schema(planes, min_support=min_support, max_forms=max_forms,
                                max_candidates=max_candidates)
    coherence = consolidate_coherence(planes, tolerance=tolerance, loci_cap=loci_cap)
    landed = write_dream(dream_root, eidetic_root=eidetic_root, as_of=as_of,
                         schema=schema, coherence=coherence, params=params)

    byte_after = eidetic_byte_hash(eidetic_root)
    logical_after = eidetic_logical_hash(eidetic_root)
    ward = {
        "logical_before": logical_before, "logical_after": logical_after,
        "logical_equal": logical_before == logical_after,
        "byte_before": byte_before, "byte_after": byte_after,
        "byte_equal": byte_before == byte_after,
        "byte_scope": "every eidetic plane payload file — the sqlite carrier and the "
                      "dot-prefixed open markers set aside (a bare chroma open moves both "
                      "on a pure read, witnessed; the record grain rides the logical hash)",
    }
    if not (ward["logical_equal"] and ward["byte_equal"]):
        raise RuntimeError(f"dream_pass: THE GROUND MOVED — the eidetic stores drifted "
                           f"under the pass (ward: {ward}); the two-store law broke")

    sample_cid = (f"dream:template:{schema['forms'][0]['struct_hash']}"
                  if schema["forms"] else "dream:coherence")
    sample = landed["store"].get(sample_cid)

    return {
        "eidetic_root": eidetic_root,
        "dream_root": dream_root,
        "as_of": as_of,
        "records": len(planes["records"]),
        "replaced": landed["replaced"],
        "counts": landed["counts"],
        "induction": schema["summary"],
        "coherence": {k: coherence[k] for k in
                      ("tolerance", "radius", "glues", "vacuous", "dim_h0", "dim_h1",
                       "r_sem", "kind", "reading")},
        "eidetic_ward": ward,
        "sample": sample,
    }


def main() -> None:
    ap = argparse.ArgumentParser(
        description="dream_pass — deep-dream v0: consolidate an eidetic sensorium into "
                    "a mutable Dream sensorium beside it")
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="run the consolidation pass; emit the witness")
    r.add_argument("--eidetic", required=True,
                   help="the eidetic 3-plane root (read-only ground; never ~/.mempalace)")
    r.add_argument("--dream", default=None,
                   help="the Dream root (default: <eidetic>-dream, the sibling layout)")
    r.add_argument("--tolerance", type=float, default=_DEFAULT_TOLERANCE)
    r.add_argument("--min-support", type=int, default=_DEFAULT_MIN_SUPPORT, dest="min_support")
    r.add_argument("--max-forms", type=int, default=_DEFAULT_MAX_FORMS, dest="max_forms")
    r.add_argument("--max-candidates", type=int, default=_DREAM_MAX_CANDIDATES,
                   dest="max_candidates", help="the dream-grade induction budget (bounded)")
    r.add_argument("--loci-cap", type=int, default=_DEFAULT_LOCI_CAP, dest="loci_cap")
    args = ap.parse_args()
    w = run(args.eidetic, args.dream, tolerance=args.tolerance,
            min_support=args.min_support, max_forms=args.max_forms,
            max_candidates=args.max_candidates, loci_cap=args.loci_cap)
    sys.stdout.write(json.dumps(w, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
