#!/usr/bin/env python3
"""structurepalace_io — the substrate side of the `.structurepalace` memory-ast-unfolding palace.

A SECOND mempalace instance (the same ChromaDB engine, a separate palace dir) that
holds the per-turn parse-tree AST, keyed by its STRUCTURAL HASH (sha256 of the
canonical-JSON of the tree). Twin to the verbatim palace (`~/.mempalace`) and to
`.meshpalace`; it NEVER federates on the mesh — local, content-addressed, the eidetic
↔ semantic bridge.

The binding is CODE-LEVEL, navigable BOTH ways:
  - the verbatim drawer (in the verbatim palace) carries `lar_ast_hash`  → this entry's id
  - this entry carries `verbatim_sha` + `source_file`                    → that drawer

One holder process serves each palace dir — the reap-don't-pile invariant: never two holders
fighting the per-palace mine lock. The TS `makeStructurePalace` keys a singleton on the
canonical palace dir so a second `put` reuses this one process instead of spawning a pile.
The chroma handle itself lives in `mempalace.palace._DEFAULT_BACKEND._clients`, the shared
registry every reap path walks — this helper opens through `get_collection` and constructs
no client of its own, so closing a palace here reaches the same handle the CLI closes.

It is OUR code (the causal-island boundary's substrate side), NOT the submodule: it only
moves bytes across the boundary via `mempalace.palace.get_collection` (create-or-open),
storing the AST verbatim as the drawer document and the binding as flat metadata. It never
classifies, never decides — the sovereign parse stays in TS (@lararium/mesh).

Protocol — NDJSON over stdin/stdout, one JSON object per line; ONLY JSON responses go to
stdout (banners/library noise → stderr, which the TS side drains and ignores):

    -> {"id":1,"op":"ping"}
    <- {"id":1,"ok":true,"result":{"ready":true}}

    -> {"id":2,"op":"put","hash":H,"ast":"<canonical-json>","source_file":S,"verbatim_sha":V,"turn_key":K}
    <- {"id":2,"ok":true,"result":{"hash":H,"count":N}}

    -> {"id":3,"op":"get","hash":H}
    <- {"id":3,"ok":true,"result":{ <StructureEntry> | null }}

    -> {"id":5,"op":"query","query":"<free text>","k":8}
    <- {"id":5,"ok":true,"result":{"kind":K,"matches":[{"hash":H,"distance":D,"verbatim_sha":V,…}]}}

    -> {"id":4,"op":"kapae","turn_key":K,"set_aside_mark":M}
    <- {"id":4,"ok":true,"result":{"closed":N,"tombstoned":[H,…],"verbatim_shas":[V,…],"turn_key":K}}

KAPAE (rewind = set-aside, never erase) — the structurepalace twin of the worldline KG kapae.
Keyed by the USER turn's uuid (turn_key), which `put` threads into every provenance entry. A
gone turn drops its provenance line and decrements `count`; an entry whose count falls to ≤0 is
TOMBSTONED (`lar_tombstoned` stamped, the chroma row KEPT, excluded from recall) rather than
deleted (history preserved). Idempotent: a 2nd kapae for the same uuid finds the line already
gone → a no-op. A small sqlite reverse-index (`turnkey_index.sqlite3`, beside the chroma store —
mirrors kg_io's raw-sqlite-beside-chroma idiom) keeps the turn_key → structural_hash lookup O(1),
since chroma cannot where-filter inside a JSON provenance list.

Run with the mempalace CLI's interpreter (it has the package + chroma):
  PYTHONPATH=<repo>/mempalace  ~/.venv/bin/python3 structurepalace_io.py serve --palace <abide>/sensoriums/memory/structure
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sys

from mempalace.palace import get_collection

# The serve cap-stack this holder #has — flock-singleton · idle-reap · NDJSON serve-loop ·
# ops-dispatch · the serve composition root — composed from the shared foundation, never inherited.
#
# `_fcntl`/`_select` re-export so the serve tests read them as MODULE ATTRIBUTES (`ap._fcntl is None`)
# to gate their POSIX skip markers. A linter reads them as unused — it cannot see a cross-module
# attribute read — so they carry the mark that says otherwise. Cutting them takes the skip markers with
# them, and the serve tests then FAIL on a platform they mean to skip.
from holder_caps import (
    ReverseIndex,
    _fcntl,  # noqa: F401 — read as `ap._fcntl` by the serve tests' POSIX skipif
    _select,  # noqa: F401 — read as `ap._select` by the idle-reap tests' skipif
    acquire_serve_lock,
    idle_ttl_seconds,
    make_dispatch,
    mine_busy_retry,
    read_stored_embeddings,
    release_lock,
    run_holder,
    serve_lock_path,
    serve_loop,
)

# Cap the provenance list so a hot recurring structure cannot grow one entry without
# bound — mirrors the prior flat-file store's PROVENANCE_CAP.
PROVENANCE_CAP = 64

# Idle-reap TTL: a holder with no requests for this many seconds shuts itself down so
# a holder that outlives its TS parent (or one piled up before the singleton flock
# landed) can't linger forever. 0 (or negative) opts out. Read fresh from the env so
# an operator/test can override per process. The flock singleton is the primary guard;
# idle-reap bounds accumulation even if a flock is somehow bypassed (e.g. non-POSIX).
IDLE_TTL_ENV = "STRUCTUREPALACE_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0

# The holder's identity in the lock namespace — its per-palace singleton prefix.
_LOCK_PREFIX = "structurepalace_serve"


def _serve_lock_path(palace_path: str) -> str:
    return serve_lock_path(palace_path, _LOCK_PREFIX)


def _acquire_serve_lock(palace_path: str):
    return acquire_serve_lock(palace_path, _LOCK_PREFIX)


def _release_lock(fh) -> None:
    release_lock(fh)


def _idle_ttl_seconds() -> float:
    return idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS)


# ── The STRUCTURAL ENCODER — a deterministic feature-vector over the AST SHAPE ───────
#
# The `.structurepalace` is addressed by EXACT id (the structural hash) for put/get/kapae — we
# never semantic-search it — so we supply our OWN vectors and NEVER invoke the palace's
# embedding model (no model load, no download, no network). The vector is the STRUCTURE
# PLANE's cohesion feed for the FFZ Measure servo (ffz-orchestrator, the 3rd quorum plane):
# it must be COSINE-MEANINGFUL — two structurally-similar trees land NEAR, dissimilar trees
# FAR. The retired hash-hex embedding could NOT do this (sibling trees hash to orthogonal
# noise); this one captures the AST's SHAPE, so the geometry carries semantics.
#
# The feature vector is two concatenated blocks, then L2-normalized (cosine = dot):
#   1. a NODE-TYPE HISTOGRAM (feature-hashed into a fixed number of buckets, so the open
#      node-type vocabulary maps to a fixed dimension) — the dominant fingerprint: trees
#      built from the same node-types overlap here.
#   2. TREE-SHAPE STATISTICS (depth · node-count · branching mean/max/spread · leaf
#      fraction · subtree size · balance) — each saturated to [0,1), so two trees of the
#      same silhouette read close even when their type-mix differs slightly.
#
# DETERMINISTIC + light: a single recursive walk, sha256 bucketing, pure arithmetic — no
# model, fast, reproducible (a re-harvest re-derives the byte-identical vector).
#
# FOLLOW-UPS (documented, NOT built): a richer geometry could replace the histogram with a
# tree-kernel (subtree / subpath / Weisfeiler-Lehman label-propagation) Gram-vector, or a
# LEARNED tree-embedding (a small TreeLSTM / GNN over the AST). Both are heavier (a kernel
# basis or a trained model) and break the "no-model, instant" invariant this encoder holds;
# they stay deferred behind this light feature-vector.
_HISTO_BUCKETS = 24
_SHAPE_DIM = 8
_EMBED_DIM = _HISTO_BUCKETS + _SHAPE_DIM  # 32 — pinned at the collection's first upsert

# Block weights — each block is unit-normalized THEN weighted, so the NODE-TYPE HISTOGRAM
# (the strong fingerprint: trees of disjoint node-types must read FAR) dominates the SHAPE
# silhouette (a secondary signal: two small trees share a similar silhouette even when their
# type-mix differs). Without the down-weight the 8 shape stats — each in [0,1) — out-mass the
# sparse histogram after L2 and two type-disjoint trees read spuriously near.
_HISTO_WEIGHT = 1.0
_SHAPE_WEIGHT = 0.5

# The node fields that carry a TYPE-ish label (checked in order); absent all of them, a
# node's sorted key-set stands in (a content-free structural signature).
_TYPE_KEYS = ("type", "kind", "name", "tag", "sigil", "sigilName", "rule")


def _node_label(node: dict) -> str:
    """A stable, content-light label for a dict node — its first present type-ish field,
    else a signature of its key-set. Never the node's VALUES (that would leak content into
    a SHAPE vector); only its type/shape."""
    for k in _TYPE_KEYS:
        v = node.get(k)
        if isinstance(v, str) and v:
            return f"{k}={v}"
    return "keys:" + ",".join(sorted(map(str, node.keys())))


def _bucket(label: str) -> int:
    """Feature-hash a node label into a fixed histogram bucket (open vocab → fixed dim)."""
    return int.from_bytes(hashlib.sha256(label.encode("utf-8")).digest()[:4], "big") % _HISTO_BUCKETS


def _saturate(x: float, scale: float) -> float:
    """Map [0,∞) → [0,1) monotonically: x/(x+scale). A bounded, derivative-free squash so
    an unbounded shape stat (node-count, depth, …) contributes a comparable [0,1) feature."""
    return x / (x + scale) if x > 0 else 0.0


def _structural_features(tree: object) -> list[float]:
    """ONE recursive walk → (node-type histogram, tree-shape stats). A dict OR list is a
    structural node; scalars are leaves. The histogram counts node labels; the stats track
    depth, branching, subtree sizes, and leaf-depth spread (the balance)."""
    histo = [0.0] * _HISTO_BUCKETS
    branchings: list[int] = []
    subtree_sizes: list[int] = []
    leaf_depths: list[int] = []
    state = {"nodes": 0, "leaves": 0, "max_depth": 0}

    def walk(node: object, depth: int) -> int:
        if isinstance(node, dict):
            histo[_bucket(_node_label(node))] += 1.0
            kids = [v for v in node.values() if isinstance(v, (dict, list))]
        elif isinstance(node, list):
            histo[_bucket("[list]")] += 1.0
            kids = [v for v in node if isinstance(v, (dict, list))]
        else:
            state["leaves"] += 1
            leaf_depths.append(depth)
            return 0
        state["nodes"] += 1
        if depth > state["max_depth"]:
            state["max_depth"] = depth
        branchings.append(len(kids))
        if not kids:
            leaf_depths.append(depth)  # a node with no container children is a structural leaf
        size = 1
        for k in kids:
            size += walk(k, depth + 1)
        subtree_sizes.append(size)
        return size

    walk(tree, 0)

    nodes = state["nodes"]
    total = sum(histo)
    histo_norm = [c / total for c in histo] if total > 0 else histo

    def _mean(xs: list) -> float:
        return sum(xs) / len(xs) if xs else 0.0

    def _std(xs: list) -> float:
        if len(xs) < 2:
            return 0.0
        m = _mean(xs)
        return math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs))

    mean_branch = _mean(branchings)
    max_branch = max(branchings) if branchings else 0
    # Leaf fraction = structural nodes with no container children (the tree's terminals).
    leaf_frac = (sum(1 for b in branchings if b == 0) / nodes) if nodes else 0.0

    shape = [
        _saturate(float(nodes), 16.0),            # 1. size of the tree
        _saturate(float(state["max_depth"]), 8.0),  # 2. how deep
        _saturate(mean_branch, 2.0),              # 3. typical fan-out
        _saturate(float(max_branch), 4.0),        # 4. widest fan-out
        _saturate(_std(branchings), 2.0),         # 5. fan-out spread
        leaf_frac,                                # 6. leaf fraction (already [0,1])
        _saturate(_mean(subtree_sizes), 8.0),     # 7. typical subtree size
        _saturate(_std(leaf_depths), 4.0),        # 8. leaf-depth spread (im/balance)
    ]
    return histo_norm, shape


def _l2(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec] if norm > 0 else list(vec)


def _structural_embed(tree: object) -> list[float]:
    """The REAL structural embedding: the SHAPE feature-vector, L2-normalized (so a dot is a
    cosine). DETERMINISTIC — a given tree always yields the same vector. The two blocks are
    unit-normalized then weighted ({@link _HISTO_WEIGHT}/{@link _SHAPE_WEIGHT}) so the type
    histogram dominates the silhouette, then the whole is L2-normalized."""
    histo, shape = _structural_features(tree)
    hu = _l2(histo)
    su = _l2(shape)
    combined = [_HISTO_WEIGHT * x for x in hu] + [_SHAPE_WEIGHT * x for x in su]
    return _l2(combined)


def _hash_fallback(structural_hash: str) -> list[float]:
    """A deterministic _EMBED_DIM-vector spread off the hash hex — the fallback when an AST
    json cannot be parsed (it never should: ast_json is canonicalJson output). L2-normalized,
    same dimension as the real encoder, so the collection's pinned length holds."""
    raw = []
    h = structural_hash or ""
    for i in range(_EMBED_DIM):
        chunk = (h[(i * 2) % max(len(h), 1):][:2] or "00").ljust(2, "0")
        try:
            raw.append(int(chunk, 16) / 255.0)
        except ValueError:
            raw.append(0.0)
    return _l2(raw)


