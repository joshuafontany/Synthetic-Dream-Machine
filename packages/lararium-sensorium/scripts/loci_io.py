#!/usr/bin/env python3
"""loci_io — the substrate side of the @admin memory-shore.

The causal-island boundary made crossable, in ONE direction's I/O only:
this helper READS verbatim drawer content out of the mempalace library and
WRITES our domain-metadata patches back onto those same drawers. The sovereign
parse (the gradient harvester) stays in TS (@lararium/mesh) — this script never
classifies, never decides; it only moves bytes across the boundary.

Tensegrity: the verbatim drawer is the compression member (untouched content);
our `lar_*` metadata is the tension written onto it.

Our side of the boundary speaks the loci/imago spatial schema (`loci.open_loci`): a placed drawer is an
imago at a locus. The nakama keeps its drawer ontology inside its submodule — this shore wraps it, names
our side, and delegates straight to the nakama palace API, so the store and flows stay the upstream's.

  export --wing W [--limit N]   -> NDJSON {id, content} on stdout, only drawers
                                    not yet at the current harvest version (idempotent)
  apply  PATCHFILE               <- NDJSON {id, patch} ; merges patch onto each
                                    drawer's existing metadata (chroma update is
                                    merge-only — we never delete a field)

Run with the mempalace CLI's interpreter (it has the package + chroma):
  /home/joshu/.venv/bin/python3 loci_io.py export --wing wing_joshu
"""
import argparse
import json
import os
import sys

from loci import open_loci  # our loci/imago shore — the nakama drawer-store is its first schema
from mempalace.palace import get_collection  # direct, for the FORM store (a plane, not a locus-schema)

# This batch CLI's cap-stack is light: it #has the shared NDJSON record reader and
# the store-readback cap (no serve loop / flock / idle-reap — those belong to the
# persistent serve sidecars). FORM_COLLECTION is the shared form-store name.
from sidecar_caps import FORM_COLLECTION, read_ndjson_records, read_stored_embeddings

"""The palace this process writes — named by `--palace`, never defaulted.

A default palace reaches whichever store happens to sit at the default, and this script WRITES
(`col.update`). The `lar_*` metadata describes drawers the capture path landed, so it must reach the
store those drawers LIVE in — a writeback that lands elsewhere leaves two stores holding one meaning.

An empty palace also matches nothing and updates nothing: a caller that names the wrong store gets
`applied: 0` and reads it as success. So an unnamed palace refuses (`_palace()`), loudly, rather than
finding somewhere plausible to write.
"""
PALACE: "str | None" = None
# Current harvest version — bump when the harvester's output shape changes, so a
# re-harvest re-processes every drawer; unchanged, it skips already-done drawers.
HARVEST_VERSION = 7  # bump in lockstep with LAR_HV in mesh/build-patch.ts (v7 = kapae convergence: lar_salience/lar_kapae/lar_frontier declared; the nuke-and-pave re-harvest re-stamps every drawer)
READ_BATCH = 2000
WRITE_BATCH = 1000

# The kapae down-weight floor (strand C) — a rewound turn's drawers ride this salience so they
# barely bend the FFZ Measure rhythm (ffz-orchestrator reads lar_salience, default 1.0). A small
# (0,1] value: it cannot trip a gong on its own, yet keeps the drawer recall-visible (set-aside,
# never erased). Mirrors the ffz test's floor (0.01).
KAPAE_FLOOR_SALIENCE = 0.01

# The declared schema contract (RFC 002). Every lar_* write is validated against
# it and stamped with the adapter identity — declared, not smuggled.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
try:
    from mempalace_source_lares.adapter import (
        declared_field_names,
        ADAPTER_NAME,
        ADAPTER_VERSION,
    )

    _DECLARED = declared_field_names()
except Exception:  # noqa: BLE001 — export (read) stays soft; the WRITE paths gate via _require_adapter
    _DECLARED, ADAPTER_NAME, ADAPTER_VERSION = None, "lares", "0.1.0"


