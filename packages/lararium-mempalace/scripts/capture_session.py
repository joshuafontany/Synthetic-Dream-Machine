#!/usr/bin/env python3
"""capture_session — the COORDINATOR/DRIVER that takes the capture engine LIVE (the M1 keystone wire).

The engine (capture_stream.Pipeline via sensorium.compose_stream_sensorium) stood DARK: no surface cap
parsed a transcript, nothing drove a pass. This driver composes the whole cap-stack and pulls the
trigger:

    Memory sensorium  =  content_io ContentStore (immutable ground, append-only, wing/room schema floor
                          + embedder-identity floor {dim, model})
                       +  a surface source-cap (capture_sources: claude · codex · copilot SQLite · copilot-vscode)
                       +  the warm embed cap (embed_cap: minilm/384, loaded once)

The DRIVER STAMPS the embedder identity: it reads `(embed_one, model)` off the warm cap, PROBES the
vector dim once, stamps `lar_embedder_model` onto every record's metadata, and pins `expected_dim` /
`expected_model` on the store — so a model/dim swap fails LOUD at the land, never corrupts recall
silently. Then it runs ONE capture pass (idempotent re-derivation: a re-run lands only the fresh tail).

Ephemeral-first witness discipline: point `--sensorium` at a tmp dir; NEVER seed the sovereign ~/.mempalace.

Usage:
  PYTHONPATH=<repo>/mempalace  <venv>/python capture_session.py \
      <claude|codex|copilot|copilot-vscode> <pointer> --sensorium <dir> --wing <wing> [--room <room>]

  · claude   pointer = a session `.jsonl` (or a sub-agent `agent-<id>.jsonl`)
  · codex    pointer = a rollout `.jsonl`
  · copilot  pointer = the SQLite `session-store.db` (NOT the deleted events.jsonl)
  · copilot-vscode pointer = the native Copilot Chat event-stream `.jsonl`

Meme: lar:///ha.ka.ba/lararium/sensorium/capture-session
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Callable, Iterator

from capture_sources import Record, SourceCap, resolve_source
from sensorium import (compose_content_land, compose_persistence_cap,
                       compose_stream_sensorium, sensorium_paths, write_stream_manifest, OrderCap)
from sidecar_caps import idle_ttl_seconds, make_dispatch, run_sidecar


_LOCK_PREFIX = "capture_session_serve"


def worldline_path(sensorium_root: str) -> str:
    """Derive the worldline capability from the one sensorium root address."""
    return sensorium_paths(sensorium_root).worldline


def stamp_embedder(source: SourceCap, model: str) -> SourceCap:
    """Wrap a source-cap so every record carries the embedder-model stamp (`lar_embedder_model`) — the
    driver owns the embedder identity, the source owns the transcript schema. The store's model-floor
    checks this stamp, so a same-dim different-model swap fails loud at the land."""
    def wrapped(pointer: str) -> Iterator[Record]:
        for rec in source(pointer):
            meta = dict(rec.get("metadata") or {})
            meta["lar_embedder_model"] = model
            yield {**rec, "metadata": meta}
    return wrapped


def compose_memory_stream_sensorium(sensorium_root: str, *, embed_factory: "Callable | None" = None,
                                    planes_factory: "Callable | None" = None):
    """Compose the Memory stream entity once from a root-derived `#has` stack.

    The warm content/embed capabilities stay on the entity.  A source and the
    structure/form planes are born for each pass: SQLite/live-hook sessions and
    harvests therefore share one path without sharing mutable parser or plane
    state.  Other text streams use `compose_stream_sensorium` with their own
    source/land capabilities; no surface-specific sensorium class is needed.
    """
    if embed_factory is None:
        from embed_cap import make_embed_cap
        embed_factory = make_embed_cap
    embed_one, model = embed_factory()
    dim = len(embed_one("probe"))
    paths = sensorium_paths(sensorium_root)
    order = OrderCap("worldline", "observed:turn-dag")
    write_stream_manifest(
        paths.root,
        name="memory",
        lar="lar:///ha.ka.ba/lararium/api/living-grammar-palace#palace-instance",
        order=order,
        apertures={"beat": "worldline-dag"},
        worldline={"real": ["turn-dag"], "arbitrary": ["source-sequence"]},
    )

    def source_factory(*, surface, wing, room="conversations", session_id=None, **_route):
        return stamp_embedder(resolve_source(surface, wing=wing, room=room, session_id=session_id), model)

    def fresh_planes(**route):
        if planes_factory is not None:
            return planes_factory(**route)
        from plane_fanout import compose_text_planes
        return compose_text_planes(paths.root)

    def observe(pointer, *, surface, veil_secret=None, veil_context="", identity_dir=None, **_route):
        if surface != "claude":
            return {"worldline": None}
        from worldline_observe import observe_worldline
        from worldline_io import WorldlineStore
        store = WorldlineStore(paths.worldline)
        try:
            return {"worldline": observe_worldline(store, pointer, veil_secret=veil_secret,
                                                      veil_context=veil_context, identity_dir=identity_dir)}
        finally:
            store.close()

    land = compose_content_land(paths.root, required_keys={"wing", "room"}, expected_dim=dim,
                                expected_model=model)
    stream = compose_stream_sensorium(kind="memory", land=land, embed=embed_one,
                                      source_factory=source_factory, planes_factory=fresh_planes,
                                      observer=observe, worldline=paths.worldline,
                                      persistence=compose_persistence_cap(paths.root, half_life=None),
                                      order=order)
    return stream, model, dim, paths


def capture_and_observe(sensorium_root: str, surface: str, pointer: str, *, wing: "str | None",
                        room: str = "conversations", embed_factory: "Callable | None" = None,
                        veil_secret: "bytes | str | None" = None, veil_context: str = "",
                        identity_dir: "str | None" = None, planes_factory: "Callable | None" = None) -> dict:
    """Capture one source stream through the canonical rooted Memory sensorium."""
    stream, model, dim, _paths = compose_memory_stream_sensorium(
        sensorium_root, embed_factory=embed_factory, planes_factory=planes_factory)
    summary = stream.capture(pointer, surface=surface, wing=wing, room=room,
                             veil_secret=veil_secret, veil_context=veil_context,
                             identity_dir=identity_dir)
    return {"surface": surface, "pointer": pointer, "wing": wing, "room": room,
            "embedder_model": model, "embedder_dim": dim, **summary}


class CaptureSessionServer:
    """One Python-owned source-stream writer for one sovereign content palace.

    The daemon sends only a source pointer and its routing context.  This holder
    owns parsing, source identity, CID derivation, embedding, durable landing,
    and the worldline observation; TypeScript never receives a session turn.
    """

    def __init__(self, sensorium_root: str, *, embed_factory: "Callable | None" = None) -> None:
        self._stream, self._model, self._dim, self._paths = compose_memory_stream_sensorium(
            sensorium_root, embed_factory=embed_factory or self._make_embedder)

    @staticmethod
    def _make_embedder():
        from embed_cap import make_embed_cap
        return make_embed_cap()

    def capture(self, req: dict) -> dict:
        surface = str(req.get("surface") or "")
        pointer = str(req.get("pointer") or "")
        wing = str(req.get("wing") or "")
        room = str(req.get("room") or "conversations")
        session_id = str(req.get("sessionId") or "") or None
        if surface not in {"claude", "codex", "copilot", "copilot-vscode"}:
            raise ValueError("capture requires surface claude|codex|copilot|copilot-vscode")
        if not pointer or not os.path.exists(pointer):
            raise ValueError(f"capture pointer is absent: {pointer!r}")
        if not wing:
            raise ValueError("capture requires a non-empty wing")

        summary = self._stream.capture(pointer, surface=surface, wing=wing, room=room, session_id=session_id)
        return {
            "surface": surface, "pointer": pointer, "wing": wing, "room": room,
            **({"sessionId": session_id} if session_id else {}),
            "embedder_model": self._model, "embedder_dim": self._dim,
            **summary,
        }


def _serve(sensorium_root: str) -> None:
    """Serve one serialized Python capture pipe over NDJSON stdio."""
    server = CaptureSessionServer(sensorium_root)
    run_sidecar(
        palace=server._paths.content,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=lambda: make_dispatch({
            "ping": lambda _req: {"ready": True},
            "capture": server.capture,
        }),
        idle_ttl=idle_ttl_seconds("LARES_CAPTURE_IDLE_TTL", 600.0),
        singleton_msg="capture_session: another holder already serves this palace; exiting (singleton)\n",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="capture_session — Python source-stream driver for the Memory sensorium")
    ap.add_argument("surface", nargs="?", choices=["claude", "codex", "copilot", "copilot-vscode"], help="the AI surface to read")
    ap.add_argument("pointer", nargs="?", help="the transcript pointer (a .jsonl, or the Copilot session-store.db)")
    ap.add_argument("--sensorium", required=True,
                    help="the sovereign sensorium; content/ and worldline/ derive beneath it")
    ap.add_argument("--wing", default=None, help="the schema-floor wing")
    ap.add_argument("--room", default="conversations", help="the schema-floor room")
    ap.add_argument("--serve", action="store_true", help="serve serialized source-stream capture over NDJSON stdio")
    args = ap.parse_args()
    if args.serve:
        _serve(args.sensorium)
        return
    if not args.surface or not args.pointer:
        ap.error("surface and pointer are required unless --serve")
    # capture_and_observe on the shipping entrypoint: land the content AND build the worldline fork-DAG in
    # one pass (the demux 1b wire reaches the live driver, not just the tests). Codex/copilot land content
    # only; the claude surface also builds the braid beside the palace.
    summary = capture_and_observe(args.sensorium, args.surface, args.pointer, wing=args.wing, room=args.room)
    sys.stdout.write(json.dumps(summary) + "\n")


if __name__ == "__main__":
    main()