def _embed(ast_json: str, structural_hash: str) -> list[float]:
    """The embedding for an upsert — parse the AST json and encode its SHAPE; on a parse
    failure (never expected), fall back to a hash-spread vector of the same dimension so the
    put never crashes and the collection's pinned vector length holds."""
    try:
        tree = json.loads(ast_json) if ast_json else None
    except (ValueError, TypeError):
        return _hash_fallback(structural_hash)
    if tree is None:
        return _hash_fallback(structural_hash)
    return _structural_embed(tree)


def _unreliable_witness_timestamp() -> str:
    """A host-wall-clock reading — an UNRELIABLE WITNESS under no-global-now: island clocks skew, so
    this value NEVER compares across islands and NEVER orders anything. Provenance only (a rough "this
    node saw it around here"); the logical/FFZ clock — once it lands py-side — is the ordering authority.
    Named to strip the false-clock authority, not to fabricate a global-now (two-clocks: this is neither
    the CRDT-causal clock nor the FFZ rhythm). Routes through deep_time — the ONE island-local-wall-time
    provenance home (hedge against a centuries-long drift scattering the intent)."""
    from deep_time import island_local_now

    return island_local_now()


# The reverse-index db name — sits BESIDE the chroma store in the palace dir (kg_io's
# raw-sqlite-beside-chroma idiom). Maps turn_key → structural_hash so kapae stays O(1):
# chroma cannot where-filter inside the JSON provenance list.
_TURNKEY_INDEX_DB = "turnkey_index.sqlite3"


