/**
 * mine-retry — the SHARED retry-on-busy helper for every writer that drives a `mempalace mine`.
 *
 * The palace lock is the cross-process coordination: ONE held lock means another writer (a live
 * @daemon flush, a concurrent backfill, a per-spirit mine) is mid-mine. `MineAlreadyRunning` /
 * `LockHeldByOtherProcess` / `is held by PID` is a BUSY signal, not an error (exactly SQLite's
 * SQLITE_BUSY) — the caller MUST WAIT and retry, never FAIL. We back off (exponential + full
 * jitter) and re-run, so the daemon flush, the bulk backfill, and the per-spirit mine coexist
 * gracefully through the one lock. A NON-busy error throws straight through (the caller's own
 * durability — WAL re-queue, honest "mine-failed" — owns it).
 *
 * Thunk-based (inject the closure, not an interface): each caller owns its own exe resolution,
 * argv, options, and test seam; this module owns ONLY the busy-detect + backoff + retry loop.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

/** The cross-process palace-lock BUSY signal — a held lock, not a failure (SQLITE_BUSY analogue). */
export const MINE_BUSY_REGEX = /MineAlreadyRunning|is held by PID|LockHeldByOtherProcess/;

/** True when an error message names the palace-lock busy signal (WAIT+retry, never FAIL). */
export function isMineAlreadyRunning(msg: string): boolean {
  return MINE_BUSY_REGEX.test(msg);
}

/** Pull the inspectable message off an exec error (execFileSync/execFileAsync put it on `.stderr`). */
function errMessage(e: unknown): string {
  return String((e as { stderr?: unknown; message?: unknown }).stderr ?? (e as Error)?.message ?? "");
}

/** The backoff for attempt N (1-based): exponential capped at 5s, with full jitter (0.5–1.0×). */
function backoffMs(attempt: number): number {
  return Math.min(200 * 2 ** (attempt - 1), 5000) * (0.5 + Math.random() * 0.5);
}

/** Sync sleep (for execFileSync callers) via Atomics — blocks the thread for the backoff. */
export function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, Math.round(ms)));
}

/** Async sleep (for execFileAsync/spawn callers). */
function sleepAsync(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, Math.max(0, Math.round(ms))));
}

/**
 * Run a SYNC mine thunk, RETRYING on the palace-lock busy signal (exponential backoff + full
 * jitter), up to `maxAttempts`. A busy lock WAITS; any other error throws immediately; the busy
 * signal throws too once attempts run out (the caller decides what a wedged lock means).
 */
export function mineWithRetry<T>(run: () => T, maxAttempts = 5): T {
  for (let attempt = 1; ; attempt++) {
    try {
      return run();
    } catch (e) {
      if (isMineAlreadyRunning(errMessage(e)) && attempt < maxAttempts) {
        sleepSync(backoffMs(attempt));
        continue;
      }
      throw e;
    }
  }
}

/**
 * Run an ASYNC mine thunk (execFileAsync / spawn), RETRYING on the palace-lock busy signal — the
 * same backoff + jitter + regex as {@link mineWithRetry}, awaited. A busy lock WAITS+retries; a
 * non-busy error throws straight through so the caller's own durability (WAL re-queue) owns it.
 */
export async function mineWithRetryAsync<T>(run: () => Promise<T>, maxAttempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (e) {
      if (isMineAlreadyRunning(errMessage(e)) && attempt < maxAttempts) {
        await sleepAsync(backoffMs(attempt));
        continue;
      }
      throw e;
    }
  }
}
