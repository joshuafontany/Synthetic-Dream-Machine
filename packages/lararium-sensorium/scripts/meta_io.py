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
import json
import os

# CONSUME the vendored heuristic extractors (no LLM). Private `_extract_entities_for_metadata` is the
# callable the miner uses for the `entities` drawer field; we accept their API and it flows in on merge.
from mempalace.miner import _extract_entities_for_metadata, detect_hall

# The conversation topic-detector — a pure content→room, session-scoped by origin. Seeds `room`;
# the operator's wiki-tuned taxonomy supersedes it (bridged the same way `detect_hall` bridges above).
from mempalace.convo_miner import detect_convo_room

from holder_caps import idle_ttl_seconds, make_dispatch, run_holder

IDLE_TTL_ENV = "META_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0
ANNOTATORS_ENV = "META_ANNOTATORS"


def _meta_config_path() -> str:
    """The house meta-schema file — `<config-home>/meta.json`. Mirrors the vessel's `larConfigHome`
    (`LAR_ROOT/config`, else `$XDG_CONFIG_HOME/lares`, else `~/.config/lares`); the `lares sense meta`
    verb writes it, this holder reads it. Kept in lockstep with vessel-paths.ts `larConfigHome`."""
    root = os.environ.get("LAR_ROOT")
    if root:
        return os.path.join(root, "config", "meta.json")
    base = os.environ.get("XDG_CONFIG_HOME", "").strip() or os.path.join(os.path.expanduser("~"), ".config")
    return os.path.join(base, "lares", "meta.json")


_config_cache: dict = {}
_config_mtime: float = -1.0


def _load_meta_config() -> dict:
    """The house meta-schema (enabled annotators + room taxonomy), or {} when absent or unreadable.
    mtime-gated so a `sense meta` edit lands on the next annotate without a holder restart (the
    known-entities pattern). A corrupt file degrades to {} — it never sinks the capture."""
    global _config_cache, _config_mtime
    path = _meta_config_path()
    try:
        mtime = os.path.getmtime(path)
    except OSError:
        _config_cache, _config_mtime = {}, -1.0
        return _config_cache
    if mtime != _config_mtime:
        try:
            with open(path, encoding="utf-8") as fh:
                loaded = json.load(fh)
            _config_cache = loaded if isinstance(loaded, dict) else {}
        except (OSError, ValueError):
            _config_cache = {}
        _config_mtime = mtime
    return _config_cache


def _safe(fn, text: str) -> str:
    """Run a heuristic extractor; degrade to "" rather than sink the capture."""
    try:
        return fn(text) or ""
    except Exception:  # noqa: BLE001 — structuring metadata rides best-effort, never fatal to a turn
        return ""


def _score_taxonomy(text: str, taxonomy: dict) -> str:
    """Route content to the highest-scoring room by keyword hits — the shape `detect_hall` and
    `detect_convo_room` share, turned on the operator's own tuned taxonomy."""
    lowered = text[:3000].lower()
    scores = {}
    for room, keywords in taxonomy.items():
        if not isinstance(keywords, list):
            continue
        score = sum(1 for kw in keywords if isinstance(kw, str) and kw and kw.lower() in lowered)
        if score > 0:
            scores[room] = score
    return max(scores, key=scores.get) if scores else "general"


def _detect_room(text: str) -> str:
    """The room bucket: the operator's CLI/wiki-tuned taxonomy when the house config carries one, else
    the proven `detect_convo_room` seed. The tuned taxonomy supersedes the seed the moment it lands."""
    taxonomy = _load_meta_config().get("room_taxonomy")
    if isinstance(taxonomy, dict) and taxonomy:
        return _score_taxonomy(text, taxonomy)
    return detect_convo_room(text)


# The named annotator capabilities — each maps content → one metadata value. A sensorium COMPOSES the
# set it wants: `entities` + `hall` carry the structural unlock everywhere; `room` (the session topic
# bucket) turns on optionally, and any text-corpus sensorium may enable it with its own tuned taxonomy.
# The names stay stable across the isomorphic faces (sense · MCP · VM) so one toggle reads the same.
ANNOTATORS = {
    "entities": lambda text: _safe(_extract_entities_for_metadata, text),
    "hall": lambda text: _safe(detect_hall, text),
    "room": lambda text: _safe(_detect_room, text),
}

# The full capability set the memory sensorium composes; other sensoria restrict or extend it.
DEFAULT_ANNOTATORS = ("entities", "hall", "room")


def _resolve_annotators(names=None) -> tuple:
    """The enabled annotator names — an explicit list, else the `META_ANNOTATORS` env, else the house
    config's set, else the full default. Unknown names drop, so a sensorium never crashes on a stale
    capability name."""
    if names is None:
        env = os.environ.get(ANNOTATORS_ENV, "").strip()
        if env:
            names = [n.strip() for n in env.split(",") if n.strip()]
        else:
            cfg = _load_meta_config().get("annotators")
            names = list(cfg) if isinstance(cfg, list) and cfg else list(DEFAULT_ANNOTATORS)
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
    run_holder(
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
