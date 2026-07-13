#!/usr/bin/env python3
"""rederive — the derived planes refresh from the GROUND; the ground never moves.

The pour carries two lifetimes the chain canon names (Content ↠ Structure ↠ Form):
the CONTENT plane = the eidetic ground — append-only, embedder-priced, invariant
under canon changes; structure and form = DERIVATIONS — cheap caches of a walk down
the chain, meant to be wiped whenever the canon above them turns. Refreshing a
derivation by re-pouring the bed re-reads sources and re-embeds vectors that never
changed — the useless I/O this verb deletes.

`rederive` wipes ONLY `<root>/structure` and `<root>/form`, then walks the bed's own
contentpalace (verbatim text + stamped `lar_kind` already stored) through the same
plane caps the pour composes — one parse per record, both planes reading one
unfolding. ZERO source reads. ZERO embedder calls. The regeneration witness: a
rederived bed carries the same derived planes a fresh pour lands, because both walk
the same ground through the same caps.

HELD (named, not built): a form-ONLY cadence deriving from the structure store's
trees — blocked today by the provenance cap (`lar_provenance` truncates at 64
records, so cid→tree recovery reads lossy for hot patterns). Until that resolves,
every rederive re-parses; parsing stays the cheap leg (the embedder stays silent).

Loud by law: an unnamed root refuses; a bed whose ground holds no records refuses
(nothing stands to derive from — a silent empty rederive would read as a finding).

Usage (THE venv):
  PYTHONPATH=<repo>/mempalace ~/.venv/bin/python3 rederive.py --root <bed> \
      [--min-support N] [--max-forms N] [--max-candidates N]

Meme: lar:///ha.ka.ba/lararium/sensorium/rederive
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys


def _ground_records(root: str) -> "list[dict]":
    """Every record off the bed's contentpalace, in total order (source_file,
    chunk_index, cid) — the deterministic walk the caps re-read."""
    from content_io import ContentStore

    store = ContentStore(os.path.join(root, "content"))
    out: "list[dict]" = []
    offset = 0
    while True:
        page = store.scan(offset=offset, limit=256)
        for r in page["records"]:
            meta = r.get("metadata") or {}
            cid = r.get("cid")
            if not cid:
                # a ground record without its cid cannot bind provenance — refusing
                # beats landing derived rows nothing can reach back from.
                raise SystemExit(
                    f"rederive: a ground record under {root!r} carries no cid "
                    f"(source_file {meta.get('source_file')!r}) — the ground reads "
                    "malformed; refusing to derive from it."
                )
            out.append({"cid": cid, "text": r.get("document") or "", "metadata": meta})
        if page["next"] is None:
            break
        offset = page["next"]
    out.sort(
        key=lambda r: (
            str(r["metadata"].get("source_file", "")),
            int(r["metadata"].get("chunk_index", 0) or 0),
            str(r["cid"]),
        )
    )
    return out


def rederive(root: str, *, min_support: int = 2, max_forms: int = 64,
             max_candidates: "int | None" = 96) -> dict:
    """Wipe the derived planes and walk the ground back through the pour's own caps."""
    from plane_fanout import compose_corpus_planes

    root = os.path.expanduser(root)
    records = _ground_records(root)
    if not records:
        raise SystemExit(
            f"rederive: the ground under {root!r} holds no records — nothing stands "
            "to derive from. Pour the bed before rederiving it."
        )

    # the derived planes wipe; the ground never gets touched
    for plane in ("structure", "form"):
        d = os.path.join(root, plane)
        if os.path.isdir(d):
            shutil.rmtree(d)

    caps = compose_corpus_planes(
        root, min_support=min_support, max_forms=max_forms, max_candidates=max_candidates
    )
    for rec in records:
        for cap in caps:
            cap.land(rec)
    report = {cap.name: cap.finish() for cap in caps}
    return {"root": root, "records": len(records), "planes": report}


def main(argv: "list[str] | None" = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--root", action="append", default=[], help="a bed root (repeatable)")
    ap.add_argument("--min-support", type=int, default=2, dest="min_support")
    ap.add_argument("--max-forms", type=int, default=64, dest="max_forms")
    ap.add_argument("--max-candidates", type=int, default=96, dest="max_candidates")
    args = ap.parse_args(argv)
    if not args.root:
        raise SystemExit(
            "rederive: no bed named — pass `--root <dir>`. An unnamed rederive would "
            "wipe whichever derived planes sit at a default; name the bed, or stop."
        )
    for root in sorted(dict.fromkeys(args.root)):
        rep = rederive(
            root,
            min_support=args.min_support,
            max_forms=args.max_forms,
            max_candidates=args.max_candidates,
        )
        sys.stdout.write(json.dumps(rep, sort_keys=True, default=str) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
