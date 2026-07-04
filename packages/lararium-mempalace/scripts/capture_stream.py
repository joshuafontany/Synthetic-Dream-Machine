"""capture_stream — the composable capture PIPELINE (a nameless entity that #has a cap-stack).

A Pipeline is NAMELESS: its identity IS its composed cap-stack —
  · source-cap  : callable(pointer) -> iterable of records {seq, cid, text, metadata, [vector]}
  · land-cap    : .is_landed(cid) -> bool  +  .land(cid, text, vector, metadata)   (the durable sink)
  · embed-cap   : callable(text) -> vector  (embed-in-engine; None => caller-vector, the record carries it)
  · schema      : rides the land-cap's store config (required_keys / expected_dim), not a separate cap

The **AI-session-memory sensorium is instance #1**; other streams / corpuses-on-disk spawn as further
instances (compose a different source-cap + land-palace); the TS @daemon coordinates the fleet's
lifecycles (spawn / supervise / drain / suspend) — it never carries the payload, only points.

CRASH-SAFE BY RE-DERIVATION (the 9-wave braid ruling — no wal.py): the durable source (e.g. the CC
session transcript, owned by the harness) + the durable sink (content_io sqlite, HA-witnessed FULL)
bracket the pipeline. `run_pass` re-reads the source and lands ONLY the un-landed (is_landed skips
already-durable cids), so one pass is IDEMPOTENT and a crash anywhere is cured by re-running the pass
from the still-durable source. The `capture_drain` ledger orders the landing within a pass + carries
the exactly-once audit. The ~37x under-delivery dissolves: a pass processes the FULL source, never a
stalled hot-pool.

Meme: lar:///ha.ka.ba/@lararium/sensorium/capture-stream (the composable pipeline; content_io is the land-cap).
"""
from __future__ import annotations

from capture_drain import DrainLedger


class ContentStoreLandCap:
    """The land-cap over content_io's ContentStore: is_landed = the cid is already a durable row;
    land = the caller-vector put (the store's schema/dim guards ride its constructor). Content-safe
    barrier = the sqlite commit; the HNSW index is derived (rebuild-on-divergence), off the ack path."""

    def __init__(self, store) -> None:
        self._store = store

    @property
    def store(self):
        """The underlying store (the recall read-face reaches it; the land-cap owns the write-face)."""
        return self._store

    def is_landed(self, cid: str) -> bool:
        return self._store.get(cid) is not None

    def land(self, cid: str, text: str, vector, metadata: dict) -> None:
        self._store.put(cid, text, vector, metadata or {})


class Pipeline:
    """A composed capture pipeline (nameless — identity = its cap-stack). run_pass reads the source
    and lands the un-landed into the store, ordered by the drain-ledger; idempotent, so a re-run is
    the crash cure."""

    def __init__(self, *, source, land, embed=None, schema=None) -> None:
        self._source = source   # callable(pointer) -> iterable of records
        self._land = land       # a land-cap (is_landed / land)
        self._embed = embed     # callable(text)->vector, or None for caller-vector
        self._schema = schema   # informational; the land-cap's store enforces it

    def run_pass(self, pointer) -> dict:
        """Process the source once: re-derive the un-landed (is_landed skips already-durable), embed
        (if embed-in-engine) + land each, ordered + audited by the drain-ledger. Idempotent — a
        re-run lands nothing new (the re-derivation crash-cure). Returns the pass summary."""
        drain = DrainLedger()
        landed = skipped = 0
        for rec in self._source(pointer):
            seq, cid = rec["seq"], rec["cid"]
            drain.stage(seq, cid)
            if self._land.is_landed(cid):
                drain.commit(seq)          # already durable — the re-derivation no-op
                skipped += 1
                continue
            vector = rec.get("vector")
            if vector is None and self._embed is not None:
                vector = self._embed(rec["text"])   # embed-in-engine (the warm model)
            self._land.land(cid, rec.get("text", ""), vector, rec.get("metadata", {}))
            drain.commit(seq)              # advance the watermark AFTER the durable land (accept != land)
            landed += 1
        return {
            "landed": landed,
            "skipped": skipped,
            "watermark": drain.watermark(),
            "backlog": drain.backlog(),
            "audit": drain.exactly_once_audit(),
        }


def compose_pipeline(*, source, land, embed=None, schema=None) -> Pipeline:
    """Compose a pipeline instance from a cap-stack. The AI-session-memory instance composes a
    transcript source-cap + a ContentStoreLandCap over the sovereign session palace + an embed-in-
    engine cap + the session-memory schema; a corpus-on-disk instance swaps the source-cap + palace."""
    return Pipeline(source=source, land=land, embed=embed, schema=schema)