class StructurePalaceStore:
    """One open `.structurepalace` collection; put (recurrence RMW) + get by structural hash + kapae."""

    def __init__(self, palace_path: str) -> None:
        # create-or-open: get_collection(create=True) os.makedirs the dir + creates the
        # collection if absent — this IS the `init` for a fresh palace. Identity check
        # skipped: we never run the embedder, so its recorded identity is irrelevant.
        self._col = get_collection(palace_path, create=True, _skip_identity_check=True)
        # The turn_key → structural_hash reverse-index, beside the chroma store (the shared
        # ReverseIndex cap — get_collection already made the palace dir, so the path is safe).
        # One row per turn_key (PK); a turn re-put under a new structure overwrites it (the
        # latest structure for that turn).
        self._index = ReverseIndex(palace_path, _TURNKEY_INDEX_DB, "turnkey_index", "turn_key", "structural_hash")

    def _get_raw(self, structural_hash: str) -> dict | None:
        got = self._col.get(ids=[structural_hash], include=["documents", "metadatas"])
        ids = got.get("ids") or []
        if not ids:
            return None
        docs = got.get("documents") or [None]
        metas = got.get("metadatas") or [None]
        return {"id": ids[0], "document": docs[0], "metadata": metas[0] or {}}

    def _to_entry(self, raw: dict) -> dict:
        meta = raw["metadata"]
        try:
            provenance = json.loads(meta.get("lar_provenance") or "[]")
        except (ValueError, TypeError):
            provenance = []
        try:
            ast = json.loads(raw["document"]) if raw["document"] else None
        except (ValueError, TypeError):
            ast = None
        return {
            "hash": raw["id"],
            "ast": ast,
            "count": int(meta.get("count", 1)),
            "first_sighting": meta.get("first_sighting", ""),
            "last_sighting": meta.get("last_sighting", ""),
            "provenance": provenance,
            # kapae set-aside marker (absent on a live entry); a tombstoned entry keeps its row
            # but its structure no longer counts toward recurrence.
            **({"tombstoned": meta["lar_tombstoned"]} if meta.get("lar_tombstoned") else {}),
        }

    def get(self, structural_hash: str) -> dict | None:
        raw = self._get_raw(structural_hash)
        return self._to_entry(raw) if raw is not None else None

    def entry_for_cid(self, cid: str) -> dict | None:
        """Resolve a content cid to its STRUCTURE entry through the provenance join — the structurepalace
        keys by structural hash, so the cid walks the provenance lines. The by-cid door a cross-plane
        recall joins on (mirrors plane_query.structure_entry_for_cid, kept on the store so the serve holder
        answers it too). None when no entry binds the cid."""
        got = self._col.get(include=["metadatas"])
        ids = got.get("ids") or []
        metas = got.get("metadatas") or []
        for i, h in enumerate(ids):
            meta = metas[i] or {}
            try:
                provenance = json.loads(meta.get("lar_provenance") or "[]")
            except (ValueError, TypeError):
                provenance = []
            if any(p.get("verbatim_sha") == cid for p in provenance):
                return {"hash": h, "count": meta.get("count"),
                        "provenance_cids": sorted({p.get("verbatim_sha") for p in provenance
                                                   if p.get("verbatim_sha")})}
        return None

    def query(self, text: str, k: int = 8) -> dict:
        """The CLEAN query face — nearest STRUCTURES to a free-text query, so callers stop reaching `_col`
        directly. Route the text through the SAME structural pipeline capture rides: detect the kind, parse
        to a content-free tree, encode its SHAPE ({@link _structural_embed}), then read the collection by
        that vector — NEVER a content vector (the independence law holds). Returns
        {kind, matches:[{hash, distance, count, verbatim_sha, source_file}]}; each match carries
        `verbatim_sha` (its most-recent provenance join) so a cross-plane recall can join it to content. A
        kind the router holds no grammar for → an empty match-set + a note (never a crash)."""
        from structure_router import detect_kind, parse_to_tree
        kind = detect_kind("query.md", text)
        tree = parse_to_tree(kind, text)
        if tree is None:
            return {"kind": kind, "matches": [], "note": f"the router holds no grammar for kind {kind!r}"}
        got = self._col.query(query_embeddings=[_structural_embed(tree)], n_results=max(k, 1),
                              include=["metadatas", "distances"])
        ids = (got.get("ids") or [[]])[0]
        metas = (got.get("metadatas") or [[]])[0]
        dists = (got.get("distances") or [[]])[0]
        matches = [{"hash": ids[i],
                    "distance": dists[i] if i < len(dists) else None,
                    "count": (metas[i] or {}).get("count"),
                    "verbatim_sha": (metas[i] or {}).get("lar_verbatim_sha", ""),
                    "source_file": (metas[i] or {}).get("source_file", "")}
                   for i in range(len(ids))]
        return {"kind": kind, "matches": matches}

    def put(self, structural_hash: str, ast_json: str, source_file: str, verbatim_sha: str, turn_key: str = "") -> dict:
        sighting = _unreliable_witness_timestamp()  # a PURE unreliable-witness sighting — provenance only, never a worldline/tombstone marker
        # The provenance line carries the kapae key (the USER turn's uuid) alongside the verbatim
        # join — so a gone turn can drop exactly its line. turn_key may be "" (a put with no turn
        # context, e.g. a backfill); such a line is simply not kapae-addressable.
        link = {"source_file": source_file, "verbatim_sha": verbatim_sha}
        if turn_key:
            link["turn_key"] = turn_key
            # STALE-TALLY GUARD: if this turn already unfolded to a DIFFERENT structure (content
            # EDITED under an unchanged turn-uuid), retract its tally from the OLD structure FIRST
            # (drop the provenance line, decrement, tombstone-at-zero — mirroring kapae) BEFORE the
            # index repoints. Else the old structure's recurrence count is orphaned, never decremented.
            # A re-put to the SAME structure skips this (idempotent no-op).
            prior_hash = self._index.lookup(turn_key)
            if prior_hash and prior_hash != structural_hash:
                self._retract_turn_from(prior_hash, turn_key, turn_key)  # set-aside marker = the PURE logical turn_key, never the unreliable sighting
            # The reverse-index lets kapae find this structure by turn_key in O(1).
            self._index.put(turn_key, structural_hash)
        existing = self._get_raw(structural_hash)
        if existing is not None:
            meta = dict(existing["metadata"])
            try:
                provenance = json.loads(meta.get("lar_provenance") or "[]")
            except (ValueError, TypeError):
                provenance = []
            seen = any(
                p.get("source_file") == source_file and p.get("verbatim_sha") == verbatim_sha
                for p in provenance
            )
            if not seen and len(provenance) < PROVENANCE_CAP:
                provenance.append(link)
            count = int(meta.get("count", 1)) + 1
            meta.update(
                {
                    "count": count,
                    "last_sighting": sighting,
                    "lar_verbatim_sha": verbatim_sha,
                    "source_file": source_file,
                    "lar_provenance": json.dumps(provenance),
                }
            )
            # Revival: a tombstoned structure that recurs is live again (its turns came back, or a
            # new turn unfolds the same shape). Clear the set-aside marker ("" reads as live).
            if meta.get("lar_tombstoned"):
                meta["lar_tombstoned"] = ""
            # Recurrence: same structure, same id → upsert (overwrite) the one entry.
            mine_busy_retry(lambda: self._col.upsert(
                ids=[structural_hash],
                documents=[ast_json],
                metadatas=[meta],
                embeddings=[_embed(ast_json, structural_hash)],
            ))
            return {"hash": structural_hash, "count": count}

        meta = {
            "kind": "ast",
            "lar_structural_hash": structural_hash,
            "lar_verbatim_sha": verbatim_sha,
            "source_file": source_file,
            "count": 1,
            "first_sighting": sighting,
            "last_sighting": sighting,
            "lar_provenance": json.dumps([link]),
        }
        mine_busy_retry(lambda: self._col.upsert(
            ids=[structural_hash],
            documents=[ast_json],
            metadatas=[meta],
            embeddings=[_embed(ast_json, structural_hash)],
        ))
        return {"hash": structural_hash, "count": 1}

    def _retract_turn_from(self, structural_hash: str, turn_key: str, set_aside_mark: str) -> dict:
        """Drop `turn_key`'s provenance line(s) from `structural_hash` and decrement its recurrence
        `count`; tombstone-at-zero (`lar_tombstoned` stamped, the chroma row KEPT) rather than
        delete — history preserved, recall excludes it. Idempotent: a line already gone → a no-op
        (nothing re-decremented). SHARED by kapae (the gone-turn set-aside) and put (the edit-under-
        same-uuid stale-tally guard). Returns {closed, tombstoned, verbatim_shas}.
        """
        raw = self._get_raw(structural_hash)
        if raw is None:
            return {"closed": 0, "tombstoned": [], "verbatim_shas": []}
        meta = dict(raw["metadata"])
        try:
            provenance = json.loads(meta.get("lar_provenance") or "[]")
        except (ValueError, TypeError):
            provenance = []
        # Drop every provenance line minted by this turn (normally one). The verbatim_shas of the
        # dropped lines feed the salience down-weight (strand C).
        kept, dropped_shas = [], []
        for p in provenance:
            if p.get("turn_key") == turn_key:
                if p.get("verbatim_sha"):
                    dropped_shas.append(p["verbatim_sha"])
            else:
                kept.append(p)
        removed = len(provenance) - len(kept)
        if removed == 0:
            # Idempotent no-op: the line is already gone (a 2nd retract for the same uuid).
            return {"closed": 0, "tombstoned": [], "verbatim_shas": []}
        count = int(meta.get("count", 1)) - removed
        meta["count"] = count
        meta["lar_provenance"] = json.dumps(kept)
        tombstoned = []
        if count <= 0:
            meta["lar_tombstoned"] = set_aside_mark
            tombstoned.append(structural_hash)
        # update() (not upsert) — leave the document/embedding untouched; only the metadata moves.
        self._col.update(ids=[structural_hash], metadatas=[meta])
        return {"closed": removed, "tombstoned": tombstoned, "verbatim_shas": dropped_shas}

    def kapae(self, turn_key: str, set_aside_mark: str | None = None) -> dict:
        """Set-aside (NOT erase) the AST tally for a gone turn — the structurepalace twin of the KG kapae.

        Find the structure the turn unfolded to (via the O(1) reverse-index) and retract its tally
        (drop the turn's provenance line, decrement `count`, tombstone-at-zero) via the shared
        {@link _retract_turn_from}. Idempotent: a 2nd kapae finds the line already gone → a no-op.
        Returns the verbatim_shas dropped (so the salience producer can down-weight exactly those
        drawers) + whether the entry tombstoned.
        """
        empty = {"closed": 0, "tombstoned": [], "verbatim_shas": [], "turn_key": turn_key}
        if not turn_key:
            return empty
        # PURITY: the set-aside marker stays PURE logical — the caller's mark, else the turn_key handle;
        # NEVER the unreliable sighting (kapae is a worldline rewind; the tombstone must not carry host-time).
        set_aside_mark = set_aside_mark or turn_key
        structural_hash = self._index.lookup(turn_key)
        if not structural_hash:
            return empty
        res = self._retract_turn_from(structural_hash, turn_key, set_aside_mark)
        return {**res, "turn_key": turn_key}


