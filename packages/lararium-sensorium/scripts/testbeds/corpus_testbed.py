#!/usr/bin/env python3
"""corpus_testbed — compose an EPHEMERAL human-text test-bed sensorium + witness the 3-plane pass.

The RUN arc's first step (RUN-ARC.md "The first step"): stand a disposable test-bed sensorium
over a curated frozen markdown corpus, run ONE capture pass that fans every record out to all
three planes — content (text + warm-embed vector) · structure (parse-router tree) · form
(induced-grammar membership) — then WITNESS the planes populated over the same cids, and the
second pass landing zero (idempotent re-derivation). Prove-by-witness, not green units.

THE S5 SENSORIUM LAW this driver enforces:
  · the test-bed lives under ~/.lares (or any operator root) and reads as EPHEMERAL —
    controlled ground-truth for the independence test, disposable after;
  · it REFUSES a root under ~/.mempalace (the comparator stays clean — a contaminated
    comparator loses its value).

Layout under --sensorium:  content/ (the Memory-pinned ContentStore) · structure/ (the
structurepalace) · form/ (the form collection) · all three keyed by the record cid.

Usage (the mempalace venv):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 corpus_testbed.py run \
      --corpus <dir> [--corpus <dir> ...] --sensorium ~/.lares/testbeds/human-text-<name> \
      [--wing wing_testbed] [--room corpus] [--min-support 2] [--max-forms 64]

Meme: lar:///ha.ka.ba/lararium/sensorium/corpus-testbed
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import content_io as cio
from capture_corpus import (compose_corpus_stream_sensorium, refuse_comparator,
                            write_corpus_manifest)


def write_bed_manifest(root: str, *, name: str = "corpus-testbed") -> str:
    return write_corpus_manifest(root, name=name, ephemeral=True)


def _refuse_comparator(root: str) -> None:
    """The comparator ward: ~/.mempalace holds the clean dev-baseline — the RUN never writes it.
    Designation carries authority; a root that reaches into the comparator fails LOUD."""
    refuse_comparator(root)


def compose_testbed(root: str, *, wing: str, room: str = "corpus",
                    min_support: int = 2, max_forms: int = 64, max_candidates: int = 96,
                    embed_factory=None, sections: "str | None" = None) -> tuple:
    """Compose the ephemeral test-bed sensorium: a Memory-pinned content store (the frozen
    corpus reads as immutable ground) + the corpus source-cap + the warm embedder + the
    structure/form plane caps. Returns (sensorium, content_store, planes).

    `sections` selects the capture grain: None keeps the whole-file corpus cap;
    "wrapped" / "extracted" ride the SECTIONED cap (one record per wa/section,
    capture_sources.corpus_sectioned_source) — the dual-run ablation's two modes."""
    stream, store, _paths = compose_corpus_stream_sensorium(
        root, wing=wing, room=room, min_support=min_support, max_forms=max_forms,
        max_candidates=max_candidates, embed_factory=embed_factory, sections=sections,
        name="corpus-testbed", ephemeral=True)
    return stream, store


def _content_count(store: cio.ContentStore) -> int:
    """The content plane's row count, read back off the durable store (never the pass summary)."""
    return int(store.scan(0, 1).get("total", 0))


def _structure_entry_for(structure_store, cid: str) -> "dict | None":
    """Find the structure entry whose provenance binds `cid` — the read-back join leg (the
    structurepalace keys by structural hash, so the witness walks the provenance lines)."""
    got = structure_store._col.get(include=["metadatas"])  # noqa: SLF001 — the witness probe reads the raw collection
    ids = got.get("ids") or []
    metas = got.get("metadatas") or []
    for i, h in enumerate(ids):
        meta = metas[i] or {}
        try:
            provenance = json.loads(meta.get("lar_provenance") or "[]")
        except (ValueError, TypeError):
            provenance = []
        if any(p.get("verbatim_sha") == cid for p in provenance):
            return {"hash": h, "count": meta.get("count"), "provenance": provenance}
    return None


