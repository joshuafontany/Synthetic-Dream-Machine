/**
 * doc-load-probe-contract — L1's isomorphic contract, platform-blind. It names WHAT a
 * load-probe returns, never HOW the boundary runs. An Automerge WASM `panic=abort` (a
 * torn doc read as a giant allocation) poisons the WASM linear memory and terminates the
 * runtime — no `try/catch` survives it. So every vessel isolates the load in a DISPOSABLE
 * boundary it can throw away, and reads this same verdict back:
 *   - the node daemon spawns a `child_process` (a full OS bulkhead against `__rust_abort`);
 *   - a browser vessel spawns a dedicated `Worker` (a crashed worker spares the page).
 *
 * Both implement `DocLoadProbe`; both classify the exit into one `ProbeStatus`. The
 * degraded-boot keel (L2) and the doctor sweep (L6) consume this contract, never a
 * platform detail.
 */

import type { StoreIntegrityReport } from "./store-integrity.js";

/**
 * How a probe resolved:
 *   ok         — the doc materializes clean.
 *   torn       — the L5b framing gate condemned the bytes ahead of any load (cheap catch).
 *   load-error — the boundary threw a CATCHABLE error; the runtime held, the doc still fails.
 *   aborted    — the boundary died uncatchably (signal / abnormal exit) — the WASM poison.
 *   timeout    — the load ran past its patience and got killed.
 */
export type ProbeStatus = "ok" | "torn" | "load-error" | "aborted" | "timeout";

/** A probe's verdict on one doc. */
export interface ProbeResult {
  readonly documentId: string;
  readonly status: ProbeStatus;
  /** the doc heads when status=ok. */
  readonly heads?: readonly string[];
  /** stored chunks seen (pre-check or boundary). */
  readonly chunks?: number;
  /** names why the doc was condemned (torn / load-error / aborted / timeout). */
  readonly reason?: string;
  /** the L5b framing report — rides along whenever the pre-check ran. */
  readonly integrity?: StoreIntegrityReport;
  /** L3: present when a clean-tail recovery ran — the count of clean records kept and the
   *  torn tail files moved aside. A `status:"ok"` result carrying this names a PROMOTION
   *  (the doc reconstitutes from its verified clean prefix). */
  readonly cleanTail?: { readonly kept: number; readonly movedAside: readonly string[] };
}

/** A doc counts as condemned when anything but a clean load comes back. */
export function isCondemned(r: ProbeResult): boolean {
  return r.status !== "ok";
}

/** Options a caller passes into a probe run. */
export interface ProbeOptions {
  /** patience before the boundary gets killed (ms). */
  readonly timeoutMs?: number;
  /** skip the cheap L5b framing pre-check and go straight to the boundary. */
  readonly skipPrecheck?: boolean;
}

/**
 * The isomorphic load-probe shore. A platform supplies ONE implementation — the node
 * daemon a child_process boundary, a browser vessel a Worker boundary — and the shared
 * keel depends only on this method.
 */
export interface DocLoadProbe {
  probe(documentId: string, opts?: ProbeOptions): Promise<ProbeResult>;
}

/**
 * The record a quarantine writes beside the moved-aside bytes. The MOVE (never a delete)
 * keeps the poisoned bytes for forensics and for L4 to reconcile against — the platform
 * performs the move (nodefs rename / IndexedDB key-drop); this names what it records.
 */
export interface QuarantineManifest {
  readonly documentId: string;
  readonly status: ProbeStatus;
  readonly reason?: string;
  readonly chunks?: number;
  readonly integrity?: StoreIntegrityReport;
  readonly quarantinedAt: string;
  readonly movedTo: string;
}