# --- the OPS this holder declares (its #has-stack made literal) -------------
# Each op is a handler(req) -> result, bound to one open store. The shared
# make_dispatch wraps them in the NDJSON {id, ok, result|error} envelope.


def _build_ops(store: StructurePalaceStore) -> dict:
    return {
        "ping": lambda req: {"ready": True},
        "put": lambda req: store.put(
            req["hash"], req["ast"], req.get("source_file", ""), req.get("verbatim_sha", ""),
            req.get("turn_key", ""),
        ),
        "get": lambda req: store.get(req["hash"]),
        "query": lambda req: store.query(req.get("query", ""), int(req.get("k", req.get("n_results", 8)))),
        "entry_for_cid": lambda req: store.entry_for_cid(req.get("cid", "")),
        "kapae": lambda req: store.kapae(req["turn_key"], req.get("set_aside_mark")),
    }


def _serve_loop(store: StructurePalaceStore, in_fd: int, out) -> None:
    """Wire this holder's ops into the shared NDJSON serve-loop cap (raw-fd read +
    idle-reap). The TTL reads fresh from the env so a test/operator can override it."""
    serve_loop(make_dispatch(_build_ops(store)), in_fd, out, idle_ttl=_idle_ttl_seconds())


def _serve(palace_path: str) -> None:
    # Compose: the serve root acquires the per-palace singleton BEFORE build_dispatch
    # opens the ChromaDB collection, so a refused second holder never opens a client
    # to fight the per-palace mine lock (the reap-don't-pile invariant, OS-enforced).
    run_holder(
        palace=palace_path,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=lambda: make_dispatch(_build_ops(StructurePalaceStore(palace_path))),
        idle_ttl=_idle_ttl_seconds(),
        singleton_msg="structurepalace_io: another holder already serves this palace; exiting (singleton)\n",
    )


