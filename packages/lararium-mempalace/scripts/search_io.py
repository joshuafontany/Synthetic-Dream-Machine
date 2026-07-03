#!/usr/bin/env python3
"""search_io — CONSUME mempalace's hybrid search (`searcher.search_memories`) over the lararium's
OWNED content palace. This is lift-as-consume: their search VALUE-ADD — hybrid BM25 + vector re-rank,
metric-aware distance→similarity, wing/room/source where-filtering with a filter-fallback, and a
BM25-only SQLite crash-fallback — called as a library function behind the causal-island boundary, so
upstream search improvements flow back through the submodule (never a fork). It degrades gracefully
on our FLAT palace (no closets/taxonomy → try/except → drawer-only search), and still beats a raw
chroma.query (lexical + robustness). The model loads once per holder (search embeds the query text).

An absent embedder-identity on the caller-vector store only WARNS (mempalace bookkeeping never breaks
memory ops); the stored vectors are same-model-compatible (built by embed_io's consumed embedder), so
the query embedding compares cleanly.

Protocol — NDJSON:
    -> {"id":1,"op":"ping"}
    -> {"id":2,"op":"search","query":"a marine mammal","k":8,"wing":null,"room":null}
       <- {"id":2,"ok":true,"result":{ "query","filters","total_before_filter","results":[...] }}

Run under the mempalace interpreter:
  PYTHONPATH=<repo>/mempalace  ~/.venv/bin/python3 search_io.py serve --palace <owned-content-dir>
"""
from __future__ import annotations

import argparse

from mempalace.searcher import search_memories

from sidecar_caps import idle_ttl_seconds, make_dispatch, run_sidecar

IDLE_TTL_ENV = "SEARCH_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0
_LOCK_PREFIX = "search_serve"


class Searcher:
    """CONSUME search_memories over one palace dir (the default collection — the same one content_io
    writes). The embedding model loads lazily inside search_memories on the first query."""

    def __init__(self, palace_path: str) -> None:
        self._palace = palace_path

    def search(self, query: str, k: int = 8, wing=None, room=None, source_file=None, max_distance: float = 0.0) -> dict:
        return search_memories(
            query,
            self._palace,
            wing=wing,
            room=room,
            source_file=source_file,
            n_results=k,
            max_distance=max_distance,
        )


def _build_ops(s: Searcher) -> dict:
    return {
        "ping": lambda req: {"ready": True},
        "search": lambda req: s.search(
            req["query"], int(req.get("k", 8)),
            req.get("wing"), req.get("room"), req.get("source_file"),
            float(req.get("max_distance", 0.0)),
        ),
    }


def _serve(palace_path: str) -> None:
    run_sidecar(
        palace=palace_path,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=lambda: make_dispatch(_build_ops(Searcher(palace_path))),
        idle_ttl=idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS),
        singleton_msg="search_io: another holder already serves this palace; exiting (singleton)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="search I/O — CONSUME mempalace hybrid search over the owned content palace")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON search holder for one palace dir")
    s.add_argument("--palace", required=True)
    s.set_defaults(fn=lambda a: _serve(a.palace))
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