def _require_adapter() -> None:
    """Fail-CLOSED for a session-memory WRITE: an un-importable adapter means we can neither validate
    the lar_* schema NOR stamp the true adapter identity — so refuse, rather than silently degrade to
    unvalidated/mis-stamped drawers (the exact drift the schema contract exists to catch). The export
    (read) path stays soft; only apply/kapae gate on this."""
    if _DECLARED is None:
        raise SystemExit(
            "AdapterUnavailableError: mempalace_source_lares.adapter did not import — cannot validate "
            "or stamp lar_* writes; refusing (fail-closed). Fix the adapter/package before writing."
        )


def _palace() -> str:
    """The palace, or a LOUD refusal. An unnamed palace reaches whichever store sits at a default,
    and an empty one updates nothing while reporting success. Name it, or stop."""
    if not PALACE:
        raise SystemExit(
            "loci_io: no palace named — pass `--palace <dir>`. This writes lar_* metadata onto "
            "drawers; an unnamed palace would reach whichever store sits at a default, and after a "
            "pave it would update nothing while reporting success."
        )
    return PALACE


def _col():
    # Our side speaks loci/imago; the nakama drawer-store is the first concrete schema behind the shore.
    # open_loci delegates straight to the nakama palace API, so the store + flows stay the upstream's.
    return open_loci(_palace()).locus_store()


def cmd_export(args):
    col = _col()
    got = col.get(where={"wing": args.wing}, include=["metadatas"])
    ids, metas = got["ids"], got["metadatas"]
    # source_file → lets the TS writeback derive lar_surface (the staged name is
    # prefixed `<surface>__…`); existing un-prefixed drawers default to claude.
    srcmap = {i: (m or {}).get("source_file", "") for i, m in zip(ids, metas)}
    todo = [i for i, m in zip(ids, metas) if (m or {}).get("lar_hv") != HARVEST_VERSION]
    if args.limit:
        todo = todo[: args.limit]
    out = sys.stdout
    for k in range(0, len(todo), READ_BATCH):
        batch = todo[k : k + READ_BATCH]
        d = col.get(ids=batch, include=["documents"])
        for i, doc in zip(d["ids"], d["documents"]):
            out.write(json.dumps({"id": i, "content": doc or "", "source_file": srcmap.get(i, "")}) + "\n")
    sys.stderr.write(f"exported {len(todo)} drawers (of {len(ids)} in {args.wing})\n")


def cmd_embeddings(args):
    """Read STORED embeddings back out of the palace — the FFZ Measure servo's
    CONTENT-plane cohesion feed. The nomic vectors were already computed by the palace
    at insert; the shared `read_stored_embeddings` cap NEVER re-embeds and NEVER loads a
    model (model-agnostic readback), honoring the NO-new-model law. One NDJSON record
    per drawer:
      {id, embedding:[...], chunk_index, source_file, lar_ffz, verbatim_sha,
       lar_agent_handle, lar_salience}
    ordered HERE (the caller owns ordering) by (source_file, chunk_index, id) so a
    session's members feed the one servo in their per-session ingest order. The two
    extra keys (lar_agent_handle for frontier-parse · lar_salience for down-weight)
    ride for free off the same readback. Read-only — never a write."""
    col = _col()
    where = {"wing": args.wing} if args.wing else None
    rows = read_stored_embeddings(
        col,
        {
            "chunk_index": "chunk_index",
            "source_file": "source_file",
            # the EXISTING rhythmic address (Arc + Pulse stamped at capture) — the FFZ
            # orchestrator parses it, OVERLAYS the fluid bands (Measure/Beat/Theme), and
            # re-serializes, so the birth-stamped Arc/Pulse cells survive untouched.
            "lar_ffz": "lar_ffz",
            # the cross-graph join key to the form/structure palaces (the form plane
            # feed keys off this against the form readback below).
            "verbatim_sha": "lar_verbatim_sha",
            # ride-along: the main-agent root handle (frontier-parse) + the salience
            # down-weight — projected for free off the same readback.
            "lar_agent_handle": "lar_agent_handle",
            "lar_salience": "lar_salience",
        },
        where=where,
    )
    # The string fields default to "" (the readback shape the TS orchestrator parses);
    # chunk_index stays null-graceful (the Beat cell tolerates a missing ordinal).
    for r in rows:
        r["source_file"] = r["source_file"] or ""
        r["lar_ffz"] = r["lar_ffz"] or ""
        r["verbatim_sha"] = r["verbatim_sha"] or ""
    # Stable per-session order: source_file, then the ingest ordinal (the Beat label
    # source), then the id — so the servo reads each Arc's members in sequence.
    rows.sort(key=lambda r: (r["source_file"], r["chunk_index"] if r["chunk_index"] is not None else 1 << 30, r["id"]))
    out = sys.stdout
    for r in rows:
        out.write(json.dumps(r) + "\n")
    sys.stderr.write(f"read {len(rows)} embeddings (of {len(rows)} with vectors in {args.wing or 'ALL'})\n")