# ── The STRUCTURE-PLANE READER — the batch readback the FFZ Measure servo joins ──────
#
# Mirrors `loci_io.py cmd_form_embeddings` (the FORM plane), one tier up: the FORM store
# keys an entry BY the verbatim_sha (one vector per turn), so its readback is a 1:1 dump.
# The structurepalace keys by STRUCTURAL HASH with a recurrence tally, and ONE structure may have
# unfolded from MANY turns (its `lar_provenance` list of verbatim_shas). So this reader
# EXPANDS each live entry across its provenance: one NDJSON row per (verbatim_sha) carrying
# that structure's vector. The orchestrator joins each content drawer's verbatim_sha against
# this map (the 3rd quorum plane), exactly as it joins the form map. Tombstoned (kapae'd-to-
# zero) entries are SKIPPED — set-aside structures feed no plane. Read-only — never a write.
#
# A missing/empty structurepalace yields no rows ⇒ the orchestrator degrades to content (+form),
# the same graceful path the absent form collection takes.

def _default_structurepalace_dir() -> str:
    """The canonical structure plane — `<abide>/sensoriums/memory/structure`, where `<abide>` resolves the
    SAME rule the TS `larariumDataHome()` (xdg-base.ts) holds: `LAR_ROOT/abide` for isolated instances,
    else `$XDG_DATA_HOME/lararium` (unset → `~/.local/share/lararium`). A sensorium abides in the shrine,
    so both tongues must name the shrine or capture writes one dir while recall reads another — the
    write-only-store disease. The two views stay byte-identical, guarded by
    test_structure_default_mirrors_xdg. A caller still passes `--palace` (designation carries the
    authority); this default only keeps an unpassed holder landing true."""
    from sensorium import _lararium_data_home   # local: keeps this module's import graph acyclic

    abide_home = _lararium_data_home()
    return os.path.join(abide_home, "sensoriums", "memory", "structure")


