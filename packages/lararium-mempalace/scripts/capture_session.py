#!/usr/bin/env python3
"""capture_session — the COORDINATOR/DRIVER that takes the capture engine LIVE (the M1 keystone wire).

The engine (capture_stream.Pipeline via sensorium.compose_memory_sensorium) stood DARK: no surface cap
parsed a transcript, nothing drove a pass. This driver composes the whole cap-stack and pulls the
trigger:

    Memory sensorium  =  content_io ContentStore (immutable ground, append-only, wing/room schema floor
                          + embedder-identity floor {dim, model})
                       +  a surface source-cap (capture_sources: claude · codex · copilot)
                       +  the warm embed cap (embed_cap: minilm/384, loaded once)

The DRIVER STAMPS the embedder identity: it reads `(embed_one, model)` off the warm cap, PROBES the
vector dim once, stamps `lar_embedder_model` onto every record's metadata, and pins `expected_dim` /
`expected_model` on the store — so a model/dim swap fails LOUD at the land, never corrupts recall
silently. Then it runs ONE capture pass (idempotent re-derivation: a re-run lands only the fresh tail).

Ephemeral-first witness discipline: point `--palace` at a tmp dir; NEVER seed the sovereign ~/.mempalace.

Usage:
  PYTHONPATH=<repo>/mempalace  <venv>/python capture_session.py \
      <claude|codex|copilot> <pointer> --palace <dir> --wing <wing> [--room <room>]

  · claude   pointer = a session `.jsonl` (or a sub-agent `agent-<id>.jsonl`)
  · codex    pointer = a rollout `.jsonl`
  · copilot  pointer = the SQLite `session-store.db` (NOT the deleted events.jsonl)

Meme: lar:///ha.ka.ba/@lararium/sensorium/capture-session
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Callable, Iterable, Iterator

from capture_sources import Record, SourceCap, resolve_source
from sensorium import compose_memory_sensorium


def worldline_path(palace_path: str) -> str:
    """The ONE canonical worldline dir a Memory palace carries — a `.worldline` BESIDE the chroma palace
    (the raw-sqlite-beside-chroma idiom). Both the capture wire (`capture_and_observe`) and the
    LaresCoordinator resolve the fork-DAG HERE, so a harvest BUILDS the DAG the coordinator later reads —
    the root-vs-`.worldline` path split closed."""
    return os.path.join(palace_path, ".worldline")


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


def drive_capture(palace_path: str, surface: str, pointer: str, *, wing: "str | None",
                  room: str = "conversations", embed_factory: "Callable | None" = None,
                  planes: "list | None" = None) -> dict:
    """Compose the Memory sensorium over a REAL palace with a warm embedder + the surface source-cap,
    then run ONE capture pass. `embed_factory` returns `(embed_one, model)` — defaults to the warm
    minilm cap; a witness may inject a deterministic stand-in. Returns the pass summary dict.

    `planes` carries the structure/form plane caps so the SAME records land on all three planes (the
    cross-plane thesis needs genuinely-independent projections over shared units, keyed by one cid).
    None keeps the content-only pass — the caller decides, because standing the plane caps opens two
    more chroma stores beside the palace."""
    if embed_factory is None:
        from embed_cap import make_embed_cap
        embed_factory = make_embed_cap
    embed_one, model = embed_factory()

    # Probe the vector width ONCE off the warm cap → pin the dim floor (a dim-changing swap fails loud).
    dim = len(embed_one("probe"))

    source = stamp_embedder(resolve_source(surface, wing=wing, room=room), model)

    sensorium = compose_memory_sensorium(
        palace_path, source=source, embed=embed_one,
        expected_dim=dim, expected_model=model, planes=planes,
    )
    summary = sensorium.capture(pointer)
    return {"surface": surface, "pointer": pointer, "wing": wing, "room": room,
            "embedder_model": model, "embedder_dim": dim, **summary}


def capture_and_observe(palace_path: str, surface: str, pointer: str, *, wing: "str | None",
                        room: str = "conversations", worldline_palace: "str | None" = None,
                        embed_factory: "Callable | None" = None,
                        veil_secret: "bytes | str | None" = None, veil_context: str = "",
                        identity_dir: "str | None" = None, planes: "list | None" = None) -> dict:
    """Drive the capture pass, THEN build the worldline fork-DAG over the SAME transcript (the demux 1b
    wire). The two legs stay decoupled: `drive_capture` lands the content untouched; this coordinator
    then feeds `worldline_io` the braid so `worldline_of` / `roots` / kapae read the landed turn-keys.

    Only the Claude surface carries the parentUuid + `subagents/` provenance the observer reads, so the
    worldline leg guards on it (codex/copilot lands content only, `worldline` reads None). `worldline_palace`
    defaults to a `.worldline` dir BESIDE the Memory palace (the raw-sqlite-beside-chroma idiom)."""
    summary = drive_capture(palace_path, surface, pointer, wing=wing, room=room,
                            embed_factory=embed_factory, planes=planes)

    worldline = None
    if surface == "claude":
        from worldline_observe import observe_worldline
        from worldline_io import WorldlineStore
        wpath = worldline_palace or worldline_path(palace_path)
        store = WorldlineStore(wpath)
        try:
            worldline = observe_worldline(store, pointer, veil_secret=veil_secret,
                                          veil_context=veil_context, identity_dir=identity_dir)
        finally:
            store.close()
    return {**summary, "worldline": worldline}


def main() -> None:
    ap = argparse.ArgumentParser(description="capture_session — drive the Memory sensorium over a transcript (the M1 live wire)")
    ap.add_argument("surface", choices=["claude", "codex", "copilot"], help="the AI surface to read")
    ap.add_argument("pointer", help="the transcript pointer (a .jsonl, or the Copilot session-store.db)")
    ap.add_argument("--palace", required=True, help="the Memory palace dir (an EPHEMERAL tmp dir when witnessing — never ~/.mempalace)")
    ap.add_argument("--wing", default=None, help="the schema-floor wing (required for claude/codex; copilot defaults per-session)")
    ap.add_argument("--room", default="conversations", help="the schema-floor room")
    args = ap.parse_args()
    # capture_and_observe on the shipping entrypoint: land the content AND build the worldline fork-DAG in
    # one pass (the demux 1b wire reaches the live driver, not just the tests). Codex/copilot land content
    # only; the claude surface also builds the braid beside the palace.
    summary = capture_and_observe(args.palace, args.surface, args.pointer, wing=args.wing, room=args.room)
    sys.stdout.write(json.dumps(summary) + "\n")


if __name__ == "__main__":
    main()