def cmd_form_embeddings(args):
    """Read STORED form-vectors back out of the FORM collection — the FFZ Measure
    servo's FORM-plane feed (the SECOND plane of the two-planes braid). Same shared
    `read_stored_embeddings` cap (NEVER re-embeds), against `get_collection(PALACE,
    collection_name="form")`. The form entry's id ALREADY == its verbatim_sha (the
    cross-graph join key), so we project only the explicit `verbatim_sha` metadata for
    parity. Dumped FLAT — NO sort: form has no chunk_index/source_file ordering; the
    orchestrator joins each form vector on verbatim_sha against the content readback's
    own order. Read-only. A missing form collection (none stored yet) yields no rows
    ⇒ the orchestrator degrades to the one CONTENT plane (N=1)."""
    out = sys.stdout
    try:
        col = get_collection(_palace(), collection_name=FORM_COLLECTION, _skip_identity_check=True)
    except Exception as exc:  # noqa: BLE001 — no form store yet ⇒ 1-plane degrade
        sys.stderr.write(f"form-embeddings: no form collection ({type(exc).__name__}: {exc}) — 0 rows\n")
        return
    rows = read_stored_embeddings(col, {"verbatim_sha": "lar_verbatim_sha"})
    for r in rows:
        # id already == verbatim_sha; keep the explicit key non-null for the join.
        r["verbatim_sha"] = r["verbatim_sha"] or r["id"]
        out.write(json.dumps(r) + "\n")
    sys.stderr.write(f"read {len(rows)} form-vectors from the '{FORM_COLLECTION}' collection\n")


