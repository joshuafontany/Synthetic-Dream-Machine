#!/usr/bin/env python3
"""meta_io — CONSUME mempalace's ingest meta-model extractors (heuristic, NO LLM) so the lares
content palace is STRUCTURED, not flat. Per-turn it derives the `entities` metadata (the key unlock:
hallways, entity-tunnels, closet-boost, and wing/room-entity filters in the consumed search + graph
all read it) + the `hall` routing. Their extraction code behind the causal-island boundary, tunable
in-house (the knobs — freq floor, entity window, hall keywords — are theirs to pass, ours to iterate).
Palace-less pure transform (like embed_io): no store, no lock, the config loads once per holder.

Protocol — NDJSON:
    -> {"id":1,"op":"ping"}
    -> {"id":2,"op":"annotate","content":"Joshua built the Lares node with Bob today"}
       <- {"id":2,"ok":true,"result":{"entities":"joshua;bob;lares","hall":"..."}}

Run under the mempalace interpreter:
  PYTHONPATH=<repo>/mempalace  ~/.venv/bin/python3 meta_io.py serve
"""
from __future__ import annotations

import argparse

# CONSUME the vendored heuristic extractors (no LLM). Private `_extract_entities_for_metadata` is the
# callable the miner uses for the `entities` drawer field; we accept their API and it flows in on merge.
from mempalace.miner import _extract_entities_for_metadata, detect_hall

from sidecar_caps import idle_ttl_seconds, make_dispatch, run_sidecar

IDLE_TTL_ENV = "META_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0


class MetaModel:
    """CONSUME the ingest meta-model: content → the structuring metadata (entities + hall). Heuristic,
    no LLM; degrades to freq≥2 caps when no known-entity registry is configured."""

    def annotate(self, content: str) -> dict:
        text = content or ""
        try:
            entities = _extract_entities_for_metadata(text) or ""
        except Exception:  # noqa: BLE001 — extraction is best-effort structure, never sink the capture
            entities = ""
        try:
            hall = detect_hall(text) or ""
        except Exception:  # noqa: BLE001
            hall = ""
        return {"entities": entities, "hall": hall}


def _build_ops(m: MetaModel) -> dict:
    return {
        "ping": lambda req: {"ready": True},
        "annotate": lambda req: m.annotate(req.get("content", "")),
    }


def _serve() -> None:
    run_sidecar(
        palace=None,   # palace-less: pure transform, the config is the only resource
        lock_prefix="meta_serve",
        build_dispatch=lambda: make_dispatch(_build_ops(MetaModel())),
        idle_ttl=idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS),
        singleton_msg="meta_io: palace-less holder (no singleton lock)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="meta I/O — CONSUME mempalace's heuristic ingest meta-model (entities + hall)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON meta-model holder")
    s.set_defaults(fn=lambda a: _serve())
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