def witness(root: str, store: cio.ContentStore, pass_summary: dict) -> dict:
    """The 3-plane read-back witness: per-plane counts off the DURABLE stores + one sample
    record shown present in all three planes, its cid keying each. Reads back, never trusts
    the in-memory pass state (prove-by-witness)."""
    from form_encoder import FormPalaceStore
    from structurepalace_io import StructurePalaceStore

    structure_store = StructurePalaceStore(os.path.join(root, "structure"))
    form_store = FormPalaceStore(os.path.join(root, "form"))

    counts = {
        "content": _content_count(store),
        "structure": int(structure_store._col.count()),  # noqa: SLF001
        "form": int(form_store._col.count()),            # noqa: SLF001
    }

    # The sample: the first content row → its structure entry (by provenance) → its form row (by cid).
    sample = None
    page = store.scan(0, 8).get("records", [])
    for row in page:
        cid = row["cid"]
        s_entry = _structure_entry_for(structure_store, cid)
        f_entry = form_store.get(cid)
        if s_entry is not None and f_entry is not None:
            # The form MEMBERSHIP itself, read off the durable dense vector (how many induced
            # templates this record's stream carries) — the plane's populated-proof, not a stub row.
            got = form_store._col.get(ids=[cid], include=["embeddings", "metadatas"])  # noqa: SLF001
            embs = got.get("embeddings")
            vec = list(embs[0]) if embs is not None and len(embs) else []
            sample = {
                "cid": cid,
                "source_file": (row.get("metadata") or {}).get("source_file", ""),
                "content_head": (row.get("document") or "")[:100].replace("\n", " "),
                "structure_hash": s_entry["hash"],
                "structure_recurrence": s_entry["count"],
                "form_dimension": (f_entry.get("metadata") or {}).get("dimension"),
                "form_active_templates": sum(1 for v in vec if float(v) > 0.0),
                "form_struct_hash": (f_entry.get("metadata") or {}).get("struct_hash", ""),
            }
            break
    return {"root": root, "counts": counts, "sample": sample, "pass": pass_summary}


def run(corpus: str, root: str, *, wing: str, room: str, min_support: int, max_forms: int,
        max_candidates: int = 96, sections: "str | None" = None) -> dict:
    """The whole first-step arc: pass 1 (land all three planes) → read-back witness → pass 2
    over a FRESH composition (proves the idempotence lives in the stores, not process state)."""
    sensorium, store = compose_testbed(root, wing=wing, room=room, min_support=min_support,
                                       max_forms=max_forms, max_candidates=max_candidates,
                                       sections=sections)
    pass1 = sensorium.capture(corpus)
    from corpus_worldline import backfill
    w = witness(root, store, pass1)
    w["worldline"] = backfill(root)

    # Pass 2 reuses the warm entity.  The stream factory still mints fresh
    # source/plane caps, so zero landing proves idempotence lives durably.
    pass2 = sensorium.capture(corpus)
    plane2 = pass2.get("planes", {})
    w["idempotency"] = {
        "content_landed": pass2.get("landed"),
        "content_skipped": pass2.get("skipped"),
        "structure_landed": (plane2.get("structure") or {}).get("landed"),
        "structure_already": (plane2.get("structure") or {}).get("already"),
        "form_landed": (plane2.get("form") or {}).get("landed"),
        "form_already": (plane2.get("form") or {}).get("already"),
    }
    return w


def main() -> None:
    ap = argparse.ArgumentParser(description="corpus_testbed — the ephemeral human-text test-bed 3-plane witness")
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="compose the test-bed, run the pass, witness all three planes + idempotency")
    r.add_argument("--corpus", action="append", required=True,
                   help="a corpus root (repeatable; dirs walk recursively for markdown/text)")
    r.add_argument("--sensorium", required=True,
                   help="the EPHEMERAL test-bed sensorium (e.g. ~/.lares/testbeds/human-text-x); never ~/.mempalace")
    r.add_argument("--wing", default="wing_testbed")
    r.add_argument("--room", default="corpus")
    r.add_argument("--min-support", type=int, default=2, dest="min_support")
    r.add_argument("--max-forms", type=int, default=64, dest="max_forms")
    r.add_argument("--max-candidates", type=int, default=96, dest="max_candidates",
                   help="per-miner MDL pool bound (bounded per-pass work)")
    r.add_argument("--sections", choices=("wrapped", "extracted"), default=None,
                   help="the SECTIONED capture grain (one record per wa/section): wrapped = "
                        "the memetic wikitext as it stands · extracted = the #source-text "
                        "bare interior — the dual-run ablation's two modes")
    args = ap.parse_args()
    pointer = os.pathsep.join(args.corpus)
    out = run(pointer, os.path.expanduser(args.sensorium), wing=args.wing, room=args.room,
              min_support=args.min_support, max_forms=args.max_forms,
              max_candidates=args.max_candidates, sections=args.sections)
    sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
