/**
 * vessel-host — shared vessel↔island transport primitives.
 *
 * The pool-collapse foundation (pair 4): the request/reply handshake logic —
 * register listener, await a matching message, time out, clean up — lived twice
 * (node pool `_sendAndAwait`, browser pool `_awaitMsg`). It lives once here. The
 * platform supplies only the `subscribe`/`send` closures; the correlation logic
 * stays platform-blind.
 *
 * Home: this is pure island-protocol transport (no TW5), so it lives in mesh —
 * the package that owns the protocol — not tw5. Both pools already import mesh.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/vessel-host
 */

import { isIslandToVesselMsg } from "./island-protocol.js";
import type { IslandToVesselMsg, IslandMsg_Breath, IslandStorageConfig } from "./island-protocol.js";

// ── VesselWorkerHandle — platform-blind handle over a spawned island worker ───
//
// One abstraction over `worker_threads.Worker` (node) and `Worker` (browser).
// `listen`/`onError` return an unsubscribe so one-shot handshakes (awaitIslandMsg)
// clean up without leaking listeners. The canonical home is mesh (transport,
// no TW5) — daemon VM + pool both compose it.

export interface VesselWorkerHandle {
  post(msg: unknown, transfer?: unknown[]): void;
  listen(onMessage: (raw: unknown) => void): () => void;
  onError(cb: (err: Error) => void): () => void;
  terminate(): void;
}

// ── VesselIslandHost — the pool's platform shore ──────────────────────────────
//
// Everything platform-specific the pool needs, as composition: worker spawn,
// sync-channel creation, per-wiki storage. `awaitReady` flags the browser ES-
// module worker's WASM-load handshake (node omits it). Held capabilities
// (mainRepo, diskMirrorGrant, hotCap) ride pool config, not this shore.

export interface VesselIslandHost {
  /** Spawn a fresh island worker (closes over the platform worker URL). */
  spawnWorker(): VesselWorkerHandle;
  /** Create a sync channel; the pool keeps mainPort, transfers syncPort. */
  newSyncChannel(): { mainPort: MessagePort; syncPort: MessagePort };
  /** Per-wiki island storage (node nodefs; browser undefined → island owns IDB). */
  storage(wikiId: string): IslandStorageConfig | undefined;
  /** Browser ES-module workers signal "ready" before manifest; node omits. */
  awaitReady?: boolean;
}

export interface AwaitIslandMsgOpts<T extends IslandToVesselMsg> {
  /** The island→vessel message type to wait for (e.g. "ea", "teardown:ack"). */
  expectedType: T["type"];
  /** Reject after this many ms of SILENCE — a `resetOnTypes` match re-arms it. */
  timeoutMs: number;
  /**
   * Message types that re-arm the timeout instead of settling (the ea-breath
   * law: a mounting island that still emits never reads dead — silence alone
   * times out). The rejection names the last breath heard.
   */
  resetOnTypes?: readonly IslandToVesselMsg["type"][];
  /**
   * Bound on breathing-without-advancing (the progress-kick law): when reset
   * messages keep arriving but their (phase, progress) evidence freezes for
   * this many ms, reject as STALLED — a live event loop whose work never
   * advances reads dead, on a budget. Absent → re-arm on any reset message.
   */
  progressStallMs?: number;
  /**
   * Message types that settle the wait by REJECTION (e.g. "fault") — the
   * island named its own failure; the wait surfaces it immediately instead
   * of spending the silence budget on a corpse.
   */
  rejectOnTypes?: readonly IslandToVesselMsg["type"][];
  /** Register a message handler; return its unsubscribe. */
  subscribe: (handler: (raw: unknown) => void) => () => void;
  /** Optionally register an error handler; return its unsubscribe. */
  subscribeError?: (handler: (err: Error) => void) => () => void;
  /** Optionally fire the outbound message AFTER the listener registers (no race). */
  send?: () => void;
}

/**
 * Await the first island→vessel message whose `type` matches `expectedType`.
 * Registers the listener BEFORE sending (when `send` provided) so a fast reply
 * cannot slip the gap. Cleans up every listener + the timer on settle.
 */
