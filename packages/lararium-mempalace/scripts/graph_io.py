#!/usr/bin/env python3
"""graph_io — CONSUME mempalace's structure/graph meta-model (palace_graph + hallways) over the
lararium's OWNED content palace. Entity-pair HALLWAYS (co-occurrence), cross-wing TUNNELS, room
TRAVERSAL, and graph STATS — the organizational recall layer that reads the `wing`/`entities`/`room`
metadata our meta-model consume stamps. Their graph code behind the causal-island boundary,
upstream-tracked; NO LLM. Read functions take the collection directly (`col=`); the collection is our
content palace's (caller-vector, skip-identity), so no config/env coupling.

Protocol — NDJSON: ping · stats · build · hallways · list_hallways · traverse · find_tunnels.
Run under the mempalace interpreter:
  PYTHONPATH=<repo>/mempalace  ~/.venv/bin/python3 graph_io.py serve --palace <owned-content-dir>
"""
from __future__ import annotations

import argparse

from mempalace.palace import get_collection
from mempalace.palace_graph import build_graph, find_tunnels, graph_stats, traverse
from mempalace.hallways import compute_hallways_for_wing, list_hallways

from sidecar_caps import idle_ttl_seconds, make_dispatch, run_sidecar

IDLE_TTL_ENV = "GRAPH_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0
_LOCK_PREFIX = "graph_serve"


class Graph:
    """CONSUME palace_graph + hallways over one content palace collection (caller-vector, skip-id)."""

    def __init__(self, palace_path: str) -> None:
        self._col = get_collection(palace_path, create=True, _skip_identity_check=True)

    def stats(self) -> dict:
        return graph_stats(col=self._col)

    def build(self) -> dict:
        nodes, edges = build_graph(col=self._col)
        return {"nodes": nodes, "edges": edges}

    def hallways(self, wing: str, min_count: int = 2) -> list:
        # entity-pair co-occurrence for a wing (reads `entities` + `wing`; persists hallways.json).
        return compute_hallways_for_wing(wing, col=self._col, min_count=min_count)

    def list_hallways(self, wing=None) -> list:
        return list_hallways(wing)

    def traverse(self, start_room: str, max_hops: int = 2) -> dict:
        return traverse(start_room, col=self._col, max_hops=max_hops)

    def find_tunnels(self, wing_a=None, wing_b=None) -> list:
        return find_tunnels(wing_a, wing_b, col=self._col)


def _build_ops(g: Graph) -> dict:
    return {
        "ping": lambda req: {"ready": True},
        "stats": lambda req: g.stats(),
        "build": lambda req: g.build(),
        "hallways": lambda req: g.hallways(req["wing"], int(req.get("min_count", 2))),
        "list_hallways": lambda req: g.list_hallways(req.get("wing")),
        "traverse": lambda req: g.traverse(req["start_room"], int(req.get("max_hops", 2))),
        "find_tunnels": lambda req: g.find_tunnels(req.get("wing_a"), req.get("wing_b")),
    }


def _serve(palace_path: str) -> None:
    run_sidecar(
        palace=palace_path,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=lambda: make_dispatch(_build_ops(Graph(palace_path))),
        idle_ttl=idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS),
        singleton_msg="graph_io: another holder already serves this palace graph; exiting (singleton)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="graph I/O — CONSUME mempalace palace_graph + hallways over the owned palace")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON graph holder for one palace dir")
    s.add_argument("--palace", required=True)
    s.set_defaults(fn=lambda a: _serve(a.palace))
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
