#!/usr/bin/env python3
"""astpalace_io — the substrate side of the `.astpalace` memory-ast-unfolding palace.

A SECOND mempalace instance (the same ChromaDB engine, a separate palace dir) that
holds the per-turn parse-tree AST, keyed by its STRUCTURAL HASH (sha256 of the
canonical-JSON of the tree). Twin to the verbatim palace (`~/.mempalace`) and to
`.meshpalace`; it NEVER federates on the mesh — local, content-addressed, the eidetic
↔ semantic bridge.

The binding is CODE-LEVEL, navigable BOTH ways:
  - the verbatim drawer (in the verbatim palace) carries `lar_ast_hash`  → this entry's id
  - this entry carries `verbatim_sha` + `source_file`                    → that drawer

This helper is the SOLE holder of the `.astpalace` PersistentClient for its palace dir
(one process, lazily spawned, reused) — the reap-don't-pile invariant: never two holders
fighting the per-palace mine lock. The TS `makeAstPalace` keys a singleton on the
canonical palace dir so a second `put` reuses this one process instead of spawning a pile.

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
    <- {"id":3,"ok":true,"result":{ <AstEntry> | null }}

    -> {"id":4,"op":"kapae","turn_key":K,"ended":T}
    <- {"id":4,"ok":true,"result":{"closed":N,"tombstoned":[H,…],"verbatim_shas":[V,…],"turn_key":K}}

KAPAE (rewind = set-aside, never erase) — the astpalace twin of the worldline KG kapae.
Keyed by the USER turn's uuid (turn_key), which `put` threads into every provenance entry. A
gone turn drops its provenance line and decrements `count`; an entry whose count falls to ≤0 is
TOMBSTONED (`lar_tombstoned_at` stamped, the chroma row KEPT, excluded from recall) rather than
deleted (history preserved). Idempotent: a 2nd kapae for the same uuid finds the line already
gone → a no-op. A small sqlite reverse-index (`turnkey_index.sqlite3`, beside the chroma store —
mirrors kg_io's raw-sqlite-beside-chroma idiom) keeps the turn_key → structural_hash lookup O(1),
since chroma cannot where-filter inside a JSON provenance list.

Run with the mempalace CLI's interpreter (it has the package + chroma):
  PYTHONPATH=<repo>/mempalace  ~/.venv/bin/python3 astpalace_io.py serve --palace ~/.lares/.astpalace
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3

from mempalace.palace import get_collection

# The serve cap-stack this sidecar #has — flock-singleton · idle-reap · NDJSON
# serve-loop · ops-dispatch · the serve composition root — composed from the shared
# foundation, NOT inherited. The thin module-level aliases below keep this sidecar's
# names (`_acquire_serve_lock`, `_serve_loop`, `_fcntl`, …) stable for its tests.
from sidecar_caps import (
    _fcntl,
    _select,
    acquire_serve_lock,
    idle_ttl_seconds,
    make_dispatch,
    release_serve_lock,
    run_sidecar,
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
IDLE_TTL_ENV = "ASTPALACE_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0

# The sidecar's identity in the lock namespace — its per-palace singleton prefix.
_LOCK_PREFIX = "astpalace_serve"


def _serve_lock_path(palace_path: str) -> str:
    return serve_lock_path(palace_path, _LOCK_PREFIX)


def _acquire_serve_lock(palace_path: str):
    return acquire_serve_lock(palace_path, _LOCK_PREFIX)


def _release_serve_lock(fh) -> None:
    release_serve_lock(fh)


def _idle_ttl_seconds() -> float:
    return idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS)


# A CHEAP, DETERMINISTIC embedding derived from the structural hash. The `.astpalace`
# is addressed by EXACT id (the structural hash) — we never semantic-search it — so we
# provide our own vectors and NEVER invoke the palace's embedding model (no model load,
# no download, no network). Consistent dimension across every upsert fixes the
# collection's vector dimension to ours; the configured embedding function is left
# attached but never called.
_EMBED_DIM = 16


def _embed(structural_hash: str) -> list[float]:
    """16 floats in [0,1) read straight off the hash hex — constant per structure."""
    h = (structural_hash + "0" * (_EMBED_DIM * 2))[: _EMBED_DIM * 2]
    return [int(h[i * 2 : i * 2 + 2], 16) / 255.0 for i in range(_EMBED_DIM)]


def _now() -> str:
    import datetime

    return datetime.datetime.now(datetime.timezone.utc).isoformat()


# The reverse-index db name — sits BESIDE the chroma store in the palace dir (kg_io's
# raw-sqlite-beside-chroma idiom). Maps turn_key → structural_hash so kapae stays O(1):
# chroma cannot where-filter inside the JSON provenance list.
_TURNKEY_INDEX_DB = "turnkey_index.sqlite3"


class AstPalaceStore:
    """One open `.astpalace` collection; put (recurrence RMW) + get by structural hash + kapae."""

    def __init__(self, palace_path: str) -> None:
        # create-or-open: get_collection(create=True) os.makedirs the dir + creates the
        # collection if absent — this IS the `init` for a fresh palace. Identity check
        # skipped: we never run the embedder, so its recorded identity is irrelevant.
        self._col = get_collection(palace_path, create=True, _skip_identity_check=True)
        # The turn_key → structural_hash reverse-index, beside the chroma store. get_collection
        # already made the palace dir, so the path is safe to open. One row per turn_key (PK);
        # a turn re-put under a new structure overwrites it (the latest structure for that turn).
        self._index_path = os.path.join(palace_path, _TURNKEY_INDEX_DB)
        self._index = sqlite3.connect(self._index_path)
        self._index.execute(
            "CREATE TABLE IF NOT EXISTS turnkey_index (turn_key TEXT PRIMARY KEY, structural_hash TEXT NOT NULL)"
        )
        self._index.commit()

    def _index_put(self, turn_key: str, structural_hash: str) -> None:
        self._index.execute(
            "INSERT INTO turnkey_index (turn_key, structural_hash) VALUES (?, ?) "
            "ON CONFLICT(turn_key) DO UPDATE SET structural_hash=excluded.structural_hash",
            (turn_key, structural_hash),
        )
        self._index.commit()

    def _index_lookup(self, turn_key: str) -> str | None:
        row = self._index.execute(
            "SELECT structural_hash FROM turnkey_index WHERE turn_key=?", (turn_key,)
        ).fetchone()
        return row[0] if row else None

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
            "first_seen": meta.get("first_seen", ""),
            "last_seen": meta.get("last_seen", ""),
            "provenance": provenance,
            # kapae set-aside marker (absent on a live entry); a tombstoned entry keeps its row
            # but its structure no longer counts toward recurrence.
            **({"tombstoned_at": meta["lar_tombstoned_at"]} if meta.get("lar_tombstoned_at") else {}),
        }

    def get(self, structural_hash: str) -> dict | None:
        raw = self._get_raw(structural_hash)
        return self._to_entry(raw) if raw is not None else None

    def put(self, structural_hash: str, ast_json: str, source_file: str, verbatim_sha: str, turn_key: str = "") -> dict:
        now = _now()
        # The provenance line carries the kapae key (the USER turn's uuid) alongside the verbatim
        # join — so a gone turn can drop exactly its line. turn_key may be "" (a put with no turn
        # context, e.g. a backfill); such a line is simply not kapae-addressable.
        link = {"source_file": source_file, "verbatim_sha": verbatim_sha}
        if turn_key:
            link["turn_key"] = turn_key
            # The reverse-index lets kapae find this structure by turn_key in O(1).
            self._index_put(turn_key, structural_hash)
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
                    "last_seen": now,
                    "lar_verbatim_sha": verbatim_sha,
                    "source_file": source_file,
                    "lar_provenance": json.dumps(provenance),
                }
            )
            # Revival: a tombstoned structure that recurs is live again (its turns came back, or a
            # new turn unfolds the same shape). Clear the set-aside marker ("" reads as live).
            if meta.get("lar_tombstoned_at"):
                meta["lar_tombstoned_at"] = ""
            # Recurrence: same structure, same id → upsert (overwrite) the one entry.
            self._col.upsert(
                ids=[structural_hash],
                documents=[ast_json],
                metadatas=[meta],
                embeddings=[_embed(structural_hash)],
            )
            return {"hash": structural_hash, "count": count}

        meta = {
            "kind": "ast",
            "lar_structural_hash": structural_hash,
            "lar_verbatim_sha": verbatim_sha,
            "source_file": source_file,
            "count": 1,
            "first_seen": now,
            "last_seen": now,
            "lar_provenance": json.dumps([link]),
        }
        self._col.upsert(
            ids=[structural_hash],
            documents=[ast_json],
            metadatas=[meta],
            embeddings=[_embed(structural_hash)],
        )
        return {"hash": structural_hash, "count": 1}

    def kapae(self, turn_key: str, ended: str | None = None) -> dict:
        """Set-aside (NOT erase) the AST tally for a gone turn — the astpalace twin of the KG kapae.

        Find the structure the turn unfolded to (via the O(1) reverse-index), drop that turn's
        provenance line, and decrement `count`. When count falls to ≤0 the entry is TOMBSTONED
        (`lar_tombstoned_at` stamped, the chroma row KEPT) rather than deleted — history preserved,
        recall excludes it. Idempotent: a 2nd kapae finds the line already gone → a no-op (the row
        is untouched, nothing re-decremented). Returns the verbatim_shas dropped (so the salience
        producer can down-weight exactly those drawers) + whether the entry tombstoned.
        """
        if not turn_key:
            return {"closed": 0, "tombstoned": [], "verbatim_shas": [], "turn_key": turn_key}
        ended = ended or _now()
        structural_hash = self._index_lookup(turn_key)
        if not structural_hash:
            return {"closed": 0, "tombstoned": [], "verbatim_shas": [], "turn_key": turn_key}
        raw = self._get_raw(structural_hash)
        if raw is None:
            return {"closed": 0, "tombstoned": [], "verbatim_shas": [], "turn_key": turn_key}
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
            # Idempotent no-op: the line is already gone (a 2nd kapae for the same uuid).
            return {"closed": 0, "tombstoned": [], "verbatim_shas": [], "turn_key": turn_key}
        count = int(meta.get("count", 1)) - removed
        meta["count"] = count
        meta["lar_provenance"] = json.dumps(kept)
        tombstoned = []
        if count <= 0:
            meta["lar_tombstoned_at"] = ended
            tombstoned.append(structural_hash)
        # update() (not upsert) — leave the document/embedding untouched; only the metadata moves.
        self._col.update(ids=[structural_hash], metadatas=[meta])
        return {
            "closed": removed,
            "tombstoned": tombstoned,
            "verbatim_shas": dropped_shas,
            "turn_key": turn_key,
        }


# --- the OPS this sidecar declares (its #has-stack made literal) -------------
# Each op is a handler(req) -> result, bound to one open store. The shared
# make_dispatch wraps them in the NDJSON {id, ok, result|error} envelope.


def _build_ops(store: AstPalaceStore) -> dict:
    return {
        "ping": lambda req: {"ready": True},
        "put": lambda req: store.put(
            req["hash"], req["ast"], req.get("source_file", ""), req.get("verbatim_sha", ""),
            req.get("turn_key", ""),
        ),
        "get": lambda req: store.get(req["hash"]),
        "kapae": lambda req: store.kapae(req["turn_key"], req.get("ended")),
    }


def _serve_loop(store: AstPalaceStore, in_fd: int, out) -> None:
    """Wire this sidecar's ops into the shared NDJSON serve-loop cap (raw-fd read +
    idle-reap). The TTL reads fresh from the env so a test/operator can override it."""
    serve_loop(make_dispatch(_build_ops(store)), in_fd, out, idle_ttl=_idle_ttl_seconds())


def _serve(palace_path: str) -> None:
    # Compose: the serve root acquires the per-palace singleton BEFORE build_dispatch
    # opens the ChromaDB collection, so a refused second holder never opens a client
    # to fight the per-palace mine lock (the reap-don't-pile invariant, OS-enforced).
    run_sidecar(
        palace=palace_path,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=lambda: make_dispatch(_build_ops(AstPalaceStore(palace_path))),
        idle_ttl=_idle_ttl_seconds(),
        singleton_msg="astpalace_io: another holder already serves this palace; exiting (singleton)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="astpalace I/O (the .astpalace mempalace-instance holder)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON RPC holder for one .astpalace palace dir")
    s.add_argument("--palace", required=True)
    s.set_defaults(fn=lambda a: _serve(a.palace))
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
