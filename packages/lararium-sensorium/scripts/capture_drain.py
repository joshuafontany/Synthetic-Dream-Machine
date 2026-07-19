"""capture_drain — the TRAILING-WATERMARK drain-ledger (py port of the mesh capture-drain.ts).

THE LAW (one line, four systems — Kafka offsets · transactional outbox · WAL checkpoint · Flink
barriers): the watermark advances FROM the store's confirmed commit, NEVER from stage/accept. A turn
stays pending until the store returns commit; only then may the watermark step past it. This one
inversion (advance-AFTER, not advance-before) CURES the capture leak.

ACCEPT != LAND (Raft matchIndex/commitIndex): staged (accept) and committed (land) hold SEPARATE
write-sites — stage() touches only staged, commit() only committed — so the watermark cannot advance
from the accept path (the old leak becomes unrepresentable). The watermark advances by SCANNING the
contiguous committed frontier, never by per-event increment — a scan is replay-idempotent, an
increment is not.

In the capture-engine this orders the landing within one processing pass + carries the exactly-once
audit; the crash-safety itself rests on the durable transcript (the source) + content_io (the sink) +
re-derivation, NOT on this in-memory ledger. Pure: no store, no clock, no IO — the engine drives
stage()/commit() from the real transcript read + content_io land confirmations.

Meme: lar:///ha.ka.ba/lararium/mesh/capture-drain (py twin).
"""
from __future__ import annotations


class DrainLedger:
    """Tracks staged (arrived) vs committed (durable in content_io) and derives the trailing
    watermark + the honest backlog. Mutable (the streaming engine holds one and drives it), unlike
    the TS immutable-transition twin — the semantics match op-for-op."""

    def __init__(self) -> None:
        self._staged: dict[int, str] = {}   # seq -> content-hash key (the idempotent-upsert key)
        self._committed: set[int] = set()   # seqs whose store-effect the store CONFIRMED durable

    def stage(self, seq: int, key: str) -> None:
        """Arrived at the gate, rode into the pass; NOT yet committed. Idempotent on seq (a differing
        key on a seen seq RAISES — a mis-keyed replay the ledger refuses to hide). NEVER advances the
        watermark."""
        seen = self._staged.get(seq)
        if seen is not None:
            if seen != key:
                raise ValueError(f"drain: seq {seq} re-staged with a different key ({seen} -> {key})")
            return  # idempotent
        self._staged[seq] = key

    def commit(self, seq: int) -> None:
        """The store CONFIRMED durable — only now may the watermark move past it. Idempotent. A commit
        of an un-staged seq RAISES (the store can't confirm what never arrived)."""
        if seq not in self._staged:
            raise ValueError(f"drain: commit of un-staged seq {seq}")
        self._committed.add(seq)  # set-add is idempotent

    def watermark(self) -> int:
        """The highest seq S such that EVERY seq in 1..S is committed (the contiguous frontier); a gap
        BLOCKS advance, so the watermark never leaps an un-landed turn. Empty / gap at 1 -> 0."""
        w = 0
        while (w + 1) in self._committed:
            w += 1
        return w

    def backlog(self) -> list[int]:
        """Staged-but-not-committed seqs (the honest pressure signal), ascending. A growing backlog
        surfaces a stalling sink instead of the watermark racing over un-landed turns."""
        return sorted(seq for seq in self._staged if seq not in self._committed)

    def reclaimable(self) -> list[str]:
        """The keys at/below the watermark — safe to drop from the pass (durable in the store, no gap
        below). Couples reclaim to real landings."""
        w = self.watermark()
        return [key for seq, key in self._staged.items() if seq <= w]

    def replay_set(self) -> list[tuple[int, str]]:
        """The staged turns strictly ABOVE the watermark (a crash may have left them un-landed). Re-run
        these; the content-hash upsert makes already-landed ones a no-op (effectively-once). Ascending."""
        w = self.watermark()
        return sorted(((seq, key) for seq, key in self._staged.items() if seq > w), key=lambda e: e[0])

    def exactly_once_audit(self) -> dict:
        """Landauer erasure audit: each committed seq must carry a DISTINCT content-key; a key committed
        under two seqs = one land counted twice (the effectively-once composition broke). ok iff
        distinct-keys == committed-count; `duplicates` names keys landed more than once. A drift flags a
        real duplicate land, NOT a replay no-op (replay re-stages; the upsert absorbs it, never commits twice)."""
        seen: dict[str, int] = {}
        for seq in self._committed:
            key = self._staged.get(seq)
            if key is None:
                continue  # commit() forbids un-staged seqs; defensive
            seen[key] = seen.get(key, 0) + 1
        duplicates = sorted(k for k, n in seen.items() if n > 1)
        return {"committed": len(self._committed), "distinct_keys": len(seen), "ok": not duplicates, "duplicates": duplicates}
