#!/usr/bin/env python3
"""content_io — the substrate side of a CONTENT store (the Li-triple's content plane) for
NON-MEMORY targeted content: arbitrary target corpora (Twain · TiddlyWiki5 · the Kumulipo ·
Discordian Catma · any ingest target) that are NOT the operator's session-memory (the mempalace).

Caller-vector by design — uniform with structurepalace_io / persistence_io (skip-identity, the
embedding arrives ON the wire, no model load) — so it composes the SHARED sidecar_caps serve
foundation AND fits the parallel-ingest single-writer split (embed fans out upstream; this commits
the caller's vector). The text rides the `document` slot; the caller's dense vector is the embedding.

Protocol — NDJSON over stdin/stdout, one JSON object per line (only JSON to stdout):

    -> {"id":1,"op":"ping"}
    <- {"id":1,"ok":true,"result":{"ready":true}}

    -> {"id":2,"op":"put","cid":C,"text":"…","embedding":[...],"metadata":{...}}
    <- {"id":2,"ok":true,"result":{"cid":C}}

    -> {"id":3,"op":"get","cid":C}
    <- {"id":3,"ok":true,"result":{ <ContentEntry> | null }}

    -> {"id":4,"op":"search","embedding":[...],"k":8,"where":{...}}
    <- {"id":4,"ok":true,"result":{"matches":[{cid,distance,metadata},…]}}

Run with the mempalace CLI's interpreter (it has the package + chroma):
  PYTHONPATH=<repo>/mempalace  ~/.venv/bin/python3 content_io.py serve --palace ~/.lares/.content/<target>
"""
from __future__ import annotations

import argparse
import json
import sys

from mempalace.palace import get_collection

from sidecar_caps import (
    idle_ttl_seconds,
    make_dispatch,
    mine_busy_retry,
    run_sidecar,
)

IDLE_TTL_ENV = "CONTENT_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0
_LOCK_PREFIX = "content_serve"


def _idle_ttl_seconds() -> float:
    return idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS)


class ContentStore:
    """One open CONTENT collection: put a caller-vector content record (text=document,
    caller-supplied embedding) + get by cid + nearest-neighbor search. Caller-vector
    (skip-identity — the embedder never runs here); the ingest pipeline supplies the vector."""

    def __init__(self, palace_path: str) -> None:
        self._col = get_collection(palace_path, create=True, _skip_identity_check=True)

    def _get_raw(self, cid: str) -> "dict | None":
        got = self._col.get(ids=[cid], include=["documents", "metadatas"])
        ids = got.get("ids") or []
        if not ids:
            return None
        docs = got.get("documents") or [None]
        metas = got.get("metadatas") or [None]
        return {"cid": ids[0], "document": docs[0], "metadata": metas[0] or {}}

    def get(self, cid: str) -> "dict | None":
        raw = self._get_raw(cid)
        if raw is None:
            return None
        return {"cid": raw["cid"], "document": raw["document"] or "", "metadata": raw["metadata"]}

    def put(self, cid: str, text: str, embedding: list, metadata: dict) -> dict:
        # Idempotent on the cid (a content-hash or a stable target id): a re-put overwrites. The
        # backend upsert self-takes the palace flock (mine_palace_lock) — hardened — but the flock is
        # LOCK_NB and RAISES on contention; mine_busy_retry WAITS out a concurrent mempalace write.
        mine_busy_retry(lambda: self._col.upsert(ids=[cid], documents=[text], embeddings=[embedding], metadatas=[metadata or {}]))
        return {"cid": cid}

    def search(self, embedding: list, k: int = 8, where: "dict | None" = None) -> dict:
        try:
            n = self._col.count()
        except Exception:  # noqa: BLE001 — fresh/empty collection
            n = 0
        if n == 0:
            return {"matches": []}
        got = self._col.query(
            query_embeddings=[embedding], n_results=min(k, n),
            include=["distances", "metadatas", "documents"],
            **({"where": where} if where else {}),
        )
        ids = (got.get("ids") or [[]])[0]
        dists = (got.get("distances") or [[]])[0]
        metas = (got.get("metadatas") or [[]])[0]
        docs = (got.get("documents") or [[]])[0]
        matches = [
            {
                "cid": ids[i],
                "distance": dists[i] if i < len(dists) else None,
                "document": docs[i] if i < len(docs) else "",
                "metadata": metas[i] or {},
            }
            for i in range(len(ids))
        ]
        return {"matches": matches}

    def scan(self, offset: int = 0, limit: int = 256) -> dict:
        """Read a PAGE of records WITH their embeddings — the guest-import read leg. Copies a
        source store (a mine-built or caller-vector collection) into another store-compatibly: the
        embeddings ride out so the target `put`s them verbatim (no re-embed, no drift). `next` is the
        offset to resume from, or null when the page ran short (the scan is drained)."""
        try:
            n = self._col.count()
        except Exception:  # noqa: BLE001 — fresh/empty collection
            n = 0
        if offset >= n:
            return {"records": [], "next": None, "total": n}
        got = self._col.get(
            limit=limit, offset=offset,
            include=["documents", "metadatas", "embeddings"],
        )
        ids = got.get("ids") or []
        docs = got.get("documents") or []
        embs = got.get("embeddings")
        metas = got.get("metadatas") or []
        records = [
            {
                "cid": ids[i],
                "document": docs[i] if i < len(docs) else "",
                "embedding": [float(x) for x in embs[i]] if embs is not None and i < len(embs) else None,
                "metadata": metas[i] or {},
            }
            for i in range(len(ids))
        ]
        nxt = offset + len(ids)
        return {"records": records, "next": (nxt if nxt < n else None), "total": n}


def _build_ops(store: ContentStore) -> dict:
    return {
        "ping": lambda req: {"ready": True},
        "put": lambda req: store.put(req["cid"], req.get("text", ""), req["embedding"], req.get("metadata", {})),
        "get": lambda req: store.get(req["cid"]),
        "search": lambda req: store.search(req["embedding"], int(req.get("k", 8)), req.get("where")),
        "scan": lambda req: store.scan(int(req.get("offset", 0)), int(req.get("limit", 256))),
    }


def _serve(palace_path: str) -> None:
    run_sidecar(
        palace=palace_path,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=lambda: make_dispatch(_build_ops(ContentStore(palace_path))),
        idle_ttl=_idle_ttl_seconds(),
        singleton_msg="content_io: another holder already serves this palace; exiting (singleton)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="content I/O (a caller-vector CONTENT store holder — non-memory targeted content)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON RPC holder for one content palace dir")
    s.add_argument("--palace", required=True)
    s.set_defaults(fn=lambda a: _serve(a.palace))
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
