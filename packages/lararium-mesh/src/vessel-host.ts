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
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/vessel-host
 */

import { isIslandToVesselMsg } from "./island-protocol.js";
import type { IslandToVesselMsg, IslandMsg_Breath, IslandStorageConfig } from "./island-protocol.js";

// ── VesselWorkerHandle — platform-blind handle over a spawned island worker ───
//
// One abstraction over `worker_threads.Worker` (node) and `Worker` (browser).
// `listen`/`onError` return an unsubscribe so one-shot handshakes (awaitIslandMsg)
// clean up without leaking listeners. The canonical home is mesh (transport,
// no TW5) — admin VM + pool both compose it.

export interface VesselWorkerHandle {
  post(msg: unknown, transfer?: unknown[]): void;
  listen(onMessage: (raw: unknown) => void): () => void;
  onError(cb: (err: Error) => void): () => void;
  terminate(): void;
}

// ── VesselIslandHost — the pool's platform seam ──────────────────────────────
//
// Everything platform-specific the pool needs, as composition: worker spawn,
// sync-channel creation, per-wiki storage. `awaitReady` flags the browser ES-
// module worker's WASM-load handshake (node omits it). Held capabilities
// (mainRepo, diskMirrorGrant, hotCap) ride pool config, not this seam.

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
    let lastBreath: string | null = null;
    let lastEvidence: string | null = null;
    let lastAdvanceAt = Date.now();
    const cleanup = (): void => {
      clearTimeout(timer);
      for (const off of offs) off();
    };
    const arm = (): void => {
      timer = setTimeout(() => {
        cleanup();
        reject(new Error(
          `[vessel-host] timeout waiting for ${opts.expectedType}` +
          ` (${opts.timeoutMs}ms of silence${lastBreath ? `; last breath: ${lastBreath}` : ""})`,
        ));
      }, opts.timeoutMs);
    };
    arm();

    offs.push(opts.subscribe((raw) => {
      if (!isIslandToVesselMsg(raw)) return;
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
          lastAdvanceAt = Date.now();
        } else if (
          opts.progressStallMs !== undefined &&
          Date.now() - lastAdvanceAt > opts.progressStallMs
        ) {
          cleanup();
          reject(new Error(
            `[vessel-host] ${opts.expectedType} wait stalled` +
            ` (no progress in ${opts.progressStallMs}ms; last breath: ${lastBreath})`,
          ));
          return;
        }
        clearTimeout(timer);
        arm();
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
