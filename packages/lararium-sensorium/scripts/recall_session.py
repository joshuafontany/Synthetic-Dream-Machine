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

from lares_mcp import LaresCoordinator
from sensorium import sensorium_paths
from sidecar_caps import idle_ttl_seconds, make_dispatch, run_sidecar

_LOCK_PREFIX = "recall_session_serve"


class RecallServer:
    """One warm coordinator over one sensorium palace — the #has-composed recall engine, served read-only.

    The daemon sends only the query + read args; this holder owns the embedder, the content store, the
    manifest #has read, and the recall-surface fusion. TypeScript never embeds or fuses."""

    def __init__(self, sensorium_root: str, wing: str = "wing_default") -> None:
        self._paths = sensorium_paths(sensorium_root)
        self._coord = LaresCoordinator(sensorium_root, wing=wing)

    def recall(self, req: dict) -> dict:
        """Combined-arms recall over the sensorium's #has stack — content-vector ⊕ mempalace projection,
        RRF-fused, resolved verbatim from content. `drawer` fetches one entry; `list` reports the taxonomy.

        The daemon recall verb + CLI read the `{results:[{text,similarity,wing,room,cid}]}` shape, so the
        search face MAPS the coordinator's `matches` into it (drawer/list pass through unchanged). This is
        the one adaptation the read-holder owns — the coordinator stays the pure engine."""
        drawer = req.get("drawer") or None
        as_list = bool(req.get("list"))
        out = self._coord.recall(
            str(req.get("query") or ""),
            int(req.get("k") or req.get("limit") or 8),
            wing=(req.get("wing") or None),
            drawer=drawer,
            list=as_list,
            agent=(req.get("agent") or None),
            surface=(req.get("surface") or None),
            speaker=(req.get("speaker") or None),
            channel=(req.get("channel") or None),
            function=(req.get("function") or None),
        )
        if drawer or as_list:
            return out                                    # drawer entry / taxonomy — pass through
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
    run_sidecar(
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
