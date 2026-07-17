/**
 * ingest-tolerant — the torn-tolerant cap-event hydrate control flow (CIV-1). Platform-blind and
 * pure over an injected `ingest` fn, so it unit-tests without WASM and any vessel (node daemon,
 * browser worker) reuses the one shape.
 *
 * Fast path: ONE batch ingest (the clean-store case, unchanged). On throw, fall back to per-record
 * ingest, skipping the torn one — a corrupt cap-event degrades to a SKIPPED membership slice instead
 * of downing the whole boot (the "corrupt deflate stream" fault). Keyhive's own verified semantics
 * keep this safe: a torn record throws in the decode PRE-PASS before ANY event applies (the failed
 * batch leaves state untouched, so a re-drive starts clean); keyhive content-addresses events (a
 * re-ingest replays as an idempotent no-op); and `ingest_unsorted_static_events` BUFFERS out-of-order
 * deps rather than throwing (so per-record order carries no penalty). A good event that depends on a
 * skipped one waits gracefully pending, never fatal — the boot survives degraded, not dead.
 */
export async function ingestTolerant(
  events: readonly Uint8Array[],
  ingest: (batch: readonly Uint8Array[]) => Promise<unknown>,
): Promise<{ ingested: number; skipped: number }> {
  if (events.length === 0) return { ingested: 0, skipped: 0 };
  try {
    await ingest(events);
    return { ingested: events.length, skipped: 0 };
  } catch {
    let ingested = 0;
    let skipped = 0;
    for (const bytes of events) {
      try { await ingest([bytes]); ingested++; }
      catch (e) {
        skipped++;
        console.warn(`[keyhive] hydrate skipped a torn cap-event (degraded slice, boot survives): ${(e as Error)?.message ?? e}`);
      }
    }
    if (skipped > 0) console.warn(`[keyhive] hydrate tolerated ${skipped} torn cap-event(s); ${ingested} ingested`);
    return { ingested, skipped };
  }
}
