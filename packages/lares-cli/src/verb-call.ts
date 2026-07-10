/**
 * verb-call — the one entry point every CLI command uses to run a verb against the
 * daemon. One transport: the pono sock.
 *
 * The CLI and the daemon share a machine, so they share a socket. A verb-summons
 * rides one capability-bearing line into <dataDir>/lares.sock; the outcome line
 * rides back. The socket's 0600 owner-only perms gate PRESENCE; the requestedBy
 * did rides the invocation for the daemon's verify-then-delegate (authority); the
 * daemon's warm replica records the durable CRDT outcome (record). Transport,
 * authority, and record stay decoupled — see
 * lar:///ha.ka.ba/lararium/api/lares-lararium-binding.
 *
 * No leaf Repo, no WS sync-on-connect, no in-memory replica. A CLI process that
 * stood its own Automerge replica to reach a daemon holding the canonical one paid
 * a sync handshake to learn what sat one socket away. The daemon owns the replica;
 * the CLI stays a thin mouth. A genuine remote peer speaks WS to the daemon's own
 * relay — never through this surface.
 */

import { invokeLocal, udsAvailable, udsSocketPath, UdsUnreachable } from "./local-connector.js";
import type { SubmitResult, SubmitOptions } from "./verb-result.js";

export interface RunVerbOptions extends SubmitOptions {
  readonly dataDir?: string;
}

/** No daemon holds the socket — the operator must `lares serve`. */
export class DaemonUnreachable extends Error {
  constructor(socketPath: string) {
    super(`no lares daemon at ${socketPath} — start one with \`lares serve\``);
    this.name = "DaemonUnreachable";
  }
}

export async function runVerb(
  verb:        string,
  args:        Record<string, unknown>,
  requestedBy: string,
  opts:        RunVerbOptions = {},
): Promise<SubmitResult> {
  if (!udsAvailable(opts.dataDir)) throw new DaemonUnreachable(udsSocketPath(opts.dataDir));
  try {
    return await invokeLocal(verb, args, requestedBy, opts);
  } catch (e) {
    // A real verb error surfaces as itself; only an absent/stale socket becomes
    // the "start the daemon" counsel.
    if (e instanceof UdsUnreachable) throw new DaemonUnreachable(udsSocketPath(opts.dataDir));
    throw e;
  }
}
