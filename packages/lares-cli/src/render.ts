// @heleuma:exempt — thin presentation helper beneath the anchored command
// grammar (bin/lares.ts). Owns no semantic boundary; it only projects a
// command's already-computed result to the reading actor.

/**
 * render — one surface, two actors (meme: lar:///…/mesh/operator-peer #actor-parity).
 *
 * The same command serves a HUMAN at a terminal and an AI AGENT acting
 * programmatically. Output renders by audience, never by forking the command:
 *   - TTY (human)            → prose, via the caller's `human()` thunk.
 *   - `--json` or off-TTY    → a deterministic structured payload on stdout:
 *                              an `ok | error` union carrying the correlatable
 *                              `requestId` (the content-addressed task handle)
 *                              and a `data` map. Errors travel as DATA (one
 *                              parseable object), not a stack trace.
 *
 * Determinism: the payload object literal builds in fixed key order, so the same
 * result emits the same bytes — what an agent relies on.
 */

import { stdout } from "node:process";
import type { ParsedArgs } from "./parse-args.js";

/**
 * Does the actor want machine output? Explicit `--json` wins; `--no-json` forces
 * prose even off-TTY; otherwise a non-TTY stdout (a pipe / an agent) implies JSON.
 */
export function wantsJson(args: ParsedArgs): boolean {
  if (args.flags["json"] === true)  return true;
  if (args.flags["json"] === false) return false;
  return !stdout.isTTY;
}

export interface Emission {
  /** The `ok | error` union — the machine-facing verdict. */
  readonly ok:         boolean;
  /** Correlatable handle (requestId / taskContentId) when the result rode a verb. */
  readonly requestId?: string;
  /** Structured result payload for an agent to reason over. */
  readonly data?:      Record<string, unknown>;
  /** Error message when `ok` reads false (emitted as data, not a trace). */
  readonly error?:     string;
  /** Human projection — invoked ONLY on the prose path. */
  readonly human:      () => void;
}

/**
 * Project an emission to the reading actor. Renders prose XOR a JSON object; the
 * caller owns the process exit code (commands carry their own code vocabulary).
 */
export function emit(args: ParsedArgs, e: Emission): void {
  if (!wantsJson(args)) { e.human(); return; }
  const payload: Record<string, unknown> = { ok: e.ok };
  if (e.requestId !== undefined) payload["requestId"] = e.requestId;
  if (e.data      !== undefined) payload["data"]      = e.data;
  if (e.error     !== undefined) payload["error"]     = e.error;
  stdout.write(JSON.stringify(payload) + "\n");
}
