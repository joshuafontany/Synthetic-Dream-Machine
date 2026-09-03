/**
 * local-connector — the co-located fast path of the lares↔lararium binding.
 *
 * A thin Unix-domain-socket invoker: connect the rendezvous socket, write ONE
 * capability-bearing invocation line, read the outcome line, done. No Repo, no
 * leaf replica, no WS sync-on-connect — the daemon already holds the warm replica
 * and runs the verb through the same worker VerbDispatcher.
 *
 * The socket's 0600 owner-only perms gate PRESENCE (substrate); the requestedBy
 * did rides the invocation for the daemon's verify-then-delegate (authority).
 * When the socket is absent/stale the caller has no daemon to talk to — the CLI
 * carries no second transport.
 * See lar:///ha.ka.ba/lararium/api/lares-lararium-binding.
 */

import { createConnection } from "node:net";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { rendezvousPath } from "@lararium/mesh/rendezvous-path";
import { larDataDir } from "./env.js";
import type { SubmitResult, SubmitOptions } from "./verb-result.js";

/** The agreed socket path — both sides derive the rendezvous from the substrate dir (`rendezvousPath`). */
export function udsSocketPath(dataDir?: string | null): string {
  // ABSENT AND UNRESOLVED ARE DIFFERENT ASKS, and only one of them may fall back. Omitting the argument
  // means "the caller's own vessel", and the ambient default is the right answer. Passing `null` means a
  // root was LOOKED FOR AND NOT FOUND — a staged root, a discovered socket directory — and falling back
  // there aims a caller at the operator's live vessel while it believes it is talking to a fixture.
  // The failure is silent and it PASSES: the real daemon answers correctly, so the vector goes green
  // having measured the wrong hearth. Refusing is the only reading that cannot be mistaken for success.
  if (dataDir === null) {
    throw new Error("[lares] a substrate root was required and none resolved — refusing to fall back to the ambient vessel");
  }
  // ONE DERIVATION, BOTH SIDES. The daemon binds `rendezvousPath` over its resolved substrate dir; this
  // reads the same function over the same default. A `--storage`/`LAR_STORAGE` override moves the
  // daemon's dir and not this one — that divergence predates the relocation and is inherited here
  // rather than widened; `lares vessel read` prints the resolved path when the two must be compared.
  return rendezvousPath({ root: dataDir ?? larDataDir(), uid: process.getuid?.() ?? 0 });
}

/**
 * Does a socket FILE sit at the path? It reports a NAME standing, never a listener answering.
 *
 * A unix socket outlives the process that bound it: kill a daemon rudely and the inode remains, so this
 * answers `true` for a vessel that died months ago. Reach for it to decide whether a path merits a try —
 * never to decide whether anything breathes there. {@link udsAlive} answers that.
 */
export function udsSocketPresent(dataDir?: string | null): boolean {
  // The derivation's refusal is not a stat failure and must not be swallowed as one. `false` here reads
  // "no daemon there", which is an answer about a hearth — and an unresolved root names no hearth to
  // answer about. Let it out; catch only the filesystem's own noise.
  const path = udsSocketPath(dataDir);
  try { return existsSync(path); } catch { return false; }
}

/**
 * Does a daemon ANSWER at the socket? The only honest liveness read — it connects.
 *
 * ── WHAT A FILE-CHECK COST, MEASURED ────────────────────────────────────────────────────────────
 * Callers read file-existence AS liveness, so a stale socket reported a dead vessel as serving — for
 * weeks, across sessions. Worse, the standing decision consulted that same reading, so the lie
 * SUSTAINED ITSELF: the vessel stayed down precisely because the corpse of its socket kept reporting it
 * up, and nothing ever connected to find out otherwise.
 *
 * `ECONNREFUSED` MARKS exactly that corpse — a name carrying nothing behind it — and it reads here as
 * DOWN rather than as an error, because a refused connection ANSWERS.
 *
 * The address NAMES; it never stands the place (`lar:` signal law). Existence at an address never
 * implies presence at a place, and a check that fuses them reports on the filesystem while claiming to
 * report on the mesh.
 */
export async function udsAlive(dataDir?: string | null, timeoutMs = 1_500): Promise<boolean> {
  const path = udsSocketPath(dataDir);
  if (!udsSocketPresent(dataDir)) return false;   // no name — nothing to probe
  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (alive: boolean): void => {
      if (settled) return;
      settled = true;
      try { sock.destroy(); } catch { /* already gone */ }
      resolve(alive);
    };
    const sock = createConnection(path);
    sock.setTimeout(timeoutMs);
    sock.once("connect", () => done(true));
    sock.once("error",   () => done(false));   // ECONNREFUSED on a stale inode → DOWN, never an error
    sock.once("timeout", () => done(false));   // bound but wedged answers as down, which serves the caller
  });
}

/**
 * Clear a socket file that answers to nobody, and say whether it cleared one.
 *
 * A stale inode does more than mislead — it KEEPS the lie alive. Reaping it ahead of a start makes the
 * next presence check mean what it says. It never touches a LIVE socket: the caller hands a liveness
 * verdict in, so this can only ever clear a corpse.
 */
export function reapStaleSocket(alive: boolean, dataDir?: string): boolean {
  if (alive || !udsSocketPresent(dataDir)) return false;
  try { unlinkSync(udsSocketPath(dataDir)); return true; } catch { return false; }
}

/** The local socket refused (absent/stale) — `runVerb` turns this into DaemonUnreachable. */
export class UdsUnreachable extends Error {}

export async function invokeLocal(
  verb:        string,
  args:        Record<string, unknown>,
  requestedBy: string,
  opts:        SubmitOptions & { readonly dataDir?: string | null } = {},
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
      // THE ASK RIDES WITH THE INVOCATION. The daemon runs its own servo, and a caller that knows its
      // pass runs long — a bulk backfill over a whole corpus — can only say so if the number crosses.
      // Left off the wire, this side waited an hour while the daemon cut the same pass at two minutes.
      sock.write(JSON.stringify({ verb, args, requestedBy, timeoutMs,
                                  ...(opts.requestId ? { requestId: opts.requestId } : {}) }) + "\n");
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
      // ENOENT (no socket file) / ECONNREFUSED (stale) → no daemon holds the sock.
      if (e.code === "ENOENT" || e.code === "ECONNREFUSED") settle(() => reject(new UdsUnreachable(e.message)));
      else settle(() => reject(e));
    });
  });
}
