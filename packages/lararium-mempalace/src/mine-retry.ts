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
 * The `*WithServo` variants COMPOSE the self-tuning timeout servo (mine-timeout) ON TOP of the
 * busy-retry: each attempt runs under an adaptive `timeout` (the thunk passes it to execFileSync),
 * its duration is learned on completion, and a HANG (killed by the timeout) follows a DISTINCT path
 * from a BUSY lock — a busy lock WAITS+retries, a hang retries at most
 * once (a hang retried the same way is just another hang) then surfaces honestly as MineHangError.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import {
  adaptiveTimeoutMs,
  isMineHang,
  MineHangError,
  timeMine,
  timeMineAsync,
} from "./mine-timeout.js";

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

/**
 * Default retry budget. At 8 attempts the exponential backoff (200·2^(n-1) capped at 5s) actually
 * REACHES the 5s cap — sleeps run ~200/400/800/1600/3200/5000/5000ms ≈ 16s worst-case, so a
 * concurrent writer WAITS OUT ordinary cross-process contention (a peer mine, a writeback: seconds)
 * instead of throwing at ~3s (the old 5-attempt budget never bound the cap). A minutes-long store
 * hold (an index rebuild) is NOT rideable by retry — that case is cured upstream by not rebuilding
 * during active capture (the repair-tail daemon-drain, SCRUM S2), never by blocking a flush for minutes.
 */
export const DEFAULT_MINE_RETRY_ATTEMPTS = 8;

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
export function mineWithRetry<T>(run: () => T, maxAttempts = DEFAULT_MINE_RETRY_ATTEMPTS): T {
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
export async function mineWithRetryAsync<T>(run: () => Promise<T>, maxAttempts = DEFAULT_MINE_RETRY_ATTEMPTS): Promise<T> {
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

/** Options shared by the servo-composed retry entry points. */
export interface ServoRetryOptions {
  /** BUSY-lock retry budget (the retry-on-busy). Default {@link DEFAULT_MINE_RETRY_ATTEMPTS} (8 ≈ 16s). */
  readonly maxAttempts?: number;
  /** HANG retry budget — a killed-by-timeout attempt retries at most this many times. Default 1. */
  readonly maxHangRetries?: number;
}

/**
 * Run a SYNC mine thunk under the timeout servo AND the busy-retry — the full composition. The
 * thunk receives the adaptive `timeoutMs` to hand to execFileSync (`{ timeout, killSignal }`); a
 * completion teaches the EWMA. On throw: a BUSY lock WAITS+retries up to `maxAttempts` (unchanged);
 * a HANG (timeout-kill) follows its OWN path — at most `maxHangRetries`, then a {@link MineHangError}
 * carrying the pathKey and the timeout that killed it (honest, not masked); any other fault throws
 * straight through (the caller's own durability owns it).
 */
export function mineWithServo<T>(pathKey: string, run: (timeoutMs: number) => T, opts: ServoRetryOptions = {}): T {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MINE_RETRY_ATTEMPTS;
  const maxHangRetries = opts.maxHangRetries ?? 1;
  let hangs = 0;
  for (let attempt = 1; ; attempt++) {
    try {
      return timeMine(pathKey, run);
    } catch (e) {
      if (isMineHang(e)) {
        if (hangs < maxHangRetries) {
          hangs += 1;
          sleepSync(backoffMs(hangs));
          continue;
        }
        throw new MineHangError(pathKey, adaptiveTimeoutMs(pathKey), hangs + 1, e);
      }
      if (isMineAlreadyRunning(errMessage(e)) && attempt < maxAttempts) {
        sleepSync(backoffMs(attempt));
        continue;
      }
      throw e;
    }
  }
}

/** Async twin of {@link mineWithServo} — for execFileAsync / spawn callers. */
export async function mineWithServoAsync<T>(
  pathKey: string,
  run: (timeoutMs: number) => Promise<T>,
  opts: ServoRetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MINE_RETRY_ATTEMPTS;
  const maxHangRetries = opts.maxHangRetries ?? 1;
  let hangs = 0;
  for (let attempt = 1; ; attempt++) {
    try {
      return await timeMineAsync(pathKey, run);
    } catch (e) {
      if (isMineHang(e)) {
        if (hangs < maxHangRetries) {
          hangs += 1;
          await sleepAsync(backoffMs(hangs));
          continue;
        }
        throw new MineHangError(pathKey, adaptiveTimeoutMs(pathKey), hangs + 1, e);
      }
      if (isMineAlreadyRunning(errMessage(e)) && attempt < maxAttempts) {
        await sleepAsync(backoffMs(attempt));
        continue;
      }
      throw e;
    }
  }
}
