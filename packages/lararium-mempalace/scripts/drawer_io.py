#!/usr/bin/env python3
"""drawer_io — the substrate side of the @admin memory-shore.

The causal-island boundary made crossable, in ONE direction's I/O only:
this helper READS verbatim drawer content out of the mempalace library and
WRITES our domain-metadata patches back onto those same drawers. The sovereign
parse (the gradient harvester) stays in TS (@lararium/mesh) — this script never
classifies, never decides; it only moves bytes across the boundary.

Tensegrity: the verbatim drawer is the compression member (untouched content);
our `lar_*` metadata is the tension written onto it.

  export --wing W [--limit N]   -> NDJSON {id, content} on stdout, only drawers
                                    not yet at the current harvest version (idempotent)
  apply  PATCHFILE               <- NDJSON {id, patch} ; merges patch onto each
                                    drawer's existing metadata (chroma update is
                                    merge-only — we never delete a field)

Run with the mempalace CLI's interpreter (it has the package + chroma):
  /home/joshu/.venv/bin/python3 drawer_io.py export --wing wing_joshu
"""
import argparse
import json
import os
import sys

from mempalace.palace import get_collection

PALACE = os.path.expanduser("~/.mempalace/palace")
# Current harvest version — bump when the harvester's output shape changes, so a
# re-harvest re-processes every drawer; unchanged, it skips already-done drawers.
HARVEST_VERSION = 2  # bump in lockstep with lar_hv in harvest.ts buildPatch
READ_BATCH = 2000
WRITE_BATCH = 1000

# The declared schema contract (RFC 002). Every lar_* write is validated against
# it and stamped with the adapter identity — declared, not smuggled.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
try:
    from mempalace_source_lares.adapter import (
        declared_field_names,
        ADAPTER_NAME,
        ADAPTER_VERSION,
    )

    _DECLARED = declared_field_names()
except Exception:  # noqa: BLE001 — fail safe: still write, just unstamped
    _DECLARED, ADAPTER_NAME, ADAPTER_VERSION = None, "lares", "0.1.0"


def _col():
    return get_collection(PALACE, _skip_identity_check=True)


def cmd_export(args):
    col = _col()
    got = col.get(where={"wing": args.wing}, include=["metadatas"])
    ids, metas = got["ids"], got["metadatas"]
    todo = [i for i, m in zip(ids, metas) if (m or {}).get("lar_hv") != HARVEST_VERSION]
    if args.limit:
        todo = todo[: args.limit]
    out = sys.stdout
    for k in range(0, len(todo), READ_BATCH):
        batch = todo[k : k + READ_BATCH]
        d = col.get(ids=batch, include=["documents"])
        for i, doc in zip(d["ids"], d["documents"]):
            out.write(json.dumps({"id": i, "content": doc or ""}) + "\n")
    sys.stderr.write(f"exported {len(todo)} drawers (of {len(ids)} in {args.wing})\n")


def cmd_apply(args):
    col = _col()
    patches = [json.loads(line) for line in open(args.patchfile) if line.strip()]
    applied = 0
    for k in range(0, len(patches), WRITE_BATCH):
        batch = patches[k : k + WRITE_BATCH]
        ids = [p["id"] for p in batch]
        cur = col.get(ids=ids, include=["metadatas"])
        curmap = dict(zip(cur["ids"], cur["metadatas"]))
        up_ids, up_metas = [], []
        for p in batch:
            patch = p["patch"]
            # Conformance gate: every lar_* key MUST be declared in LAR_SCHEMA.
            if _DECLARED is not None:
                undeclared = {k for k in patch if k.startswith("lar_")} - _DECLARED
                if undeclared:
                    raise SystemExit(
                        f"SchemaConformanceError: undeclared lar_ fields {sorted(undeclared)} — "
                        "declare them in mempalace_source_lares/adapter.py LAR_SCHEMA before writing"
                    )
            merged = dict(curmap.get(p["id"], {}) or {})
            merged.update(patch)  # merge: tension written onto the strut
            merged["adapter_name"] = ADAPTER_NAME  # declared, not smuggled
            merged["adapter_version"] = ADAPTER_VERSION
            up_ids.append(p["id"])
            up_metas.append(merged)
        if up_ids:
            col.update(ids=up_ids, metadatas=up_metas)
            applied += len(up_ids)
    print(json.dumps({"applied": applied, "hv": HARVEST_VERSION, "adapter": ADAPTER_NAME, "adapter_version": ADAPTER_VERSION}))


def main():
    ap = argparse.ArgumentParser(description="mempalace drawer I/O (boundary substrate side)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("export")
    e.add_argument("--wing", required=True)
    e.add_argument("--limit", type=int, default=0)
    e.set_defaults(fn=cmd_export)
    a = sub.add_parser("apply")
    a.add_argument("patchfile")
    a.set_defaults(fn=cmd_apply)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
