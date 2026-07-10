/**
 * capture-drain — the TRAILING-WATERMARK drain-ledger: the pure invariant that stops the
 * capture leak (a staged turn never lands unless the store confirms it). The law: acknowledge work
 * ONLY after its effect is durable; make the effect idempotent so acknowledgement can be conservative.
 *
 * THE LAW (one line, four systems — Kafka offsets · transactional outbox · WAL checkpoint · Flink
 * barriers): the watermark advances FROM the store's confirmed commit, NEVER from dequeue/stage.
 * A turn stays in the surge-tank (WAL) until the store returns commit; only then may the watermark
 * step past it. This single inversion (advance-AFTER, not advance-before) is the cure.
 *
 * The shape (Kafka consumer-offset model): turns arrive in order, each with a monotonic `seq` AND a
 * stable content-hash `key` (the idempotent-upsert key — Drain's "turn-key" == Loom's "content-hash
 * upsert", one key). The watermark = the highest seq S such that EVERY turn ≤ S is committed (the
 * contiguous frontier); a gap BLOCKS advance. On restart, replay from the watermark: turns above a
 * gap re-run, and the content-hash upsert makes that a no-op (effectively-once by composition).
 *
 * The ACCEPT≠LAND capability boundary (Raft `matchIndex`/`commitIndex`): `staged` (accept) and
 * `committed` (land) sit in SEPARATE fields with SEPARATE write-sites — stage() may only touch
 * staged, commit() only committed — so the watermark cannot be advanced from the accept path (the
 * old leak becomes unrepresentable). And the watermark advances by SCANNING the committed frontier,
 * never by per-event increment: a scan is replay-idempotent, an increment is not.
 *
 * Backpressure as an HONEST signal (never silent loss): `backlog()` = staged − committed. WAL
 * reclaim couples to the watermark, so a stalled store shows as a GROWING, bounded, monitorable
 * backlog — the failure surfaces instead of the watermark racing ahead over un-landed turns.
 *
 * PURE + platform-blind: no store, no clock, no IO — the caller drives stage()/commit() from the
 * real nalu gate + store confirmations. This module owns only the ordering invariant.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/capture-drain
 */

/** One turn's place in the drain: its arrival order + its idempotent store key. */
export interface DrainEntry {
  /** monotonic arrival sequence (the offset the watermark walks). */
  readonly seq: number;
  /** stable content-hash id — the idempotent-upsert key (replay-safe re-run). */
  readonly key: string;
}

/**
 * The drain-ledger. Immutable-transition style (every op returns a new ledger), so it composes
 * with the pure keels. Tracks staged (arrived, in the WAL) vs committed (durable in the store),
 * and derives the trailing watermark + the honest backlog.
 */
export interface DrainLedger {
  /** every staged turn by seq → key (arrived; may or may not be committed yet). */
  readonly staged: ReadonlyMap<number, string>;
  /** the seqs whose store-effect the store has CONFIRMED durable. */
  readonly committed: ReadonlySet<number>;
}

/** A fresh, empty ledger. */
export function emptyDrain(): DrainLedger {
  return { staged: new Map(), committed: new Set() };
}

/**
 * Stage a turn — it arrived at the gate and rode into the WAL (surge-tank), NOT yet committed.
 * Idempotent on seq (re-staging the same seq is a no-op; the key must match — a differing key on a
 * seen seq throws, catching a mis-keyed replay). Staging NEVER advances the watermark.
 */
export function stage(l: DrainLedger, entry: DrainEntry): DrainLedger {
  const seen = l.staged.get(entry.seq);
  if (seen !== undefined) {
    if (seen !== entry.key) throw new Error(`drain: seq ${entry.seq} re-staged with a different key (${seen} → ${entry.key})`);
    return l; // idempotent
  }
  const staged = new Map(l.staged);
  staged.set(entry.seq, entry.key);
  return { ...l, staged };
}

