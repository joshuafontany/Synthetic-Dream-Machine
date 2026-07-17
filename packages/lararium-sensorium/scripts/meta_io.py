#!/usr/bin/env python3
"""meta_io — CONSUME mempalace's ingest meta-model extractors (heuristic, NO LLM) so the lares
content palace is STRUCTURED, not flat. Per-turn it derives the `entities` metadata (the key unlock:
hallways, entity-tunnels, closet-boost, and wing/room-entity filters in the consumed search + graph
all read it), the `hall` routing, and the `room` topic bucket. Their extraction code sits behind the
causal-island boundary, tunable in-house (the knobs — freq floor, entity window, hall keywords — flow
in as theirs to pass, ours to iterate).
Palace-less pure transform (like embed_io): no store, no lock, the config loads once per holder.

`room` seeds from the proven conversation topic-detector (session discourse: technical/architecture/
planning/decisions/problems/general). It rides as a PURE derive here; the SESSION caller applies it
(AI-Operator memories only, never corpus), and the operator's wiki-tuned taxonomy overrides the seed.

Protocol — NDJSON:
    -> {"id":1,"op":"ping"}
    -> {"id":2,"op":"annotate","content":"Joshua built the Lares node with Bob today"}
       <- {"id":2,"ok":true,"result":{"entities":"joshua;bob;lares","hall":"...","room":"..."}}

Run under the mempalace interpreter:
  PYTHONPATH=<repo>/mempalace  ~/.venv/bin/python3 meta_io.py serve
"""
from __future__ import annotations

import argparse
import os

# CONSUME the vendored heuristic extractors (no LLM). Private `_extract_entities_for_metadata` is the
# callable the miner uses for the `entities` drawer field; we accept their API and it flows in on merge.
from mempalace.miner import _extract_entities_for_metadata, detect_hall

# The conversation topic-detector — a pure content→room, session-scoped by origin. Seeds `room`;
# the operator's wiki-tuned taxonomy supersedes it (bridged the same way `detect_hall` bridges above).
from mempalace.convo_miner import detect_convo_room

from sidecar_caps import idle_ttl_seconds, make_dispatch, run_sidecar

IDLE_TTL_ENV = "META_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0
ANNOTATORS_ENV = "META_ANNOTATORS"


def _safe(fn, text: str) -> str:
    """Run a heuristic extractor; degrade to "" rather than sink the capture."""
    try:
        return fn(text) or ""
    except Exception:  # noqa: BLE001 — structuring metadata rides best-effort, never fatal to a turn
        return ""


# The named annotator capabilities — each maps content → one metadata value. A sensorium COMPOSES the
# set it wants: `entities` + `hall` carry the structural unlock everywhere; `room` (the session topic
# bucket) turns on optionally, and any text-corpus sensorium may enable it with its own tuned taxonomy.
# The names stay stable across the isomorphic faces (sense · MCP · VM) so one toggle reads the same.
ANNOTATORS = {
    "entities": lambda text: _safe(_extract_entities_for_metadata, text),
    "hall": lambda text: _safe(detect_hall, text),
    "room": lambda text: _safe(detect_convo_room, text),
}

# The full capability set the memory sensorium composes; other sensoria restrict or extend it.
DEFAULT_ANNOTATORS = ("entities", "hall", "room")


def _resolve_annotators(names=None) -> tuple:
    """The enabled annotator names — an explicit list, else the `META_ANNOTATORS` env, else the full
    set. Unknown names drop, so a sensorium never crashes on a stale capability name."""
    if names is None:
        env = os.environ.get(ANNOTATORS_ENV, "").strip()
        names = [n.strip() for n in env.split(",") if n.strip()] if env else list(DEFAULT_ANNOTATORS)
    return tuple(n for n in names if n in ANNOTATORS)


class MetaModel:
    """COMPOSE the ingest meta-model: content → structuring metadata over the ENABLED annotators only.
    Heuristic, no LLM; each capability degrades to "" when its extractor finds nothing. The enabled set
    lifts the whole model into an isomorphic capability a sensorium turns on or off per stream."""

    def __init__(self, annotators=None):
        self._annotators = _resolve_annotators(annotators)

    @property
    def annotators(self) -> tuple:
        return self._annotators

    def annotate(self, content: str) -> dict:
        text = content or ""
        return {name: ANNOTATORS[name](text) for name in self._annotators}


def _build_ops(m: MetaModel) -> dict:
    return {
        "ping": lambda req: {"ready": True},
        "annotate": lambda req: m.annotate(req.get("content", "")),
    }


def _serve(annotators=None) -> None:
    model = MetaModel(annotators)
    run_sidecar(
        palace=None,   # palace-less: pure transform, the config is the only resource
        lock_prefix="meta_serve",
        build_dispatch=lambda: make_dispatch(_build_ops(model)),
        idle_ttl=idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS),
        singleton_msg="meta_io: palace-less holder (no singleton lock)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="meta I/O — CONSUME mempalace's heuristic ingest meta-model (entities + hall + room)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="persistent NDJSON meta-model holder")
    s.add_argument("--annotators", default=None,
                   help="comma-separated enabled capabilities (default: entities,hall,room; env META_ANNOTATORS overrides)")
    s.set_defaults(fn=lambda a: _serve(
        [n.strip() for n in a.annotators.split(",") if n.strip()] if a.annotators else None))
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
