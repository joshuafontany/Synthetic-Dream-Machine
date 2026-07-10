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

Layout under --root:  content/ (the Memory-pinned ContentStore) · structure/ (the
structurepalace) · form/ (the form collection) · all three keyed by the record cid.

Usage (the mempalace venv):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 corpus_testbed.py run \
      --corpus <dir> [--corpus <dir> ...] --root ~/.lares/testbeds/human-text-<name> \
      [--wing wing_testbed] [--room corpus] [--min-support 2] [--max-forms 64]

Meme: lar:///ha.ka.ba/lararium/sensorium/corpus-testbed
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
from plane_fanout import compose_corpus_planes
from sensorium import compose_sensorium


def _refuse_comparator(root: str) -> None:
    """The comparator ward: ~/.mempalace holds the clean dev-baseline — the RUN never writes it.
    Designation carries authority; a root that reaches into the comparator fails LOUD."""
    comparator = os.path.realpath(os.path.expanduser("~/.mempalace"))
    real = os.path.realpath(os.path.expanduser(root))
    if real == comparator or real.startswith(comparator + os.sep):
        raise SystemExit(f"corpus_testbed: REFUSED — {root!r} sits inside the comparator "
                         "~/.mempalace (S5: comparator only, the RUN never writes it)")


def compose_testbed(root: str, *, wing: str, room: str = "corpus",
                    min_support: int = 2, max_forms: int = 64, max_candidates: int = 96,
                    embed_factory=None, sections: "str | None" = None) -> tuple:
    """Compose the ephemeral test-bed sensorium: a Memory-pinned content store (the frozen
    corpus reads as immutable ground) + the corpus source-cap + the warm embedder + the
    structure/form plane caps. Returns (sensorium, content_store, planes).

    `sections` selects the capture grain: None keeps the whole-file corpus cap;
    "wrapped" / "extracted" ride the SECTIONED cap (one record per wa/section,
    capture_sources.corpus_sectioned_source) — the dual-run ablation's two modes."""
    _refuse_comparator(root)
    if sections not in (None, "wrapped", "extracted"):
        raise SystemExit(f"corpus_testbed: unknown --sections mode {sections!r} "
                         "(the cap speaks wrapped | extracted)")
    if embed_factory is None:
        from embed_cap import make_embed_cap
        embed_factory = make_embed_cap
    embed_one, model = embed_factory()
    dim = len(embed_one("probe"))   # pin the width once off the warm cap (the dim floor)

    if sections is None:
        cap = corpus_source(wing=wing, room=room)
    else:
        cap = corpus_sectioned_source(wing=wing, room=room, extract=(sections == "extracted"))
    source = stamp_embedder(cap, model)
    store = cio.ContentStore(os.path.join(root, "content"), required_keys={"wing", "room"},
                             expected_dim=dim, expected_model=model, append_only=True)
    planes = compose_corpus_planes(root, min_support=min_support, max_forms=max_forms,
                                   max_candidates=max_candidates)
    sensorium = compose_sensorium(kind="testbed-human-text", source=source,
                                  land=ContentStoreLandCap(store), embed=embed_one, planes=planes)
    return sensorium, store, planes


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


def witness(root: str, store: cio.ContentStore, planes: list, pass_summary: dict) -> dict:
    """The 3-plane read-back witness: per-plane counts off the DURABLE stores + one sample
    record shown present in all three planes, its cid keying each. Reads back, never trusts
    the in-memory pass state (prove-by-witness)."""
    structure_cap, form_cap = planes[0], planes[1]
    structure_store = structure_cap._store  # noqa: SLF001 — the witness probe reaches the composed stores
    form_store = form_cap._store            # noqa: SLF001

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
    sensorium, store, planes = compose_testbed(root, wing=wing, room=room, min_support=min_support,
                                               max_forms=max_forms, max_candidates=max_candidates,
                                               sections=sections)
    pass1 = sensorium.capture(corpus)
    w = witness(root, store, planes, pass1)

    # Pass 2 — a FRESH cap-stack over the same durable root: every plane must land ZERO.
    sensorium2, store2, planes2 = compose_testbed(root, wing=wing, room=room, min_support=min_support,
                                                  max_forms=max_forms, max_candidates=max_candidates,
                                                  sections=sections)
    pass2 = sensorium2.capture(corpus)
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
    r.add_argument("--root", required=True,
                   help="the EPHEMERAL test-bed root (e.g. ~/.lares/testbeds/human-text-x); never ~/.mempalace")
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
    out = run(pointer, os.path.expanduser(args.root), wing=args.wing, room=args.room,
              min_support=args.min_support, max_forms=args.max_forms,
              max_candidates=args.max_candidates, sections=args.sections)
    sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