/**
 * Commit a turn — the store CONFIRMED its effect durable. Only now may the watermark move past it.
 * Idempotent on seq. A commit for an un-staged seq throws (the store can't confirm what never
 * arrived — a bug the ledger refuses to hide).
 */
export function commit(l: DrainLedger, seq: number): DrainLedger {
  if (!l.staged.has(seq)) throw new Error(`drain: commit of un-staged seq ${seq}`);
  if (l.committed.has(seq)) return l; // idempotent
  const committed = new Set(l.committed);
  committed.add(seq);
  return { ...l, committed };
}

/**
 * The TRAILING WATERMARK — the highest seq S such that EVERY seq in 1..S is committed (the
 * contiguous frontier). A gap (an un-committed seq below a committed one) BLOCKS advance, so the
 * watermark never leaps over an un-landed turn. Empty / a gap at 1 → 0 (nothing safely passed).
 * Assumes seqs start at 1 and arrive densely (the gate assigns them); a sparse start reads as a gap.
 */
export function watermark(l: DrainLedger): number {
  let w = 0;
  while (l.committed.has(w + 1)) w++;
  return w;
}

/**
 * The BACKLOG — staged-but-not-committed turns (the honest pressure signal). If this grows, the
 * drain is stalling: surface it (backpressure), never let the watermark hide it. Returns the
 * pending seqs, ascending.
 */
export function backlog(l: DrainLedger): number[] {
  const pending: number[] = [];
  for (const seq of l.staged.keys()) if (!l.committed.has(seq)) pending.push(seq);
  return pending.sort((a, b) => a - b);
}

/**
 * The RECLAIMABLE keys — WAL entries at or below the watermark, safe to truncate (their effect is
 * durably in the store, and the watermark guarantees no gap below them). Reclaim couples to real
 * landings, so a stalled store simply stops reclaiming (the WAL grows, bounded + visible) rather
 * than the watermark racing ahead. Returns the content-hash keys to drop from the surge-tank.
 */
export function reclaimable(l: DrainLedger): string[] {
  const w = watermark(l);
  const keys: string[] = [];
  for (const [seq, key] of l.staged) if (seq <= w) keys.push(key);
  return keys;
}

/**
 * The REPLAY SET on restart — the staged turns strictly ABOVE the watermark (the ones a crash may
 * have left un-landed). Re-run these through the store; the content-hash upsert makes already-landed
 * ones a no-op (effectively-once). Returns entries ascending by seq.
 */
export function replaySet(l: DrainLedger): DrainEntry[] {
  const w = watermark(l);
  const out: DrainEntry[] = [];
  for (const [seq, key] of l.staged) if (seq > w) out.push({ seq, key });
  return out.sort((a, b) => a.seq - b.seq);
}

/**
 * The EXACTLY-ONCE erasure audit (Landauer: the commit IS the one logically-irreversible bit — the
 * license-erasure — so a real land erases exactly one license per landed effect). Physically: each
 * committed seq must carry a DISTINCT content-key; a key committed under two seqs = one license
 * erased twice = a duplicate land (the effectively-once composition broke). `ok` iff distinct-keys ==
 * committed-count; `duplicates` names the keys that landed more than once. A drift here flags a
 * real-world duplicate, not a replay no-op (replay never commits — it re-stages, the upsert absorbs it).
 */
export function exactlyOnceAudit(l: DrainLedger): { readonly committed: number; readonly distinctKeys: number; readonly ok: boolean; readonly duplicates: string[] } {
  const seen = new Map<string, number>();
  for (const seq of l.committed) {
    const key = l.staged.get(seq);
    if (key === undefined) continue; // commit() forbids un-staged seqs; defensive
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const duplicates: string[] = [];
  for (const [key, n] of seen) if (n > 1) duplicates.push(key);
  return { committed: l.committed.size, distinctKeys: seen.size, ok: duplicates.length === 0, duplicates: duplicates.sort() };
}
