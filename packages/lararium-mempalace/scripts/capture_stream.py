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

Meme: lar:///ha.ka.ba/@lararium/sensorium/capture-stream (the composable pipeline; content_io serves as the land-cap).
"""
from __future__ import annotations

from capture_drain import DrainLedger


class ContentStoreLandCap:
    """The land-cap over content_io's ContentStore: is_landed = the cid already holds a durable row;
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

    def stored_chain(self, cid: str):
        """The `lar_chain` the DURABLE row for `cid` carries, else None — the rewind-compare read. A
        landed cid whose stored chain differs from the re-derivation marks an edited/answered prefix the
        content-INDEPENDENT cid alone would silent-skip."""
        row = self._store.get(cid)
        return None if row is None else (row.get("metadata") or {}).get("lar_chain")

    def reland(self, cid: str, text: str, vector, metadata: dict) -> str:
        """The REWIND cure for an already-landed cid whose re-derived text DIVERGED. On the IMMUTABLE
        Memory ground (append_only) a committed atom never overwrites — RETRACT the stale (kapae-mute,
        metadata-only, so it stops recalling) and let the fresh-cid append-vector re-land ride a later
        commit; on a MUTABLE store the re-land OVERWRITES in place (the new text supersedes the stale).
        Returns "retracted" (immutable ground) or "relanded" (mutable overwrite)."""
        if self._store.append_only:
            self._store.mute(cid)          # RETRACT — the stale stops recalling; fresh-cid re-land deferred
            return "retracted"
        self._store.put(cid, text, vector, metadata or {})   # RE-LAND — the overwrite supersedes the stale
        return "relanded"


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
        re-run lands nothing new (the re-derivation crash-cure).

        THE REWIND GUARD (the SILENT-CORRUPT cure): the cid keys on source+chunk (content-INDEPENDENT),
        so an edited/answered prefix re-derives the SAME cid — is_landed ALONE would skip the new text
        and keep serving the stale. So on an already-landed cid this compares the re-derived `lar_chain`
        (each link binds its text + its predecessor) to the STORED one: a match confirms the durable row
        IS this text (the cheap no-op — the common path pays only this compare), a divergence surfaces a
        rewind at this turn and rides the land-cap's `reland` cure (retract the stale, re-land where the
        store permits) — NEVER a silent skip. Returns the pass summary."""
        drain = DrainLedger()
        # A land-cap that carries the rewind pair (stored_chain + reland) arms the guard; a minimal one
        # (is_landed/land only) rides the plain skip — the guard never crashes a generic pipeline.
        rewind_aware = hasattr(self._land, "stored_chain") and hasattr(self._land, "reland")
        landed = skipped = relanded = retracted = 0
        for rec in self._source(pointer):
            seq, cid = rec["seq"], rec["cid"]
            drain.stage(seq, cid)
            if self._land.is_landed(cid):
                # Pay the chain-compare ONLY on an already-landed cid (the common no-divergence path
                # stays cheap). A held chain (or a non-rewind-aware land-cap) = the re-derivation no-op.
                if not rewind_aware or self._land.stored_chain(cid) == (rec.get("metadata") or {}).get("lar_chain"):
                    drain.commit(seq)      # already durable, chain holds — the re-derivation no-op
                    skipped += 1
                    continue
                # a REWIND — the stored text diverged from this re-derivation: never silent-skip it.
                cure = self._land.reland(cid, rec.get("text", ""), self._vector_for(rec),
                                         rec.get("metadata", {}))
                drain.commit(seq)          # the retract/re-land IS durable — advance the watermark
                if cure == "relanded":
                    relanded += 1
                else:
                    retracted += 1
                continue
            self._land.land(cid, rec.get("text", ""), self._vector_for(rec), rec.get("metadata", {}))
            drain.commit(seq)              # advance the watermark AFTER the durable land (accept != land)
            landed += 1
        return {
            "landed": landed,
            "skipped": skipped,
            "relanded": relanded,
            "retracted": retracted,
            "watermark": drain.watermark(),
            "backlog": drain.backlog(),
            "audit": drain.exactly_once_audit(),
        }

    def _vector_for(self, rec):
        """The record's vector — the caller-supplied one, else embed-in-engine (the warm model) when the
        pipeline carries an embed-cap; None when neither (a caller-vector land-cap tolerates it)."""
        vector = rec.get("vector")
        if vector is None and self._embed is not None:
            vector = self._embed(rec["text"])   # embed-in-engine (the warm model)
        return vector


def compose_pipeline(*, source, land, embed=None, schema=None) -> Pipeline:
    """Compose a pipeline instance from a cap-stack. The AI-session-memory instance composes a
    transcript source-cap + a ContentStoreLandCap over the sovereign session palace + an embed-in-
    engine cap + the session-memory schema; a corpus-on-disk instance swaps the source-cap + palace."""
    return Pipeline(source=source, land=land, embed=embed, schema=schema)
