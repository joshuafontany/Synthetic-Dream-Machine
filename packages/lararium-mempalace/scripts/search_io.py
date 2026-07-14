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

    def search(self, query: str, k: int = 8, wing=None, room=None, source_file=None,
               max_distance: float = 0.0, not_root: "str | None" = None,
               self_weight: float = 0.0, self_horizon: "int | None" = None) -> dict:
        """Recall, with the caller's OWN stream discounted rather than cut.

        WHY THE LIVE STREAM CROWDS RECALL OUT. The capture engine files a session's turns as they happen, so
        the most semantically similar thing to a question about what was just discussed IS what was just
        discussed. Measured on this store: one session held 1024 of 3000 sampled drawers — 34% of the corpus,
        answering every query in its own voice. That is ORIGINAL ANTIGENIC SIN, and its symptom is a recall
        that comes back FAST and CONFIDENT, which reads as health. The incumbent eats the evidence.

        WHY A GRADIENT AND NOT A CUT. A long session COMPACTS: its early turns leave the caller's window and
        become genuinely absent — exactly the memory recall exists to fetch. Excluding a whole session throws
        those away with the recent ones. What is worthless is only the stream STILL IN THE WINDOW.

        `self_weight` ∈ [0,1] scales the similarity of same-root drawers: 1.0 restores them whole, 0.0 drops
        them entirely (the blunt cut), and anything between DISCOUNTS them so that an older same-session
        memory can still outrank a weak foreign one. The operator turns it; nothing here picks it.

        THE HORIZON — distance, spoken as a fact the caller holds. The honest axis is DISTANCE IN THE
        WORLDLINE: what decides whether the caller already holds a turn is how far back it sits, never mere
        session identity. Capture now stamps `lar_turn_ordinal` (the producer-given position; the dedup
        pseudo-chunk never stamps), and the CALLER names its own window edge: `self_horizon` = "I still hold
        everything at or after this ordinal." A same-root hit AT/AFTER the horizon rides the discount (in-
        window waste); a same-root hit BEFORE it reads GENUINELY ABSENT and keeps FULL weight — those turns
        are exactly what recall exists to fetch. No decay curve, no tuned window: the horizon is a fact, not
        a knob. A same-root hit carrying no ordinal (pre-stamp drawers, forked pseudo-chunks) degrades
        honestly to the blanket discount rather than guessing a distance.
        """
        over = k * 4 if (not_root and self_weight < 1.0) else k
        res = search_memories(
            query,
            self._palace,
            wing=wing,
            room=room,
            source_file=source_file,
            n_results=over,
            max_distance=max_distance,
        )
        if not not_root or self_weight >= 1.0:
            return res

        hits = res.get("results") or []
        discounted, dropped = [], 0
        for h in hits:
            meta = h.get("metadata") or {}
            root = str(meta.get("lar_root_handle") or h.get("lar_root_handle") or "")
            if root and root.startswith(not_root):
                ordinal = meta.get("lar_turn_ordinal")
                if self_horizon is not None and isinstance(ordinal, (int, float)) and ordinal < self_horizon:
                    # behind the caller's horizon: compacted out of the window, genuinely
                    # absent — full weight; this is the memory recall exists to fetch.
                    discounted.append(h)
                    continue
                if self_weight <= 0.0:
                    dropped += 1
                    continue
                h = dict(h)
                h["similarity"] = float(h.get("similarity") or 0.0) * self_weight
                h["self_discounted"] = True      # a discounted hit says so; a silent thumb on the scale lies
                discounted.append(h)
            else:
                discounted.append(h)

        # Re-rank AFTER the discount — a penalty applied without re-sorting changes a number and not an order,
        # which is the shape of an instrument that reports a fix it did not perform.
        discounted.sort(key=lambda x: float(x.get("similarity") or 0.0), reverse=True)
        res["results"] = discounted[:k]
        res["dropped_self"] = dropped
        res["self_weight"] = self_weight
        return res


def _build_ops(s: Searcher) -> dict:
    return {
        "ping": lambda req: {"ready": True},
        "search": lambda req: s.search(
            req["query"], int(req.get("k", 8)),
            req.get("wing"), req.get("room"), req.get("source_file"),
            float(req.get("max_distance", 0.0)),
            req.get("not_root"),
            float(req.get("self_weight", 0.0)),
            int(req["self_horizon"]) if req.get("self_horizon") is not None else None,
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
