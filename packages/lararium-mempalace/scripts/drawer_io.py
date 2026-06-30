#!/usr/bin/env python3
"""drawer_io — the substrate side of the @admin memory-shore.

The causal-island boundary made crossable, in ONE direction's I/O only:
this helper READS verbatim drawer content out of the mempalace library and
WRITES our domain-metadata patches back onto those same drawers. The sovereign
parse (the gradient harvester) stays in TS (@lararium/mesh) — this script never
classifies, never decides; it only moves bytes across the boundary.

Tensegrity: the verbatim drawer is the compression member (untouched content);
our `lar_*` metadata is the tension written onto it.

  export --wing W [--limit N]   -> NDJSON {id, content} on stdout, only drawers
                                    not yet at the current harvest version (idempotent)
  apply  PATCHFILE               <- NDJSON {id, patch} ; merges patch onto each
                                    drawer's existing metadata (chroma update is
                                    merge-only — we never delete a field)

Run with the mempalace CLI's interpreter (it has the package + chroma):
  /home/joshu/.venv/bin/python3 drawer_io.py export --wing wing_joshu
"""
import argparse
import json
import os
import sys

from mempalace.palace import get_collection

# This batch CLI's cap-stack is light: it #has only the shared NDJSON record reader
# (no serve loop / flock / idle-reap — those belong to the persistent serve sidecars).
from sidecar_caps import read_ndjson_records

PALACE = os.path.expanduser("~/.mempalace/palace")
# Current harvest version — bump when the harvester's output shape changes, so a
# re-harvest re-processes every drawer; unchanged, it skips already-done drawers.
HARVEST_VERSION = 6  # bump in lockstep with LAR_HV in telemetry-writeback.ts buildPatch (v6 = main-agent root handle: lar_agent_handle/lar_root_handle on top-level session drawers, no new fields)
READ_BATCH = 2000
WRITE_BATCH = 1000

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
except Exception:  # noqa: BLE001 — fail safe: still write, just unstamped
    _DECLARED, ADAPTER_NAME, ADAPTER_VERSION = None, "lares", "0.1.0"


def _col():
    return get_collection(PALACE, _skip_identity_check=True)


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
    cosine-cohesion feed. The nomic vectors were already computed by the palace at
    insert; this NEVER re-embeds and NEVER loads a model (model-agnostic readback),
    honoring the NO-new-model law. One NDJSON record per drawer:
      {id, embedding:[...], chunk_index, source_file}
    ordered for the servo by (source_file, chunk_index) so a session's members feed
    the one servo in their per-session ingest order. Read-only — never a write."""
    col = _col()
    where = {"wing": args.wing} if args.wing else None
    got = col.get(where=where, include=["embeddings", "metadatas"])
    ids = got["ids"]
    embs = got["embeddings"]
    metas = got["metadatas"]
    rows = []
    for i, emb, m in zip(ids, embs, metas):
        if emb is None:
            continue  # a drawer with no stored vector — nothing for the servo to read
        m = m or {}
        rows.append(
            {
                "id": i,
                "embedding": [float(x) for x in emb],
                "chunk_index": m.get("chunk_index"),
                "source_file": m.get("source_file", ""),
                # the EXISTING rhythmic address (Arc + Pulse stamped at capture) — the FFZ
                # orchestrator parses it, OVERLAYS the fluid bands (Measure/Beat/Theme), and
                # re-serializes, so the birth-stamped Arc/Pulse cells survive untouched.
                "lar_ffz": m.get("lar_ffz", ""),
                # the cross-graph join key to the form/structure palaces (the deferred
                # form/structure plane feed keys off this; carried now so the plumbing lands clean).
                "verbatim_sha": m.get("lar_verbatim_sha", ""),
            }
        )
    # Stable per-session order: source_file, then the ingest ordinal (the Beat label
    # source), then the id — so the servo reads each Arc's members in sequence.
    rows.sort(key=lambda r: (r["source_file"], r["chunk_index"] if r["chunk_index"] is not None else 1 << 30, r["id"]))
    out = sys.stdout
    for r in rows:
        out.write(json.dumps(r) + "\n")
    sys.stderr.write(f"read {len(rows)} embeddings (of {len(ids)} in {args.wing or 'ALL'})\n")


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


def main():
    ap = argparse.ArgumentParser(description="mempalace drawer I/O (boundary substrate side)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("export")
    e.add_argument("--wing", required=True)
    e.add_argument("--limit", type=int, default=0)
    e.set_defaults(fn=cmd_export)
    em = sub.add_parser("embeddings")
    em.add_argument("--wing", default="")  # empty ⇒ the whole palace (the servo scopes per source_file)
    em.set_defaults(fn=cmd_embeddings)
    c = sub.add_parser("cluster")
    c.add_argument("--wing", default="")  # empty ⇒ the whole palace
    c.add_argument("--threshold", type=float, default=0.5)  # cosine edge gate for the Theme graph
    c.set_defaults(fn=cmd_cluster)
    a = sub.add_parser("apply")
    a.add_argument("patchfile")
    a.set_defaults(fn=cmd_apply)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
