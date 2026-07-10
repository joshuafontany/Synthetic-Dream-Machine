/**
 * mine-lane — the SINGLE-WRITER lane per palace (in-process). Every ASYNC mine subprocess
 * rides a keyed promise-chain tail — key = the canonical palace path — so two concurrent
 * mines against ONE palace SERIALIZE (a work queue: queue, never drop/coalesce) instead of
 * racing the chroma hnsw compactor (the 20 transient compaction faults under concurrent
 * mines). The shape: one Map of tails, no timers, no config — the lane's pace derives
 * entirely from each mine's own completion.
 *
 * Scope (honest): this lane serializes within ONE process. Cross-process serialization
 * already rides the palace lock + the shared busy-retry (mine-retry.ts) and mempalace's own
 * write-daemon queue — the lane keeps a process from racing ITSELF into that lock (the
 * lock-retry storm). SYNC spawns (execFileSync callers: subagent-mine, telemetry-writeback,
 * the CLI direct mine) block the thread and thus serialize by construction; the lane guards
 * the async spawns (the @daemon capture flush, any future async mine).
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/capture-annotation-model#nalu-flush-hardening
 */

import { canonicalPalacePath } from "./palace-path.js";

/** One tail per canonical palace path — the in-flight chain's settled-shape end. */
const tails = new Map<string, Promise<void>>();

/** The lane's canonical key for a palace spelling (exposed for tests/observability). */
export function mineLaneKey(palacePath: string): string {
  try {
    return canonicalPalacePath(palacePath);
  } catch {
    return palacePath;
  }
}

/**
 * Run `run` in the palace's single-writer lane: it starts only after every previously-queued
 * mine for the SAME palace settled (FIFO; a prior failure never blocks the queue — each
 * caller still sees its OWN result/rejection). Distinct palaces run independently.
 */
export function withMineLane<T>(palacePath: string, run: () => Promise<T>): Promise<T> {
  const key = mineLaneKey(palacePath);
  const prev = tails.get(key) ?? Promise.resolve();
  // Chain regardless of the prior outcome (the queue survives a failed mine); the caller's
  // own promise carries its own rejection untouched.
  const next = prev.then(run, run);
  const tail = next.then(
    () => undefined,
    () => undefined,
  );
  tails.set(key, tail);
  // Drop the tail once drained — only when it is still the stored tail (a later enqueue
  // replaced it otherwise). Keeps the map bounded to the palaces with work in flight.
  void tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key);
  });
  return next;
}

/** True while the palace's lane holds work in flight (observability/tests). */
export function mineLaneBusy(palacePath: string): boolean {
  return tails.has(mineLaneKey(palacePath));
}
