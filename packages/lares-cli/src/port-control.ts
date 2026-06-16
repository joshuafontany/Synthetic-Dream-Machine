/**
 * port-control — idempotent single-instance reconcile primitives for the dev/test
 * loop (operator ruling 2026-06-16, hoike #dev-loop-restart; prior-art-grounded).
 *
 * Web3-pono shape: the **port is the single-instance capability** (binding it = being
 * the instance), and the **OS port-table is the live authority** for who holds it —
 * never a stale PID file (ambient mutable state = the confused-deputy trap). We read
 * the authoritative live table, signal the holder's own graceful shutdown, poll the
 * port (not a `sleep`), and force only as a bounded fallback. No PID file, no
 * supervisor, no socket-option tricks — the EADDRINUSE cure is wait-for-port-free.
 */

import { createConnection } from "node:net";
import { execFileSync }     from "node:child_process";

/** True iff something accepts a TCP connection on the port (the port-free probe). */
export function probePort(port: number, host = "127.0.0.1", timeoutMs = 250): Promise<boolean> {
  return new Promise((res) => {
    const sock = createConnection({ port, host });
    const done = (open: boolean): void => { sock.removeAllListeners(); sock.destroy(); res(open); };
    sock.setTimeout(timeoutMs);
    sock.once("connect", () => done(true));
    sock.once("error",   () => done(false));
    sock.once("timeout", () => done(false));
  });
}

/**
 * PIDs holding (LISTENing on) the port, read from the OS port-table — the live
 * authority, not a file we keep. `lsof` first (mac + linux), `ss` fallback (linux).
 * Excludes our own PID. Empty = no owner found (foreign listener / no tool / perms).
 */
export function portHolderPids(port: number): number[] {
  const self = process.pid;
  const uniq = (ns: number[]): number[] => [...new Set(ns)].filter((n) => n > 0 && n !== self);
  try {
    const out = execFileSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const pids = uniq([...out.matchAll(/(\d+)/g)].map((m) => Number(m[1])));
    if (pids.length) return pids;
  } catch { /* lsof absent or no match — try ss */ }
  try {
    const out = execFileSync("ss", ["-ltnHp", `sport = :${port}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return uniq([...out.matchAll(/pid=(\d+)/g)].map((m) => Number(m[1])));
  } catch { return []; }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface StopResult { stopped: boolean; forced: boolean }

/**
 * Free the port by reconciling to "no incumbent": no-op if already free
 * (idempotent); else read the holder from the OS table, SIGTERM it (its own
 * graceful handler), poll port-free within `graceMs`, then SIGKILL as a bounded
 * fallback. A held port with NO discoverable owner FAILS LOUD — never guess
 * (the confused-deputy guard). Force is safe: the Automerge store is chunked +
 * CRDT, so a killed in-flight change is lost, never the doc.
 */
export async function stopIncumbent(
  port: number,
  opts: { graceMs?: number; pollMs?: number; killMs?: number } = {},
): Promise<StopResult> {
  const graceMs = opts.graceMs ?? 8_000;
  const pollMs  = opts.pollMs  ?? 200;
  const killMs  = opts.killMs  ?? 3_000;

  if (!(await probePort(port))) return { stopped: false, forced: false };   // already free

  const pids = portHolderPids(port);
  if (pids.length === 0) {
    throw new Error(
      `port ${port} is in use but no owning PID found via lsof/ss — refusing to guess a target ` +
      `(no silent misroute). Free it manually, or install lsof/ss.`,
    );
  }
  for (const pid of pids) { try { process.kill(pid, "SIGTERM"); } catch { /* already gone */ } }

  const graceDeadline = Date.now() + graceMs;
  while (Date.now() < graceDeadline) {
    if (!(await probePort(port))) return { stopped: true, forced: false };
    await sleep(pollMs);
  }

  for (const pid of portHolderPids(port)) { try { process.kill(pid, "SIGKILL"); } catch { /* gone */ } }
  const killDeadline = Date.now() + killMs;
  while (Date.now() < killDeadline) {
    if (!(await probePort(port))) return { stopped: true, forced: true };
    await sleep(pollMs);
  }
  throw new Error(`port ${port} still held after SIGTERM + SIGKILL — manual intervention needed.`);
}
