/**
 * parallel-ingest — the Kappa parallel-ingest RUNTIME: the capture research swarm's converged
 * shape made real. Fan out the expensive EMBED across a bounded, AIMD-dialed pool (Loom-Diver's
 * single-writer split); funnel every COMMIT through ONE serial writer tracked by the trailing-
 * watermark drain-ledger (Drain-Diver); structured-concurrency so a run completes clean or fails
 * loud with no orphaned workers.
 *
 * THE SPLIT (the keystone): embedding is CPU/API-bound and embarrassingly parallel — fan it out.
 * The store-commit is the sovereign gate — serialize it through one writer (a contended writer
 * benched ~400× slower; a single ordered writer is trivially deterministic + idempotent). Every
 * stage but the last runs parallel; the last stays a single ordered writer.
 *
 * THE INVARIANTS:
 *   - bounded: at most `dial.limit` embeds in flight (backpressure = the bound; no OOM under skew).
 *   - single-writer: commits run one-at-a-time through the serial lane, in the order embeds finish.
 *   - trailing watermark: the drain-ledger commits a seq only after its store-commit returns; the
 *     result's `watermark` is the contiguous-committed frontier (never ahead of a landing).
 *   - self-tuning: each embed's latency drives the AIMD dial (concurrency-dial) between admissions.
 *   - fail-loud: on any embed/commit rejection, admission STOPS, in-flight work settles (no
 *     orphans), and the run rejects with the first error (structured concurrency's black-box rule).
 *
 * PURE of IO: the `embed` (parallel expensive stage) and `commit` (single-writer sink through the
 * daemon gate) are INJECTED shores — the real ones wire to the embedder + the store; tests inject
 * fakes. `clock` is injected too (default Date.now) so the dial is deterministic under test.
 *
 * KAPPA: the SAME runtime serves live capture AND recovery/harvest — recovery is just this run fed
 * from offset 0. One path, one gate, one set of invariants.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/parallel-ingest
 */

import { emptyDrain, stage, commit as commitDrain, watermark, backlog, type DrainLedger } from "./capture-drain.js";
import { makeDial, observe, type Dial } from "./concurrency-dial.js";
import { canAdmit } from "./credit-gate.js";
import { mergeGate, type Validate, type DeadLetter } from "./merge-gate.js";

/** One item to ingest: its order `seq`, its idempotent content-hash `key`, and the raw `payload` to embed. */
export interface IngestItem<P> {
  readonly seq: number;
  readonly key: string;
  readonly payload: P;
}

/** The injected shores. `embed` runs parallel (expensive); `commit` runs serial (the sovereign gate). */
export interface IngestShores<P, E> {
  /** the parallel expensive stage — payload → embedded (content-embed · structure · form). */
  readonly embed: (item: IngestItem<P>) => Promise<E>;
  /** the SINGLE-WRITER sink — commit the embedded record through the daemon gate to the store. */
  readonly commit: (embedded: E, item: IngestItem<P>) => Promise<void>;
  /** the merge PROOFREAD — validate before the irreversible commit (default: accept all). A reject routes to the dead-letter lane. */
  readonly validate?: Validate<E>;
  /** the dead-letter (ERAD) sink — a rejected item is KEPT here, never dropped (default: collect into the result). */
  readonly deadLetter?: (dl: DeadLetter) => Promise<void> | void;
  /** starting dial (default fresh); the run tunes its limit by embed latency. */
  readonly dial?: Dial;
  /** monotonic clock for latency samples (default Date.now); inject for deterministic tests. */
  readonly clock?: () => number;
}

/** What a run reports — the landed frontier, any residual backlog (0 on clean completion), the tuned limit. */
export interface IngestResult {
  /** the trailing watermark = highest contiguous-RESOLVED seq (committed OR dead-lettered; == items on a clean run). */
  readonly watermark: number;
  /** staged-but-unresolved seqs (empty on clean completion; non-empty only if a run was cut short). */
  readonly backlog: number[];
  /** the count of items committed to the store (validated + license-fresh). */
  readonly committed: number;
  /** the count of items dead-lettered (failed the proofread; KEPT in the ERAD lane, never dropped). */
  readonly deadLettered: number;
  /** the count of items skipped (license already consumed — idempotent no-op). */
  readonly skipped: number;
  /** the dead-letters collected when no `deadLetter` sink was injected (else empty). */
  readonly deadLetters: DeadLetter[];
  /** the dial's final tuned concurrency limit. */
  readonly finalLimit: number;
}

