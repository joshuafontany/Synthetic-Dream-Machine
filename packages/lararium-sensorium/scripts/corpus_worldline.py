#!/usr/bin/env python3
"""corpus_worldline — backfill declared static-corpus order into a sensorium's worldline cap.

A static corpus does not inherit a session rhizome.  Its manifest instead declares which relations
are real.  This projection currently admits only `in-file`: section/chunk order within one logical
source.  Directory traversal and cross-file ordering remain accidental and therefore produce no edge.

Usage:
  PYTHONPATH=<repo>/mempalace <venv>/python corpus_worldline.py --sensorium <place>
"""
from __future__ import annotations

import argparse
import json
import os

from deep_time import content_hash
from sensorium import read_stream_manifest, sensorium_paths
from worldline_io import WorldlineStore


_ADMISSIBLE = frozenset({"in-file", "containment"})


def _manifest(root: str) -> dict:
    try:
        manifest = read_stream_manifest(root)
    except ValueError as exc:
        raise SystemExit(f"corpus_worldline: {exc}") from exc
    spec = manifest.get("worldline")
    if not isinstance(spec, dict):
        raise SystemExit("corpus_worldline: manifest declares no worldline capability; refusing to invent order")
    real = spec.get("real")
    arbitrary = spec.get("arbitrary")
    if not isinstance(real, list) or not all(isinstance(v, str) for v in real):
        raise SystemExit("corpus_worldline: worldline.real must declare its admitted relations")
    if not isinstance(arbitrary, list) or not all(isinstance(v, str) for v in arbitrary):
        raise SystemExit("corpus_worldline: worldline.arbitrary must name excluded relations")
    unknown = set(real) - _ADMISSIBLE
    if unknown:
        raise SystemExit(f"corpus_worldline: unsupported declared relation(s) {sorted(unknown)}")
    if set(real) & set(arbitrary):
        raise SystemExit("corpus_worldline: one relation cannot be both real and arbitrary")
    return {"real": tuple(real), "arbitrary": tuple(arbitrary)}


def _records(content_dir: str) -> list[dict]:
    from content_io import ContentStore

    store = ContentStore(content_dir)
    rows: list[dict] = []
    offset = 0
    while True:
        page = store.scan(offset=offset, limit=256)
        rows.extend(page.get("records") or [])
        if page.get("next") is None:
            break
        offset = page["next"]
    return rows


def _root_for(source_file: str) -> str:
    digest = content_hash(source_file.encode("utf-8"))[:24]
    return f"corpus:{digest}"


def _containment_nodes(source_file: str) -> list[str]:
    """Stable path-prefix nodes from a corpus source key, never host paths."""
    path = source_file.removeprefix("corpus:").replace("\\", "/")
    parts = [part for part in path.split("/") if part and part not in (".", "..")]
    return ["contains:" + "/".join(parts[:i]) for i in range(1, len(parts) + 1)]


def backfill(sensorium: str) -> dict:
    """Project every declared in-file ordering into the rooted worldline store.

    The projection is sink-idempotent.  Each logical source receives its own root,
    so no directory walk manufactures a false relation between independent files.
    """
    paths = sensorium_paths(sensorium)
    spec = _manifest(paths.root)
    if "in-file" not in spec["real"]:
        return {"sensorium": paths.root, "basis": [], "sources": 0, "records": 0, "edges": 0,
                "note": "no admitted static ordering declared"}

    groups: dict[str, list[tuple[int, str, str]]] = {}
    for row in _records(paths.content):
        meta = row.get("metadata") or {}
        source_file = meta.get("source_file")
        turn_key = meta.get("lar_turn_key")
        if not isinstance(source_file, str) or not isinstance(turn_key, str):
            raise SystemExit(
                "corpus_worldline: a content record lacks source_file or lar_turn_key; "
                "refusing a partial topology"
            )
        try:
            chunk = int(meta.get("chunk_index", 0))
        except (TypeError, ValueError):
            raise SystemExit(f"corpus_worldline: invalid chunk_index for {source_file!r}")
        groups.setdefault(source_file, []).append((chunk, turn_key, str(row.get("cid") or "")))

    store = WorldlineStore(paths.worldline)
    edges = records = containment_edges = 0
    try:
        for source_file, rows in sorted(groups.items()):
            rows.sort(key=lambda row: (row[0], row[2]))
            chunks = [row[0] for row in rows]
            if len(chunks) != len(set(chunks)):
                raise SystemExit(
                    f"corpus_worldline: {source_file!r} carries duplicate chunk_index values; "
                    "refusing an ambiguous in-file order"
                )
            root = _root_for(source_file)
            prev = root
            for tick, (_chunk, turn_key, _cid) in enumerate(rows, start=1):
                result = store.linear(prev, turn_key, tick, basis="declared:in-file")
                edges += int(bool(result.get("added")))
                records += 1
                prev = turn_key
            if "containment" in spec["real"]:
                nodes = _containment_nodes(source_file)
                for parent, child in zip(nodes, nodes[1:]):
                    containment_edges += int(bool(store.add_edge(
                        parent, child, "contains", 0, basis="declared:containment").get("added")))
                if nodes:
                    containment_edges += int(bool(store.add_edge(
                        nodes[-1], root, "contains", 0, basis="declared:containment").get("added")))
    finally:
        store.close()
    basis = ["declared:in-file"] + (["declared:containment"] if "containment" in spec["real"] else [])
    return {"sensorium": paths.root, "basis": basis, "sources": len(groups), "records": records,
            "edges": edges, "containment_edges": containment_edges, "arbitrary": list(spec["arbitrary"])}


def main() -> None:
    ap = argparse.ArgumentParser(description="backfill manifest-declared static corpus order into worldline/")
    ap.add_argument("--sensorium", required=True, help="the corpus sensorium carrying content/ and worldline/")
    args = ap.parse_args()
    print(json.dumps(backfill(args.sensorium), ensure_ascii=False))


if __name__ == "__main__":
    main()
