/**
 * verb-call — the one entry point every CLI command uses to run a verb against the
 * daemon. Co-located fast path first (UDS), remote WS fallback.
 *
 * The UDS path skips the leaf-replica + sync-on-connect handshake (the ~3s/command
 * tax); the WS path stays for genuine remote peers (a real island boundary) and for
 * when the local socket is absent/stale. Same capability-bearing verb-summons, same
 * durable CRDT outcome either way — only the transport differs by topology.
 * See lar:///ha.ka.ba/@lararium/v0.1/api/lares-lararium-binding.
 */

import { connectDaemonVessel, submitVerb, type SubmitResult, type SubmitOptions } from "./daemon-connector.js";
import { invokeLocal, udsAvailable, UdsUnreachable } from "./local-connector.js";

export interface RunVerbOptions extends SubmitOptions {
  readonly port?: number;
  readonly host?: string;
  readonly dataDir?: string;
}

export async function runVerb(
  verb:        string,
  args:        Record<string, unknown>,
  requestedBy: string,
  opts:        RunVerbOptions = {},
): Promise<SubmitResult> {
  // A non-loopback --host targets a remote daemon — skip the local socket entirely.
  const remote = opts.host !== undefined && opts.host !== "127.0.0.1" && opts.host !== "localhost";

  if (!remote && udsAvailable(opts.dataDir)) {
    try {
      return await invokeLocal(verb, args, requestedBy, opts);
    } catch (e) {
      // A real verb error must surface; only an unreachable socket falls to WS.
      if (!(e instanceof UdsUnreachable)) throw e;
    }
  }

  const connectOpts = {
    ...(opts.port    !== undefined ? { port:    opts.port }    : {}),
    ...(opts.host    !== undefined ? { host:    opts.host }    : {}),
    ...(opts.dataDir !== undefined ? { dataDir: opts.dataDir } : {}),
  };
  const vessel = await connectDaemonVessel(connectOpts);
  try {
    return await submitVerb(vessel, verb, args, requestedBy, opts);
  } finally {
    await vessel.disconnect();
  }
}