/** A serial lane — runs thunks one-at-a-time in submission order (the single-writer guarantee). */
function serialLane(): { run: <T>(fn: () => Promise<T>) => Promise<T> } {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      const r = tail.then(fn);
      tail = r.then(() => undefined, () => undefined); // keep the lane alive past a rejection
      return r;
    },
  };
}

/**
 * Run the parallel ingest over `items` (assumed seq-ordered, dense from 1). Fans embeds out to the
 * dial's limit, commits serially through the gate, tracks the trailing watermark, self-tunes the
 * dial, and fails loud. Resolves with the {@link IngestResult}; rejects (after in-flight settles)
 * on the first embed/commit error.
 */
export async function runParallelIngest<P, E>(
  items: readonly IngestItem<P>[],
  shores: IngestShores<P, E>,
): Promise<IngestResult> {
  const clock = shores.clock ?? Date.now;
  const validate: Validate<E> = shores.validate ?? (() => ({ ok: true }));
  const collectedDL: DeadLetter[] = [];
  const deadLetterSink = shores.deadLetter ?? ((dl: DeadLetter) => { collectedDL.push(dl); });
  const lane = serialLane();
  const licensed = new Set<string>();               // consumed-license registry (the drain's committed keys)
  let drain: DrainLedger = emptyDrain();
  let dial = shores.dial ?? makeDial();
  let cursor = 0;
  let committed = 0, deadLettered = 0, skipped = 0;
  let firstError: unknown = null;
  const active = new Set<Promise<void>>();

  const processOne = async (item: IngestItem<P>): Promise<void> => {
    drain = stage(drain, { seq: item.seq, key: item.key });
    const t0 = clock();
    const embedded = await shores.embed(item);        // PARALLEL (expensive)
    dial = observe(dial, clock() - t0);              // latency → AIMD dial
    // THE MERGE GATE (serial, single-writer) — validate · consume-license · order · dead-letter.
    await lane.run(async () => {
      const verdict = mergeGate({ seq: item.seq, key: item.key, embedded }, licensed, validate);
      if (verdict.kind === "commit") {
        await shores.commit(embedded, item);          // the irreversible step, AFTER the proofread
        licensed.add(item.key);                      // consume the license (once)
        committed++;
      } else if (verdict.kind === "dead-letter") {
        await deadLetterSink({ key: item.key, seq: item.seq, reason: verdict.reason }); // KEEP, never drop
        deadLettered++;
      } else {
        skipped++;                                    // license already consumed — idempotent skip
      }
      drain = commitDrain(drain, item.seq);           // RESOLVED (committed | dead-lettered | skipped) → watermark advances
    });
  };

  // Continuous bounded pump — TWO-SIDED: admission gates on CREDITS from the drain's real backlog
  // (uncommitted = staged-not-yet-committed), not the producer's own in-flight count. credits =
  // dial.limit − uncommitted; at 0 the shed engages (admission stops until a commit returns a
  // credit). This ties admission to PROVEN drain (the credit-gate law), curing the one-sided AIMD
  // bullwhip: if commits stall, the backlog grows, credits fall, and the producer sheds — the
  // receiver pacing the sender. The dial's `limit` is the slow-discovered ceiling; credits are the
  // fast per-cycle governor. (In-process, uncommitted tracks in-flight; across the daemon shore the
  // credit source is already the drain's true committed-progress, network-ring-ready.)
  while ((cursor < items.length && firstError === null) || active.size > 0) {
    while (cursor < items.length && canAdmit(dial.limit, backlog(drain).length) && firstError === null) {
      const item = items[cursor++]!;
      const p = processOne(item)
        .catch((e: unknown) => { if (firstError === null) firstError = e; })
        .finally(() => { active.delete(p); });
      active.add(p);
    }
    if (active.size > 0) await Promise.race(active); // wait for a slot (or a settle) to free
  }
  // Structured: every started worker has settled here (the loop drains `active` fully). Fail loud.
  if (firstError !== null) throw firstError;

  return {
    watermark: watermark(drain), backlog: backlog(drain),
    committed, deadLettered, skipped, deadLetters: collectedDL, finalLimit: dial.limit,
  };
}
