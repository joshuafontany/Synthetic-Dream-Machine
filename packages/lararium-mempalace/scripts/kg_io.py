#!/usr/bin/env python3
"""kg_io — the WORLDLINE edge-DAG side of the mempalace knowledge graph.

The durable projection of the agent worldline's happened-before (agent-worldline
#attribution): spawn → a prov:Delegation triple, inject → a prov:Communication
triple, handback → the spawn edge's valid-interval closed, kapae (rewind) → every
edge of a retracted turn closed (valid_to set, never deleted — history kept).

This is OUR script (packages/lararium-mempalace/scripts), NOT the vendored submodule:
it CALLS the mempalace KnowledgeGraph public API (add_triple / invalidate) the same
way drawer_io.py calls the collection. We never edit mempalace/.

  add  PATCHFILE       <- NDJSON {subject,predicate,object,valid_from?,valid_to?,
                          turn_key?,source_file?,confidence?} ; one kg.add_triple each.
                          turn_key rides source_drawer_id (the kapae filter slot).
  invalidate PATCHFILE <- NDJSON {subject,predicate,object,ended?} ; one kg.invalidate
                          each — closes a triple's valid_to by S/P/O (the handback close).
  kapae --turn-key K [--ended T]
                       <- close valid_to on EVERY still-open triple keyed to turn K
                          (append-only UPDATE; bitemporal valid-close, history preserved).

KG path resolution mirrors the mcp_server: --palace P → <P>/knowledge_graph.sqlite3,
else the package DEFAULT_KG_PATH (~/.mempalace/knowledge_graph.sqlite3). Run with the
mempalace interpreter (PYTHONPATH=<repo>/mempalace so `import mempalace` resolves):
  /home/joshu/.venv/bin/python3 kg_io.py kapae --palace ~/.mempalace/palace --turn-key t1
"""
import argparse
import json
import os
import sqlite3
from datetime import date

from mempalace.knowledge_graph import KnowledgeGraph, DEFAULT_KG_PATH

# This batch CLI's cap-stack is light: it #has the shared NDJSON record reader + the
# shared path canonicalization (no serve loop / flock / idle-reap — those belong to
# the persistent serve sidecars).
from sidecar_caps import canonical_path, read_ndjson_records

ADAPTER_NAME = "lares-worldline"


def _kg_path(palace):
    # Match mcp_server._resolve_kg_path: with a palace flag the KG lives INSIDE the
    # palace dir; without one, the package default. Canonicalize so a symlinked /
    # relative spelling addresses the SAME sqlite file (palace-path.ts's discipline).
    if palace:
        return canonical_path(os.path.join(os.path.expanduser(palace), "knowledge_graph.sqlite3"))
    return DEFAULT_KG_PATH


def _kg(palace):
    return KnowledgeGraph(db_path=_kg_path(palace))


def cmd_add(args):
    kg = _kg(args.palace)
    added = 0
    for r in read_ndjson_records(args.patchfile):
        kg.add_triple(
            r["subject"],
            r["predicate"],
            r["object"],
            valid_from=r.get("valid_from"),
            valid_to=r.get("valid_to"),
            confidence=float(r.get("confidence", 1.0)),
            source_file=r.get("source_file"),
            # The turn-DAG key rides the RFC-002 provenance slot — the kapae filter column.
            source_drawer_id=r.get("turn_key"),
            adapter_name=ADAPTER_NAME,
        )
        added += 1
    print(json.dumps({"added": added, "adapter": ADAPTER_NAME}))


def cmd_invalidate(args):
    kg = _kg(args.palace)
    n = 0
    for r in read_ndjson_records(args.patchfile):
        kg.invalidate(r["subject"], r["predicate"], r["object"], ended=r.get("ended"))
        n += 1
    print(json.dumps({"invalidated": n}))


def cmd_kapae(args):
    # Rewind a turn = close (never drop) every edge that turn minted. We filter by the
    # turn-DAG key in source_drawer_id and set valid_to on the still-open rows only —
    # append-only, idempotent (a re-run closes nothing new). A direct UPDATE on the KG's
    # own sqlite file (WAL: concurrent with the daemon's handle); the public invalidate()
    # filters only by S/P/O, so it cannot retract a whole turn — this can.
    ended = args.ended or date.today().isoformat()
    path = _kg_path(args.palace)
    KnowledgeGraph(db_path=path)  # ensure the schema exists before we touch the file
    conn = sqlite3.connect(path)
    try:
        cur = conn.execute(
            "UPDATE triples SET valid_to=? WHERE source_drawer_id=? AND valid_to IS NULL",
            (ended, args.turn_key),
        )
        closed = cur.rowcount
        conn.commit()
    finally:
        conn.close()
    print(json.dumps({"closed": closed, "turn_key": args.turn_key, "ended": ended}))


def main():
    ap = argparse.ArgumentParser(description="mempalace worldline edge-DAG I/O")
    ap.add_argument("--palace", default=None, help="palace dir; KG = <palace>/knowledge_graph.sqlite3")
    sub = ap.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("add")
    a.add_argument("patchfile")
    a.set_defaults(fn=cmd_add)

    i = sub.add_parser("invalidate")
    i.add_argument("patchfile")
    i.set_defaults(fn=cmd_invalidate)

    k = sub.add_parser("kapae")
    k.add_argument("--turn-key", required=True, dest="turn_key")
    k.add_argument("--ended", default=None)
    k.set_defaults(fn=cmd_kapae)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
