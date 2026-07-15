#!/usr/bin/env python3
"""capture_corpus — the Python-owned pointer pipe for rooted static-text sensoria.

The caller supplies a corpus pointer and a sensorium root.  This module owns source
parsing, warm embedding, durable content landing, fresh structure/form projection, and
declared static-worldline backfill.  It never receives corpus text through TypeScript.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import content_io as cio
from capture_session import stamp_embedder
from capture_sources import corpus_sectioned_source, corpus_source
from capture_stream import ContentStoreLandCap
from plane_fanout import compose_text_planes
from sensorium import (OrderCap, compose_persistence_cap, compose_stream_sensorium,
                       sensorium_paths, write_ndjson_atomically, write_stream_manifest)


def refuse_comparator(root: str) -> None:
    comparator = os.path.realpath(os.path.expanduser("~/.mempalace"))
    real = sensorium_paths(root).root
    if real == comparator or real.startswith(comparator + os.sep):
        raise SystemExit(f"capture_corpus: REFUSED — {root!r} sits inside ~/.mempalace (comparator only)")


def write_corpus_manifest(root: str, *, name: str = "corpus", ephemeral: bool = False) -> str:
    """Declare a static corpus's cap stack and in-file ordering evidence."""
    return write_stream_manifest(
        root,
        name=name,
        lar="lar:///ha.ka.ba/lares/api/lares/corpus#stream-capture",
        order=OrderCap("corpus", "declared:in-file"),
        apertures={"measure": "boundary-changepoint"},
        worldline={"real": ["in-file"], "arbitrary": ["walk-order"]},
        ephemeral=ephemeral,
    )


def compose_corpus_stream_sensorium(root: str, *, wing: str, room: str = "corpus", min_support: int = 2,
                                    max_forms: int = 64, max_candidates: int = 96, embed_factory=None,
                                    sections: "str | None" = None, name: str = "corpus", ephemeral: bool = False):
    refuse_comparator(root)
    paths = sensorium_paths(root)
    write_corpus_manifest(paths.root, name=name, ephemeral=ephemeral)
    if sections not in (None, "wrapped", "extracted"):
        raise SystemExit(f"capture_corpus: unknown sections mode {sections!r}")
    if embed_factory is None:
        from embed_cap import make_embed_cap
        embed_factory = make_embed_cap
    embed_one, model = embed_factory()
    dim = len(embed_one("probe"))
    source = corpus_source(wing=wing, room=room) if sections is None else corpus_sectioned_source(
        wing=wing, room=room, extract=sections == "extracted")
    source = stamp_embedder(source, model)
    store = cio.ContentStore(paths.content, required_keys={"wing", "room"}, expected_dim=dim,
                             expected_model=model, append_only=True)

    def finish_capture(_pointer, summary, **_route):
        """Derive corpus-only readings while the capture pass still holds its lease."""
        bands = {"cells": 0, "note": "bands-skipped: no new content"}
        if summary.get("landed", 0) > 0:
            from bands import analyze_sensorium
            try:
                cells, bands = analyze_sensorium(paths.root)
                if cells:
                    write_ndjson_atomically(os.path.join(paths.root, "bands-cells.ndjson"), cells)
            except Exception as exc:  # noqa: BLE001 — a derived aperture cannot revoke content landing
                bands = {"cells": 0, "note": f"bands-skipped: analyzer fault ({type(exc).__name__})"}
        from corpus_worldline import backfill
        return {"bands_report": bands, "worldline": backfill(paths.root)}

    stream = compose_stream_sensorium(kind="corpus", land=ContentStoreLandCap(store), embed=embed_one,
        source_factory=lambda **_route: source,
        planes_factory=lambda **_route: compose_text_planes(paths.root, min_support=min_support,
            max_forms=max_forms, max_candidates=max_candidates),
        worldline=paths.worldline, persistence=compose_persistence_cap(paths.root),
        order=OrderCap("corpus", "declared:in-file"), after_capture=finish_capture,
        mutation_root=paths.root)
    return stream, store, paths


def capture(pointer: str, sensorium: str, *, wing: str, room: str = "corpus", min_support: int = 2,
            max_forms: int = 64, max_candidates: int = 96, sections: "str | None" = None,
            ephemeral: bool = False) -> dict:
    stream, _store, paths = compose_corpus_stream_sensorium(sensorium, wing=wing, room=room,
        min_support=min_support, max_forms=max_forms, max_candidates=max_candidates, sections=sections,
        ephemeral=ephemeral)
    summary = stream.capture(pointer)
    planes = summary.get("planes") or {}
    structure = planes.get("structure") or {}
    form = planes.get("form") or {}
    bands = summary.get("bands_report") or {"cells": 0, "note": "bands-skipped: no report"}
    drawers = int(summary.get("landed", 0))
    structures = int(structure.get("landed", 0))
    forms = int(form.get("forms", 0))
    note = " · ".join((
        f"captured {pointer} → {drawers} drawers",
        structure.get("note") or f"structure: {structures} vectors",
        bands.get("note") or f"bands: {bands.get('cells', 0)} cells",
        form.get("note") or f"form: {forms} constructions",
    ))
    return {"sensorium": paths.root, "pointer": pointer, "wing": wing, "room": room,
            "drawers": drawers, "structures": structures, "bands": int(bands.get("cells", 0)),
            "forms": forms, "note": note, **summary}


def main() -> None:
    ap = argparse.ArgumentParser(description="capture a static corpus through a rooted stream sensorium")
    ap.add_argument("--sensorium", required=True)
    ap.add_argument("--source", action="append", required=True)
    ap.add_argument("--wing", required=True)
    ap.add_argument("--room", default="corpus")
    ap.add_argument("--sections", choices=("wrapped", "extracted"))
    ap.add_argument("--min-support", type=int, default=2, dest="min_support")
    ap.add_argument("--max-forms", type=int, default=64, dest="max_forms")
    ap.add_argument("--max-candidates", type=int, default=96, dest="max_candidates")
    ap.add_argument("--ephemeral", action="store_true")
    args = ap.parse_args()
    pointer = os.pathsep.join(args.source)
    print(json.dumps(capture(pointer, args.sensorium, wing=args.wing, room=args.room,
          min_support=args.min_support, max_forms=args.max_forms, max_candidates=args.max_candidates,
          sections=args.sections, ephemeral=args.ephemeral), ensure_ascii=False))


if __name__ == "__main__":
    main()
