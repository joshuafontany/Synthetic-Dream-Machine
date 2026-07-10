/**
 * port-control — idempotent single-instance reconcile primitives for the dev/test
 * loop.
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
 * authority, not a file we keep. `lsof` first (mac + linux), `ss` fallback (linux),
 * `netstat -ano` on Windows (no lsof/ss there). Excludes our own PID. Empty = no
 * owner found (foreign listener / no tool / perms).
 */
export function portHolderPids(port: number): number[] {
  const self = process.pid;
  const uniq = (ns: number[]): number[] => [...new Set(ns)].filter((n) => n > 0 && n !== self);

  if (process.platform === "win32") {
    // Windows ships neither lsof nor ss; `netstat -ano` is always present and prints
    // the owning PID in the last column of each row. LISTENING rows carry 5 columns
    // (Proto, Local, Foreign, State, PID) — UDP rows lack State, so the State filter
    // excludes them. Match the port at the tail of the Local Address (IPv4 0.0.0.0:p
    // and IPv6 [::]:p both end ":p").
    try {
      const out = execFileSync("netstat", ["-ano"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      const pids: number[] = [];
      for (const raw of out.split(/\r?\n/)) {
        const parts = raw.trim().split(/\s+/);
        if (parts.length < 5 || parts[0] !== "TCP" || parts[3] !== "LISTENING") continue;
        const local = parts[1];
        if (!local) continue;
        const colon = local.lastIndexOf(":");
        if (colon < 0 || Number(local.slice(colon + 1)) !== port) continue;
        pids.push(Number(parts[parts.length - 1]));
      }
      return uniq(pids);
    } catch { return []; }
  }

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
      `port ${port} is in use but no owning PID found via the OS port table ` +
      `(lsof/ss on POSIX, netstat on Windows) — refusing to guess a target ` +
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
