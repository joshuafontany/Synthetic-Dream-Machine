#!/usr/bin/env python3
"""kg_io — the WORLDLINE edge-DAG side of the mempalace knowledge graph.

The durable projection of the agent worldline's happened-before (agent-worldline
#attribution): spawn → a prov:Delegation triple, inject → a prov:Communication
triple, handback → the spawn edge's valid-interval closed, kapae (rewind) → every
edge of a retracted turn closed (valid_to set, never deleted — history kept).

This is OUR script (packages/lararium-sensorium/scripts), NOT the vendored submodule:
it CALLS the mempalace KnowledgeGraph public API (add_triple / invalidate) the same
way loci_io.py calls the collection. We never edit mempalace/.

  add  PATCHFILE       <- NDJSON {subject,predicate,object,valid_from?,valid_to?,
                          turn_key?,source_file?,confidence?} ; one kg.add_triple each.
                          turn_key rides source_drawer_id (the kapae filter slot).
                          SINK-idempotent over the WHOLE lifecycle: an identical S/P/O
                          triple with the SAME valid_from — open (add_triple's own
                          still-open dedup) or already CLOSED (a re-observed
                          spawn->handback pair) — skips, so a re-run re-adds nothing.
  invalidate PATCHFILE <- NDJSON {subject,predicate,object,ended?} ; one kg.invalidate
                          each — closes a triple's valid_to by S/P/O (the handback close).
                          SINK-idempotent: close-of-already-closed no-ops (only a row
                          with an OPEN valid_to closes; the count reports real closes).
  kapae --turn-key K --ended T   (--ended = a logical close-mark; required, clock-purity)
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

from mempalace.config import sanitize_iso_temporal
from mempalace.knowledge_graph import KnowledgeGraph, DEFAULT_KG_PATH

# Two cap-stacks compose here: the BATCH cmds (add/invalidate/kapae) #has the light
# NDJSON-reader + path caps; the SERVE holder (the /mcp lares KG surface) #has the full
# serve stack (loop/flock/idle-reap) + the read ops (query/timeline/stats). Both CONSUME
# the one KnowledgeGraph — read+write+serve parity, their code behind the boundary.
from sidecar_caps import canonical_path, read_ndjson_records, idle_ttl_seconds, make_dispatch, run_sidecar

ADAPTER_NAME = "lares-worldline"
IDLE_TTL_ENV = "KG_IDLE_TTL"
DEFAULT_IDLE_TTL_SECONDS = 600.0
_LOCK_PREFIX = "kg_serve"
_TRIPLE_KWARGS = ("valid_from", "valid_to", "confidence", "source_closet", "source_file", "source_drawer_id", "adapter_name")


def _kg_path(palace):
    # Match mcp_server._resolve_kg_path: with a palace flag the KG lives INSIDE the
    # palace dir; without one, the package default. Canonicalize so a symlinked /
    # relative spelling addresses the SAME sqlite file (palace-path.ts's discipline).
    if palace:
        return canonical_path(os.path.join(os.path.expanduser(palace), "knowledge_graph.sqlite3"))
    return DEFAULT_KG_PATH


def _kg(palace):
    return KnowledgeGraph(db_path=_kg_path(palace))


# --- the SERVE holder (the /mcp lares KG surface) — full read+write over the one KnowledgeGraph ---


class Kg:
    """CONSUME KnowledgeGraph over one palace's kg sqlite for the persistent NDJSON surface: the
    bitemporal read ops (query_entity/query_relationship/timeline/stats) beside add/invalidate.
    No LLM (the graph STORE; extraction that fills it is a separate, LLM-gated step)."""

    def __init__(self, palace):
        self._kg = _kg(palace)

    def add_entity(self, name, entity_type="unknown", properties=None):
        return self._kg.add_entity(name, entity_type, properties or {})

    def add_triple(self, subject, predicate, obj, **kw):
        return self._kg.add_triple(subject, predicate, obj, **{k: kw[k] for k in _TRIPLE_KWARGS if k in kw})

    def invalidate(self, subject, predicate, obj, ended=None):
        return self._kg.invalidate(subject, predicate, obj, ended)

    def query_entity(self, name, as_of=None, direction="outgoing"):
        return self._kg.query_entity(name, as_of=as_of, direction=direction)

    def query_relationship(self, predicate, as_of=None):
        return self._kg.query_relationship(predicate, as_of=as_of)

    def timeline(self, entity_name=None):
        return self._kg.timeline(entity_name)

    def stats(self):
        return self._kg.stats()


def _build_ops(k):
    return {
        "ping": lambda req: {"ready": True},
        "add_entity": lambda req: k.add_entity(req["name"], req.get("entity_type", "unknown"), req.get("properties")),
        "add_triple": lambda req: k.add_triple(req["subject"], req["predicate"], req["object"], **{kk: req[kk] for kk in _TRIPLE_KWARGS if kk in req}),
        "invalidate": lambda req: k.invalidate(req["subject"], req["predicate"], req["object"], req.get("ended")),
        "query_entity": lambda req: k.query_entity(req["name"], req.get("as_of"), req.get("direction", "outgoing")),
        "query_relationship": lambda req: k.query_relationship(req["predicate"], req.get("as_of")),
        "timeline": lambda req: k.timeline(req.get("entity_name")),
        "stats": lambda req: k.stats(),
    }


def cmd_serve(args):
    run_sidecar(
        palace=args.palace,
        lock_prefix=_LOCK_PREFIX,
        build_dispatch=lambda: make_dispatch(_build_ops(Kg(args.palace))),
        idle_ttl=idle_ttl_seconds(IDLE_TTL_ENV, DEFAULT_IDLE_TTL_SECONDS),
        singleton_msg="kg_io: another holder already serves this palace kg; exiting (singleton)\n",
    )


def _canon_spo(subject, predicate, obj):
    # Mirror KnowledgeGraph's storage canonicalization (_entity_id + predicate
    # normalization) so our idempotence probes address the SAME stored rows.
    def entity_id(name):
        return name.lower().replace(" ", "_").replace("'", "")

    return entity_id(subject), predicate.lower().replace(" ", "_"), entity_id(obj)


def cmd_add(args):
    kg = _kg(args.palace)
    KnowledgeGraph(db_path=_kg_path(args.palace))  # ensure schema before the probe connection
    conn = sqlite3.connect(_kg_path(args.palace))
    added = 0
    skipped = 0
    try:
        for r in read_ndjson_records(args.patchfile):
            sub_id, pred, obj_id = _canon_spo(r["subject"], r["predicate"], r["object"])
            valid_from = sanitize_iso_temporal(r.get("valid_from"), "valid_from")
            # SINK-side idempotence — the SPAWN law (add_triple dedups an identical
            # still-open triple) extended over the whole lifecycle: the same S/P/O with
            # the SAME interval start already stands, open OR closed (a re-observed
            # spawn->handback pair), so a re-run mints no duplicate row. `IS ?` compares
            # NULL-safe (a dateless edge dedups too).
            existing = conn.execute(
                "SELECT 1 FROM triples WHERE subject=? AND predicate=? AND object=? AND valid_from IS ?",
                (sub_id, pred, obj_id, valid_from),
            ).fetchone()
            if existing:
                skipped += 1
                continue
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
    finally:
        conn.close()
    print(json.dumps({"added": added, "skipped": skipped, "adapter": ADAPTER_NAME}))


def cmd_invalidate(args):
    kg = _kg(args.palace)
    KnowledgeGraph(db_path=_kg_path(args.palace))  # ensure schema before the probe connection
    conn = sqlite3.connect(_kg_path(args.palace))
    n = 0
    already_closed = 0
    try:
        for r in read_ndjson_records(args.patchfile):
            sub_id, pred, obj_id = _canon_spo(r["subject"], r["predicate"], r["object"])
            # SINK-side idempotence (mirrors kapae's `valid_to IS NULL` law): only an OPEN
            # interval closes; close-of-already-closed no-ops — never a valid_to re-churn,
            # and the count reports REAL closes only.
            open_row = conn.execute(
                "SELECT 1 FROM triples WHERE subject=? AND predicate=? AND object=? AND valid_to IS NULL",
                (sub_id, pred, obj_id),
            ).fetchone()
            if not open_row:
                already_closed += 1
                continue
            kg.invalidate(r["subject"], r["predicate"], r["object"], ended=r.get("ended"))
            n += 1
    finally:
        conn.close()
    print(json.dumps({"invalidated": n, "already_closed": already_closed}))


def cmd_kapae(args):
    # Rewind a turn = close (never drop) every edge that turn minted. We filter by the
    # turn-DAG key in source_drawer_id and set valid_to on the still-open rows only —
    # append-only, idempotent (a re-run closes nothing new). A direct UPDATE on the KG's
    # own sqlite file (WAL: concurrent with the daemon's handle); the public invalidate()
    # filters only by S/P/O, so it cannot retract a whole turn — this can.
    # valid_to is BITEMPORAL (worldline-critical, as_of-consumed): the close-mark stays PURE — the
    # caller MUST supply a logical `ended` (a frontier/tick), NEVER a host-clock fallback (no-global-now:
    # an unreliable-witness date would silently corrupt the bitemporal stream). Fail loud if absent.
    ended = args.ended
    if not ended:
        raise SystemExit(
            "kg kapae: --ended (a logical close-mark) is required — valid_to is bitemporal/worldline-critical "
            "and MUST NOT fall back to an unreliable host clock (no-global-now). Supply the turn's close frontier."
        )
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

    sv = sub.add_parser("serve", help="persistent NDJSON KG holder (the /mcp lares KG surface: read+write)")
    sv.add_argument("--palace", required=True)  # serve's own --palace (makeServeSpawn passes `serve --palace <dir>`)
    sv.set_defaults(fn=cmd_serve)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
