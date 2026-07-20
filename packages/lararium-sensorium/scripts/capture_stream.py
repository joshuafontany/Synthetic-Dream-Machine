"""capture_stream — the composable capture PIPELINE (a nameless entity that #has a cap-stack).

A Pipeline is NAMELESS: its identity IS its composed cap-stack —
  · source-cap  : callable(pointer) -> iterable of records {seq, cid, text, metadata, [vector]}
  · land-cap    : .is_landed(cid) -> bool  +  .land(cid, text, vector, metadata)   (the durable sink)
  · embed-cap   : callable(text) -> vector  (embed-in-engine; None => caller-vector, the record carries it)
  · schema      : rides the land-cap's store config (required_keys / expected_dim), not a separate cap
  · plane-caps  : optional further planes (structure · form) that ride the SAME records after the
                  content leg lands — each plane derives by its OWN mechanism (plane_fanout.py)

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

Meme: lar:///ha.ka.ba/lararium/sensorium/capture-stream (the composable pipeline; content_io serves as the land-cap).
"""
from __future__ import annotations

import os

from capture_drain import DrainLedger
from content_io import ContentFloorError

# The embed BATCH window — how many un-landed records to buffer and hand the embedder in ONE call. The model
# sub-batches internally (32), so feeding it one text at a time starves the GPU (the 18%-utilization pour);
# a window amortizes the call across many texts and the vectors + stream order stay identical. 256 rides ~8×
# the internal sub-batch, memory-bounded (a window of texts + vectors, cleared each flush). A lossless
# batch-DEPTH servo — the dual of the coalesce window's AIMD — would tune this from cost; that stays a follow.
_EMBED_BATCH = int(os.environ.get("LARES_EMBED_BATCH", "256"))


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

    def land_many(self, records: "list[tuple]") -> dict:
        """Batch land — delegate to the store's put_many: validate each record's floors, isolate a per-record
        poison to `failed`, upsert every valid record in ONE call. Returns {landed, failed}; run_pass commits
        only the landed seqs, so the watermark advances exactly as the per-record land leaves it."""
        return self._store.put_many([(c, t, v, m or {}) for c, t, v, m in records])

    def land_many_is_consistent(self) -> bool:
        """The Liskov-safety gate: run_pass BATCHES a fresh-land window through land_many ONLY when this cap's
        land AND land_many are the un-overridden base methods — so a subclass that hooks land() (a poison
        injector, a policy overlay) whose meaning land_many would BYPASS reports False and rides the per-record
        land() path instead. Batch the write, never a divergent decision."""
        return (type(self).land is ContentStoreLandCap.land
                and type(self).land_many is ContentStoreLandCap.land_many)

    def is_fatal(self, exc: BaseException) -> bool:
        """Whether a land throw MUST abort the pass rather than ride the poison-guard: a SYSTEMIC
        embedder-identity floor (wrong dim/model) poisons EVERY record, so it fails LOUD — never hides
        behind a growing backlog. A per-record data poison (bad vector, missing schema key) returns False
        and rides `failed`. The generic Pipeline duck-types this (a minimal land-cap without it catches all)."""
        return isinstance(exc, ContentFloorError)

    def stored_chain(self, cid: str):
        """The `lar_chain` the DURABLE row for `cid` carries, else None — the rewind-compare read. A
        landed cid whose stored chain differs from the re-derivation marks an edited/answered prefix the
        content-INDEPENDENT cid alone would silent-skip."""
        row = self._store.get(cid)
        return None if row is None else (row.get("metadata") or {}).get("lar_chain")

    def reland(self, cid: str, text: str, vector, metadata: dict) -> str:
        """The REWIND cure for an already-landed cid whose re-derived text DIVERGED. On the IMMUTABLE
        Memory ground (append_only) a committed block never overwrites — RETRACT the stale (kapae-mute,
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

    def __init__(self, *, source, land, embed=None, schema=None, planes=None) -> None:
        self._source = source   # callable(pointer) -> iterable of records
        self._land = land       # a land-cap (is_landed / land)
        self._embed = embed     # callable(text)->vector, or None for caller-vector
        self._schema = schema   # informational; the land-cap's store enforces it
        # THE PLANE FAN-OUT (RUN-ARC #1, the keystone): further plane caps that ride the
        # SAME records the content leg lands — each derives its plane by its OWN mechanism
        # (structure: parse-router; form: induced grammar), NEVER from the content vector
        # (the independence law — a co-jump over shared-derivation planes reads as artifact).
        # A plane cap #has: `.name` (str) · `.land(rec)` (per-record, owns its OWN
        # idempotence) · optional `.finish() -> dict` (the pass-end batch step + summary).
        self._planes = list(planes) if planes else []

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
        store permits) — NEVER a silent skip.

        THE POISON-GUARD (the SILENT-TAIL-ABORT cure, C2): one un-landable record (a store reject, an
        embed throw, a schema violation) MUST NOT abort the whole pass and swallow the tail behind it. So
        each record's land rides a try/except: a throw NEVER commits that seq — the watermark HOLDS below
        it (the gap blocks the contiguous frontier) and `backlog` surfaces the stall — the pass records the
        poison in `failed` and CONTINUES, so the tail past it still lands. A re-run cleanly re-attempts
        (is_landed skips the durable prefix; a transient poison lands, a hard one re-fails and stays in
        backlog). Returns the pass summary."""
        drain = DrainLedger()
        # A land-cap that carries the rewind pair (stored_chain + reland) arms the guard; a minimal one
        # (is_landed/land only) rides the plain skip — the guard never crashes a generic pipeline.
        rewind_aware = hasattr(self._land, "stored_chain") and hasattr(self._land, "reland")
        seen = landed = skipped = relanded = retracted = 0
        failed: list = []
        plane_failed: dict = {p.name: [] for p in self._planes}
        # A land-cap that CERTIFIES its land/land_many consistency batches the fresh writes: fresh records
        # buffer, then one put_many lands the window — the store-side counterpart to the embed batch. A cap
        # that hooks land() reports False (the Liskov-safety gate) and rides the per-record land() path, so a
        # subclass's land semantics are never bypassed. Batch the WRITE, never a divergent decision.
        batch_land = (self._land.land_many
                      if getattr(self._land, "land_many_is_consistent", None) and self._land.land_many_is_consistent()
                      else None)
        buf: list = []

        def _flush() -> None:
            """Land the buffered fresh records in ONE batched write, then advance the drain-ledger per record —
            EXACTLY the watermark the per-record land leaves: a landed seq commits (planes fan out), a
            poison-isolated one records to `failed` and stays staged-not-committed (backlog surfaces it). A
            SYSTEMIC floor raises out of put_many BEFORE any upsert, so nothing half-commits."""
            nonlocal landed
            if not buf:
                return
            res = batch_land([(r["cid"], r.get("text", ""), self._vector_for(r), r.get("metadata", {}))
                              for r in buf])
            done = set(res["landed"])
            errs = {f["cid"]: f["error"] for f in res["failed"]}
            for r in buf:
                if r["cid"] in done:
                    drain.commit(r["seq"])         # durable after the batch upsert — advance the watermark
                    landed += 1
                    self._fan_out(r, plane_failed)
                else:                              # a per-record poison: leave the seq staged-not-committed
                    failed.append({"seq": r["seq"], "cid": r["cid"],
                                   "error": errs.get(r["cid"], "batch: not landed")})
            buf.clear()

        for rec in self._embed_windows(self._source(pointer)):
            seen += 1
            seq, cid = rec["seq"], rec["cid"]
            try:
                drain.stage(seq, cid)
                if batch_land is not None and not self._land.is_landed(cid):
                    buf.append(rec)                # a FRESH record → buffer for the batched land (common path)
                    if len(buf) >= _EMBED_BATCH:
                        _flush()
                    continue
                _flush()                           # an already-landed (or non-batch) record → flush fresh FIRST (seq order)
                if self._land.is_landed(cid):
                    # Pay the chain-compare ONLY on an already-landed cid (the common no-divergence path
                    # stays cheap). A held chain (or a non-rewind-aware land-cap) = the re-derivation no-op.
                    if not rewind_aware or self._land.stored_chain(cid) == (rec.get("metadata") or {}).get("lar_chain"):
                        drain.commit(seq)      # already durable, chain holds — the re-derivation no-op
                        skipped += 1
                        self._fan_out(rec, plane_failed)   # planes re-offer (each skips its own durable prefix)
                        continue
                    # a REWIND — the stored text diverged from this re-derivation: never silent-skip it.
                    cure = self._land.reland(cid, rec.get("text", ""), self._vector_for(rec),
                                             rec.get("metadata", {}))
                    drain.commit(seq)          # the retract/re-land IS durable — advance the watermark
                    if cure == "relanded":
                        relanded += 1
                    else:
                        retracted += 1
                    self._fan_out(rec, plane_failed)
                    continue
                # No batch door (a hooked or minimal land-cap) — the per-record fresh land.
                self._land.land(cid, rec.get("text", ""), self._vector_for(rec), rec.get("metadata", {}))
                drain.commit(seq)              # advance the watermark AFTER the durable land (accept != land)
                landed += 1
                self._fan_out(rec, plane_failed)
            except Exception as exc:  # noqa: BLE001 — the poison-guard: one bad record never aborts the tail
                # A SYSTEMIC floor violation (wrong embedder) propagates LOUD — never buried in `failed`.
                is_fatal = getattr(self._land, "is_fatal", None)
                if is_fatal is not None and is_fatal(exc):
                    raise
                # else a per-record poison: DON'T commit — the seq stays staged-not-committed, so the
                # watermark holds below it and backlog surfaces the stall; record it, carry the pass on.
                failed.append({"seq": seq, "cid": cid, "error": f"{type(exc).__name__}: {exc}"})
                continue
        _flush()   # land the final partial window
        summary = {
            "seen": seen,
            "landed": landed,
            "skipped": skipped,
            "relanded": relanded,
            "retracted": retracted,
            "failed": failed,
            "watermark": drain.watermark(),
            "backlog": drain.backlog(),
            "audit": drain.exactly_once_audit(),
        }
        if self._planes:
            summary["planes"] = self._finish_planes(plane_failed)
        return summary

    def _fan_out(self, rec, plane_failed: dict) -> None:
        """Offer the record to every plane cap AFTER its content leg resolves durable. A record whose
        content leg failed never fans out (the planes ride landed units only); a plane throw rides the
        poison-guard spirit — recorded per plane, the pass and the other planes carry on. The fan-out
        runs on SKIPPED records too: each plane owns its own is-landed check, so a crash between the
        content land and a plane land cures on the next pass (the same re-derivation discipline)."""
        for p in self._planes:
            try:
                p.land(rec)
            except Exception as exc:  # noqa: BLE001 — one plane poison never aborts the pass or its peers
                plane_failed[p.name].append({"cid": rec["cid"], "error": f"{type(exc).__name__}: {exc}"})

    def _finish_planes(self, plane_failed: dict) -> dict:
        """Close each plane's pass: run its batch step (`finish`, e.g. the form induction) and fold the
        per-record plane failures into its summary. A finish throw surfaces as the plane's error —
        loud in the summary, never a pass abort (the content plane already stands durable)."""
        out: dict = {}
        for p in self._planes:
            finish = getattr(p, "finish", None)
            summary: dict = {}
            if finish is not None:
                try:
                    summary = finish() or {}
                except Exception as exc:  # noqa: BLE001 — the plane's close surfaces, the pass stands
                    summary = {"error": f"{type(exc).__name__}: {exc}"}
            if plane_failed.get(p.name):
                summary = {**summary, "failed": plane_failed[p.name]}
            out[p.name] = summary
        return out

    def _embed_windows(self, source):
        """Wrap the record source to BATCH embedding: buffer up to `_EMBED_BATCH` records, embed the texts of
        those that need a vector — no caller-vector, not already durable — in ONE engine call (order
        preserved), stash each on its record as `_vector`, then yield the buffer in order. The GPU sees a
        window per call instead of one text at a time; the vectors and the stream order stay identical.
        Passes straight through when no batched embedder rides (a caller-vector pipeline) or the cap predates
        `embed_many`. The rare rewind/re-land path falls back to the scalar embed in `_vector_for`."""
        embed_many = getattr(self._embed, "embed_many", None) if self._embed is not None else None
        if embed_many is None:
            yield from source
            return
        buf: list = []
        for rec in source:
            buf.append(rec)
            if len(buf) >= _EMBED_BATCH:
                yield from self._flush_embed_window(buf, embed_many)
                buf = []
        yield from self._flush_embed_window(buf, embed_many)

    def _flush_embed_window(self, buf, embed_many):
        """Embed the window's un-landed, un-vectored records in one call and stash each vector on its record.
        A record already durable (is_landed) or carrying a caller-vector never re-embeds — so a re-run pays no
        wasted embedding, only the fresh tail does. Returns the buffer in order for the caller to yield."""
        need = [r for r in buf
                if r.get("vector") is None and "text" in r and not self._land.is_landed(r["cid"])]
        if need:
            for r, vec in zip(need, embed_many([r["text"] for r in need])):
                r["_vector"] = vec
        return buf

    def _vector_for(self, rec):
        """The record's vector — a window-prefetched batch vector, else the caller-supplied one, else
        embed-in-engine (the warm model) when the pipeline carries an embed-cap; None when neither (a
        caller-vector land-cap tolerates it)."""
        if "_vector" in rec:
            return rec["_vector"]                 # the batch window already embedded this record
        vector = rec.get("vector")
        if vector is None and self._embed is not None:
            vector = self._embed(rec["text"])     # the rare rewind/re-land path — one warm embed
        return vector


def compose_pipeline(*, source, land, embed=None, schema=None, planes=None) -> Pipeline:
    """Compose a pipeline instance from a cap-stack. The AI-session-memory instance composes a
    transcript source-cap + a ContentStoreLandCap over the sovereign session palace + an embed-in-
    engine cap + the session-memory schema; a corpus-on-disk instance swaps the source-cap + palace
    and MAY compose plane caps (structure/form) that fan out over the same records."""
    return Pipeline(source=source, land=land, embed=embed, schema=schema, planes=planes)
