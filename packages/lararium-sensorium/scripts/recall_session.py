#!/usr/bin/env python3
"""recall_session — the sovereign RECALL holder: a serialized READ pipe running the ONE coordinator's
#has-composed combined-arms recall over one sensorium root.

The daemon routes `recall` HERE (coordinator only); the machine-code — embed · search · fuse · #has-compose
— stays Python in LaresCoordinator. A READ holder with its OWN lock-prefix (distinct from the capture WRITE
holder), so a concurrent re-pour never blocks a recall (the single-writer law holds; readers ride beside it).
Isomorphic: the SAME LaresCoordinator the MCP surface calls answers this daemon-routed pipe — one
verb-router, thin skins, the guest mempalace client nowhere in the sovereign path.

Meme: lar:///ha.ka.ba/lares/sensorium/recall-holder
"""
from __future__ import annotations

import argparse
import inspect

from lares_mcp import LaresCoordinator
from sensorium import sensorium_paths
from holder_caps import idle_ttl_seconds, make_dispatch, run_holder

_LOCK_PREFIX = "recall_session_serve"

# The recall filter-set is declared ONCE — on LaresCoordinator.recall. The holder forwards whatever the
# API accepts and re-declares NOTHING: a new filter (a new stratum axis, a new mode) needs zero change
# here. query/k ride positionally; every other recall param forwards by name when the request carries it
# (a bool-typed param coerces from truthiness). This is the collapse — 2 surfaces, 1 API, one source.
_RECALL_KWARGS = {name: p for name, p in inspect.signature(LaresCoordinator.recall).parameters.items()
                  if name not in ("self", "query", "k")}


class RecallServer:
    """One warm coordinator over one sensorium palace — the #has-composed recall engine, served read-only.

    The daemon sends only the query + read args; this holder owns the embedder, the content store, the
    manifest #has read, and the recall-surface fusion. TypeScript never embeds or fuses."""

    def __init__(self, sensorium_root: str, wing: str = "wing_default") -> None:
        self._paths = sensorium_paths(sensorium_root)
        self._coord = LaresCoordinator(sensorium_root, wing=wing)

    def recall(self, req: dict) -> dict:
        """Combined-arms recall over the sensorium's #has stack — content-vector ⊕ mempalace projection,
        RRF-fused, resolved verbatim from content. `imago` fetches one entry; `list` reports the taxonomy.

        The daemon recall verb + CLI read the `{results:[{text,similarity,wing,room,cid}]}` shape, so the
        search face MAPS the coordinator's `matches` into it (imago/list pass through unchanged). This is
        the one adaptation the read-holder owns — the coordinator stays the pure engine. The holder forwards
        every recall arg the API accepts (below), re-declaring no filter of its own."""
        imago = req.get("imago") or None
        as_list = bool(req.get("list"))
        # Forward every recall param the request carries — the API signature is the single source of truth.
        kwargs = {}
        for name, p in _RECALL_KWARGS.items():
            if name not in req:
                continue
            if isinstance(p.default, bool):
                kwargs[name] = bool(req[name])
            elif req[name] not in (None, ""):
                kwargs[name] = req[name]
        out = self._coord.recall(str(req.get("query") or ""),
                                 int(req.get("k") or req.get("limit") or 8), **kwargs)
        if imago or as_list or "exchanges" in out:
            return out                                    # imago entry / taxonomy / paired exchanges — pass through
        results = []
        for m in out.get("matches", []):
            meta = m.get("metadata") or {}
            dist = m.get("distance")
            results.append({
                "cid": m.get("cid"),
                "text": m.get("document") or "",
                "wing": meta.get("wing"),
                "room": meta.get("room"),
                "similarity": (1.0 - dist) if isinstance(dist, (int, float)) else None,
            })
        return {"query": str(req.get("query") or ""), "results": results,
                **({"surfaces": out["surfaces"]} if "surfaces" in out else {}),
                **({"scanned": out["scanned"]} if "scanned" in out else {}),
                **({"matched": out["matched"]} if "matched" in out else {})}

    def status(self, _req: dict) -> dict:
        return self._coord.status()


def _serve(sensorium_root: str, wing: str = "wing_default") -> None:
    """Serve one serialized read pipe over NDJSON stdio — recall + status, the coordinator's read face."""
    server = RecallServer(sensorium_root, wing=wing)
    run_holder(
        palace=server._paths.content,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=lambda: make_dispatch({
            "ping": lambda _r: {"ready": True},
            "recall": server.recall,
            "status": server.status,
        }),
        idle_ttl=idle_ttl_seconds("LARES_RECALL_IDLE_TTL", 600.0),
        singleton_msg="recall_session: another holder already serves this palace; exiting (singleton)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="recall_session — the sovereign #has-composed recall holder")
    ap.add_argument("--sensorium", required=True, help="the sensorium root; content/ + mempalace/ derive beneath it")
    ap.add_argument("--wing", default="wing_default")
    ap.add_argument("--serve", action="store_true", help="run the serialized read pipe")
    a = ap.parse_args()
    if not a.serve:
        ap.error("recall_session runs as --serve")
    _serve(a.sensorium, wing=a.wing)


if __name__ == "__main__":
    main()
