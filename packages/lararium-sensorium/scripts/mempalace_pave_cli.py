#!/usr/bin/env python3
"""mempalace_pave_cli — RUN the re-pave over a real ContentStore, filling a mempalace projection.

Open the content plane (the ONE verbatim source), stream its atoms through the derived recall surfaces,
land them under `<mempalace>/mempalace.{lex,ent}`. cid-parity rides by construction — content's own cids
flow through. An optional `--query` witnesses a recall so the pave proves itself end to end: a hit
resolves its verbatim FROM content, never from bytes the projection holds (a hit whose preview carries
text while the projection stores none is the one-bit test, run live).

  ~/.venv/bin/python mempalace_pave_cli.py --content <dir> --mempalace <dir> [--query "..."] [--k N]

The content dir opens GENERIC (no schema guard) — the pave reads any ContentStore the same way, so the
same runner paves the sovereign memory sensorium and every test-stream sensorium alike.
"""
from __future__ import annotations

import argparse
import json
import os

from content_atoms import authored_only, content_atoms, content_getter
from content_io import ContentStore
from entity_graph import nakama_entity_extractor
from mempalace_pave import pave
from mempalace_projection import MempalaceProjection


def run(content_dir: str, mempalace_dir: str, query: "str | None" = None, k: int = 5,
        rebuild: bool = True, all_strata: bool = False) -> dict:
    """Open content, pave the projection over its atoms, optionally witness a recall. Returns a report.

    By default the pave reads the AUTHORED voice only (skips the low-volume harness/thinking murmur) —
    the derived plane reading by volume. `all_strata=True` indexes every stratum (a generic corpus that
    carries no lar_volume is unaffected either way)."""
    store = ContentStore(content_dir)                 # generic open, base collection
    os.makedirs(mempalace_dir, exist_ok=True)
    db = os.path.join(mempalace_dir, "mempalace")
    try:
        extract = nakama_entity_extractor()           # adopt-proven entity reader
    except Exception:                                 # the nakama import stays optional — lexical stands alone
        extract = None
    proj = MempalaceProjection(db_path=db, extract_entities=extract)
    keep = None if all_strata else authored_only
    try:
        n = pave(content_atoms(store, keep=keep), proj, rebuild=rebuild)
        out: dict = {"content": content_dir, "mempalace": db, "paved": n, "rebuild": rebuild,
                     "entities": extract is not None, "strata": "all" if all_strata else "authored"}
        if query:
            get_content = content_getter(store)
            hits = proj.search_lexical(query, get_content, k=k)
            out["query"] = query
            out["hits"] = [
                {"cid": s.cid, "start": s.start, "end": s.end, "preview": (t or "")[:160]}
                for s, t in hits
            ]
            out["fused"] = proj.hybrid_search(query, get_content, k=k)
        return out
    finally:
        proj.close()


def main() -> None:
    ap = argparse.ArgumentParser(description="re-pave a mempalace projection from a ContentStore")
    ap.add_argument("--content", required=True, help="the content plane dir (a ContentStore palace)")
    ap.add_argument("--mempalace", required=True, help="where the projection lands (e.g. <memory>/mempalace)")
    ap.add_argument("--query", default=None, help="witness a recall after the pave")
    ap.add_argument("--k", type=int, default=5, help="hits to return for the witness query")
    ap.add_argument("--append", action="store_true", help="incremental append (default: full rebuild)")
    ap.add_argument("--all-strata", action="store_true",
                    help="index every stratum incl. low-volume harness/thinking (default: authored voice only)")
    a = ap.parse_args()
    out = run(a.content, a.mempalace, query=a.query, k=a.k, rebuild=not a.append, all_strata=a.all_strata)
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