def cmd_cluster(args):
    """Theme band: cluster the wing's drawer-graph by embedding cosine similarity
    (networkx greedy-modularity communities) → ONE JSON line:
      {communities:{id:label}, modularity, members, edges}

    The Theme cell is a community LABEL LOCAL to this store — never cross-vessel. Labels are
    DETERMINISTIC (communities ranked by their min member-ordinal), so a re-run yields the SAME
    labels = the idempotent stamp the orchestrator needs. Read-only — never a write. The TS
    orchestrator applies the ffzAcceptRecluster MDL/modularity guard over this `modularity`.

    SCOPE: networkx + numpy ride the venv (igraph/leidenalg do NOT); this uses the deterministic
    Clauset-Newman-Moore greedy modularity, the in-scope community-detection the sidecar holds."""
    import networkx as nx
    import numpy as np

    col = _col()
    where = {"wing": args.wing} if args.wing else None
    got = col.get(where=where, include=["embeddings"])
    ids = got["ids"]
    embs = got["embeddings"]
    pairs = [(i, e) for i, e in zip(ids, embs) if e is not None]
    out = sys.stdout
    if len(pairs) < 2:
        out.write(json.dumps({"communities": {}, "modularity": 0.0, "members": len(pairs), "edges": 0}) + "\n")
        sys.stderr.write(f"cluster: {len(pairs)} drawers — too few to cluster\n")
        return

    M = np.asarray([e for _, e in pairs], dtype=float)
    norms = np.linalg.norm(M, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    Mn = M / norms
    sim = Mn @ Mn.T  # cosine similarity (rows are unit-normed)
    n = len(pairs)
    thr = args.threshold

    G = nx.Graph()
    G.add_nodes_from(range(n))
    for a in range(n):
        row = sim[a]
        for b in range(a + 1, n):
            w = float(row[b])
            if w >= thr:
                G.add_edge(a, b, weight=w)

    communities = list(nx.community.greedy_modularity_communities(G, weight="weight"))
    try:
        modularity = float(nx.community.modularity(G, communities, weight="weight")) if G.number_of_edges() else 0.0
    except Exception:  # noqa: BLE001 — a degenerate graph yields no modularity; report 0
        modularity = 0.0

    # Deterministic label = the community's RANK by its smallest member ordinal, so the
    # same graph always paints the same labels (the idempotent Theme stamp).
    label_of = {}
    for label, members in enumerate(sorted(communities, key=lambda c: min(c))):
        for idx in members:
            label_of[pairs[idx][0]] = label
    out.write(json.dumps({"communities": label_of, "modularity": modularity, "members": n, "edges": G.number_of_edges()}) + "\n")
    sys.stderr.write(f"clustered {n} drawers → {len(communities)} communities, Q={modularity:.4f}\n")


def cmd_apply(args):
    _require_adapter()  # fail-closed: no unvalidated/mis-stamped session-memory writes
    col = _col()
    patches = list(read_ndjson_records(args.patchfile))
    applied = 0
    for k in range(0, len(patches), WRITE_BATCH):
        batch = patches[k : k + WRITE_BATCH]
        ids = [p["id"] for p in batch]
        cur = col.get(ids=ids, include=["metadatas"])
        curmap = dict(zip(cur["ids"], cur["metadatas"]))
        up_ids, up_metas = [], []
        for p in batch:
            patch = p["patch"]
            # Conformance gate: every lar_* key MUST be declared in LAR_SCHEMA.
            if _DECLARED is not None:
                undeclared = {k for k in patch if k.startswith("lar_")} - _DECLARED
                if undeclared:
                    raise SystemExit(
                        f"SchemaConformanceError: undeclared lar_ fields {sorted(undeclared)} — "
                        "declare them in mempalace_source_lares/adapter.py LAR_SCHEMA before writing"
                    )
            merged = dict(curmap.get(p["id"], {}) or {})
            merged.update(patch)  # merge: tension written onto the strut
            merged["adapter_name"] = ADAPTER_NAME  # declared, not smuggled
            merged["adapter_version"] = ADAPTER_VERSION
            up_ids.append(p["id"])
            up_metas.append(merged)
        if up_ids:
            col.update(ids=up_ids, metadatas=up_metas)
            applied += len(up_ids)
    print(json.dumps({"applied": applied, "hv": HARVEST_VERSION, "adapter": ADAPTER_NAME, "adapter_version": ADAPTER_VERSION}))


def cmd_kapae(args):
    """Down-weight a rewound turn's drawers — the strand-C salience producer.

    Reads NDJSON {"verbatim_sha": V, "ended": T?} (the shas the structurepalace kapae dropped — the
    turn's content drawers — each with the rewind-detection moment) and stamps
    lar_salience=floor + the lar_kapae LIVENESS stamp on every drawer whose lar_verbatim_sha
    matches. lar_kapae carries the row's `ended` (iso whole-seconds — WHEN the rewind was
    detected, the rank signal recall reads); a legacy row without `ended` stamps 1 (the
    pre-timestamp truthy mark — any truthy lar_kapae reads "rewound"). set-aside, never erased:
    the drawer stays recall-visible, but contributes almost no fused surprise to the FFZ Measure
    servo (the convergence twin of the KG valid-close + the structurepalace tally-decrement).
    Idempotent per detection — kapae fires once per gone turn (the structurepalace no-ops a re-kapae),
    so the stamp keeps its FIRST detection moment. Merge-only update (never deletes a field),
    the adapter identity stamped like apply."""
    _require_adapter()  # fail-closed: no mis-stamped session-memory writes
    col = _col()
    recs = list(read_ndjson_records(args.patchfile))
    ended_by_sha = {r["verbatim_sha"]: r.get("ended") for r in recs if r.get("verbatim_sha")}
    shas = list(ended_by_sha)
    stamped = 0
    floor = args.salience if args.salience is not None else KAPAE_FLOOR_SALIENCE
    for k in range(0, len(shas), WRITE_BATCH):
        batch = shas[k : k + WRITE_BATCH]
        # chroma `where` over the indexed lar_verbatim_sha — one $in query per batch resolves the
        # content drawers (makeAstSplitFlush stamps lar_verbatim_sha on every captured drawer).
        where = {"lar_verbatim_sha": {"$in": batch}} if len(batch) > 1 else {"lar_verbatim_sha": batch[0]}
        got = col.get(where=where, include=["metadatas"])
        ids, metas = got["ids"], got["metadatas"]
        if not ids:
            continue
        up_metas = []
        for m in metas:
            merged = dict(m or {})
            merged["lar_salience"] = floor
            merged["lar_kapae"] = ended_by_sha.get(merged.get("lar_verbatim_sha")) or 1
            merged["adapter_name"] = ADAPTER_NAME
            merged["adapter_version"] = ADAPTER_VERSION
            up_metas.append(merged)
        col.update(ids=ids, metadatas=up_metas)
        stamped += len(ids)
    print(json.dumps({"stamped": stamped, "salience": floor, "shas": len(shas)}))


def main():
    ap = argparse.ArgumentParser(description="mempalace drawer I/O (boundary substrate side)")
    # REQUIRED, never defaulted — see the PALACE note above. Every subcommand inherits it.
    ap.add_argument("--palace", required=True,
                    help="the palace dir this writes lar_* onto (no default: an unnamed palace "
                         "silently reaches the guest, and silently no-ops after a pave)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("export")
    e.add_argument("--wing", required=True)
    e.add_argument("--limit", type=int, default=0)
    e.set_defaults(fn=cmd_export)
    em = sub.add_parser("embeddings")
    em.add_argument("--wing", default="")  # empty ⇒ the whole palace (the servo scopes per source_file)
    em.set_defaults(fn=cmd_embeddings)
    fe = sub.add_parser("form-embeddings")  # the FORM-plane readback (keyed by verbatim_sha)
    fe.set_defaults(fn=cmd_form_embeddings)
    c = sub.add_parser("cluster")
    c.add_argument("--wing", default="")  # empty ⇒ the whole palace
    c.add_argument("--threshold", type=float, default=0.5)  # cosine edge gate for the Theme graph
    c.set_defaults(fn=cmd_cluster)
    a = sub.add_parser("apply")
    a.add_argument("patchfile")
    a.set_defaults(fn=cmd_apply)
    k = sub.add_parser("kapae")  # strand-C salience down-weight by verbatim_sha
    k.add_argument("patchfile", help="NDJSON {verbatim_sha} — the shas the structurepalace kapae dropped")
    k.add_argument("--salience", type=float, default=None, help=f"floor salience (default {KAPAE_FLOOR_SALIENCE})")
    k.set_defaults(fn=cmd_kapae)
    args = ap.parse_args()
    global PALACE
    PALACE = args.palace
    args.fn(args)


if __name__ == "__main__":
    main()