export function awaitIslandMsg<T extends IslandToVesselMsg>(opts: AwaitIslandMsgOpts<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const offs: Array<() => void> = [];
    let timer: ReturnType<typeof setTimeout>;
    // Platform-blind deferral: this module runs in browser pools too, where bare
    // setImmediate does not exist — setTimeout(fn, 0) lands in the same
    // after-the-poll-phase spot for the queued-breath check.
    const defer: (fn: () => void) => ReturnType<typeof setTimeout> =
      typeof setImmediate === "function"
        ? (setImmediate as unknown as (fn: () => void) => ReturnType<typeof setTimeout>)
        : (fn) => setTimeout(fn, 0);
    const clearDefer: (h: ReturnType<typeof setTimeout>) => void =
      typeof clearImmediate === "function"
        ? (clearImmediate as unknown as (h: ReturnType<typeof setTimeout>) => void)
        : clearTimeout;
    let verdict: ReturnType<typeof setTimeout> | undefined;
    let lastBreath: string | null = null;
    let lastEvidence: string | null = null;
    // The LOCAL monotonic clock (suspend-blind, never wall time): the vessel and the
    // island run as separate causal islands — no shared now — so the only honest
    // silence measure reads "ms of MY loop-time since the last message I processed."
    // Wall clock (Date.now) fabricates silence across a host suspend/clock-skew;
    // performance.now measures only this loop's own lived time.
    const mono = (): number => performance.now();
    let lastAdvanceAt = mono();
    let lastHeardAt   = mono();
    const cleanup = (): void => {
      clearTimeout(timer);
      if (verdict !== undefined) clearDefer(verdict);
      for (const off of offs) off();
    };
    // Silence is MEASURED (monotonic time since the last island message processed),
    // never inferred from "the timer fired": after an event-loop wedge (a long
    // synchronous automerge load/sync on either thread) the timers phase runs BEFORE
    // queued port messages get processed, so an expired timer would fabricate
    // "N ms of silence" over an island whose breaths sat queued the whole time. At
    // fire the measured check re-arms for the true remainder; a genuine overrun
    // defers the verdict one setImmediate (the check phase runs AFTER poll delivers
    // pending messages) so a queued breath still lands, moves lastHeardAt, and the
    // wait re-arms instead of killing a live island.
    const arm = (ms: number): void => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const silent = mono() - lastHeardAt;
        if (silent < opts.timeoutMs) { arm(opts.timeoutMs - silent); return; }
        verdict = defer(() => {
          verdict = undefined;
          const measured = mono() - lastHeardAt;
          if (measured < opts.timeoutMs) { arm(opts.timeoutMs - measured); return; }
          cleanup();
          reject(new Error(
            `[vessel-host] timeout waiting for ${opts.expectedType}` +
            ` (${Math.round(measured)}ms of silence${lastBreath ? `; last breath: ${lastBreath}` : ""})`,
          ));
        });
      }, ms);
    };
    arm(opts.timeoutMs);

    offs.push(opts.subscribe((raw) => {
      if (!isIslandToVesselMsg(raw)) return;
      lastHeardAt = mono();
      if (opts.rejectOnTypes?.includes(raw.type)) {
        cleanup();
        const detail = (raw as { error?: string }).error;
        reject(new Error(
          `[vessel-host] ${raw.type} while waiting for ${opts.expectedType}${detail ? `: ${detail}` : ""}`,
        ));
        return;
      }
      if (opts.resetOnTypes?.includes(raw.type)) {
        // Breath, not settlement — the island still lives. Fresh evidence
        // (phase or progress moved) restarts the stall clock; frozen evidence
        // spends down the stall budget even while breaths keep the silence
        // window re-armed (progress-kick over timer-kick).
        const breath  = raw.type === "breath" ? (raw as IslandMsg_Breath) : null;
        lastBreath    = breath ? `${breath.phase}#${breath.progress}` : raw.type;
        if (lastBreath !== lastEvidence) {
          lastEvidence  = lastBreath;
          lastAdvanceAt = mono();
        } else if (
          opts.progressStallMs !== undefined &&
          mono() - lastAdvanceAt > opts.progressStallMs
        ) {
          cleanup();
          reject(new Error(
            `[vessel-host] ${opts.expectedType} wait stalled` +
            ` (no progress in ${opts.progressStallMs}ms; last breath: ${lastBreath})`,
          ));
          return;
        }
        arm(opts.timeoutMs);
        return;
      }
      if (raw.type !== opts.expectedType) return;
      cleanup();
      resolve(raw as T);
    }));
    if (opts.subscribeError) {
      offs.push(opts.subscribeError((err) => { cleanup(); reject(err); }));
    }

    opts.send?.();
  });
}