def _structure_embeddings(palace_path: str, out) -> int:
    """Dump the live structure vectors FLAT, one NDJSON row per (verbatim_sha):
      {id: <structural_hash>, embedding: [...], verbatim_sha: V}
    `id` carries the structure's hash (informational); the JOIN key is `verbatim_sha`. A
    tombstoned structure is skipped. Returns the row count."""
    try:
        col = get_collection(palace_path, _skip_identity_check=True)
    except Exception as exc:  # noqa: BLE001 — no structurepalace yet ⇒ 0 rows (graceful degrade)
        sys.stderr.write(f"structure-embeddings: no structurepalace ({type(exc).__name__}: {exc}) — 0 rows\n")
        return 0
    rows = read_stored_embeddings(
        col, {"provenance": "lar_provenance", "tombstoned": "lar_tombstoned"}
    )
    written = 0
    for r in rows:
        if r.get("tombstoned"):
            continue  # set-aside structure — feeds no plane
        try:
            provenance = json.loads(r.get("provenance") or "[]")
        except (ValueError, TypeError):
            provenance = []
        emb = r["embedding"]
        seen: set[str] = set()
        for p in provenance:
            sha = p.get("verbatim_sha") if isinstance(p, dict) else None
            if not sha or sha in seen:
                continue
            seen.add(sha)
            out.write(json.dumps({"id": r["id"], "embedding": emb, "verbatim_sha": sha}) + "\n")
            written += 1
    return written


def cmd_structure_embeddings(args) -> None:
    palace_path = args.palace or _default_structurepalace_dir()
    written = _structure_embeddings(palace_path, sys.stdout)
    sys.stderr.write(f"read {written} structure-vector rows from the structurepalace at {palace_path}\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="structurepalace I/O (the .structurepalace mempalace-instance holder)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON RPC holder for one .structurepalace palace dir")
    s.add_argument("--palace", required=True)
    s.set_defaults(fn=lambda a: _serve(a.palace))
    se = sub.add_parser(
        "structure-embeddings",
        help="batch readback of structure vectors keyed by verbatim_sha (the FFZ 3rd plane)",
    )
    se.add_argument("--palace", default="", help="the structure plane dir (default: <abide>/sensoriums/memory/structure)")
    se.set_defaults(fn=cmd_structure_embeddings)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
