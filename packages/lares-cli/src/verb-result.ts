/**
 * verb-result — the transport-neutral vocabulary of a verb invocation.
 *
 * A verb-summons and its outcome belong to no transport. The CLI speaks one — the
 * daemon's sock — and a command reads an outcome here without reaching for the
 * invoker at all.
 *
 * See lar:///ha.ka.ba/lararium/api/lares-lararium-binding — transport, authority,
 * and record decouple; this module holds the record's surface.
 */

import { VERB_RESULT_KEY } from "@lararium/mesh";

export interface SubmitOptions {
  /** Total timeout in ms (default 10000). */
  readonly timeoutMs?: number;
  /**
   * Content-addressed request id (V1). For an idempotent/declarative verb the
   * caller passes `taskContentId({subject, command, args, nonce:""})` so a
   * re-issued identical change collapses to the same id — the dispatcher's
   * outcome-keyed dedup then gives exactly-once EFFECT. Omit → fresh `newRequestId()`.
   */
  readonly requestId?: string;
}

export interface SubmitTargetResult {
  readonly ok:      boolean;
  readonly output?: Record<string, unknown>;
  readonly error?:  string;
}

export interface SubmitResult {
  readonly status:       "done" | "error";
  readonly results?:     Record<string, SubmitTargetResult>;
  readonly errorMessage?: string;
  readonly requestId:    string;
}

export function summaryOutput(result: SubmitResult): Record<string, unknown> | undefined {
  return result.results?.[VERB_RESULT_KEY]?.output;
}

/** A verb's outcome, read whole: whether it ran, what it landed, and why it refused. */
export interface VerbOutcome {
  readonly ok:     boolean;
  readonly output: Record<string, unknown>;
  readonly error:  string | null;
}

/**
 * Read an outcome without losing its verdict.
 *
 * THE STATUS IS PART OF THE PAYLOAD. Reaching straight for `results` skips it, and a refused
 * invocation carries no payload — so the reader falls to an empty object and renders success over a
 * verb that never ran. A pass that landed nothing because everything was already landed and a pass
 * the daemon cut short then print identically, and only one of them leaves work owed.
 */
export function readVerbOutcome(result: SubmitResult): VerbOutcome {
  if (result.status === "error") {
    return { ok: false, output: {}, error: result.errorMessage ?? "the daemon refused and named no reason" };
  }
  return { ok: true, output: summaryOutput(result) ?? {}, error: null };
}
