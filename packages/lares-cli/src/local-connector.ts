/**
 * local-connector — the co-located fast path of the lares↔lararium binding.
 *
 * A thin Unix-domain-socket invoker: connect <dataDir>/lares.sock, write ONE
 * capability-bearing invocation line, read the outcome line, done. No Repo, no
 * leaf replica, no WS sync-on-connect — the daemon already holds the warm replica
 * and runs the verb through the same worker VerbDispatcher.
 *
 * The socket's 0600 owner-only perms gate PRESENCE (substrate); the requestedBy
 * did rides the invocation for the daemon's verify-then-delegate (authority).
 * When the socket is absent/stale, the caller falls back to the WS vessel.
 * See lar:///ha.ka.ba/@lararium/v0.1/api/lares-lararium-binding.
 */

import { createConnection } from "node:net";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { larDataDir } from "./env.js";
import type { SubmitResult, SubmitOptions } from "./daemon-connector.js";

/** The agreed socket path — both sides resolve <dataDir>/lares.sock (env contract). */
export function udsSocketPath(dataDir?: string): string {
  return join(dataDir ?? larDataDir(), "lares.sock");
}

/** Is a local daemon socket present? (Presence only — connect may still fail stale.) */
export function udsAvailable(dataDir?: string): boolean {
  try { return existsSync(udsSocketPath(dataDir)); } catch { return false; }
}

/** The local socket could not be reached (absent/stale) — caller may fall to WS. */
export class UdsUnreachable extends Error {}

export async function invokeLocal(
  verb:        string,
  args:        Record<string, unknown>,
  requestedBy: string,
  opts:        SubmitOptions & { readonly dataDir?: string } = {},
): Promise<SubmitResult> {
  const socketPath = udsSocketPath(opts.dataDir);
  const timeoutMs  = opts.timeoutMs ?? 30_000;
  return await new Promise<SubmitResult>((resolve, reject) => {
    const sock = createConnection(socketPath);
    let buf = "";
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { sock.destroy(); } catch { /* already gone */ }
      fn();
    };
    const timer = setTimeout(
      () => settle(() => reject(new Error(`local verb "${verb}" timed out after ${timeoutMs}ms`))),
      timeoutMs,
    );
    sock.setEncoding("utf8");
    sock.on("connect", () => {
      sock.write(JSON.stringify({ verb, args, requestedBy, ...(opts.requestId ? { requestId: opts.requestId } : {}) }) + "\n");
    });
    sock.on("data", (chunk: string) => {
      buf += chunk;
      const nl = buf.indexOf("\n");
      if (nl === -1) return;
      const line = buf.slice(0, nl);
      try { const r = JSON.parse(line) as SubmitResult; settle(() => resolve(r)); }
      catch { settle(() => reject(new Error("bad outcome json from local channel"))); }
    });
    sock.on("error", (e: NodeJS.ErrnoException) => {
      // ENOENT (no socket file) / ECONNREFUSED (stale) → fall back to WS.
      if (e.code === "ENOENT" || e.code === "ECONNREFUSED") settle(() => reject(new UdsUnreachable(e.message)));
      else settle(() => reject(e));
    });
  });
}
