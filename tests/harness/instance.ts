/**
 * harness/instance — the ONE instance-targeting layer every e2e test uses.
 *
 * Two modes, selected by LAR_TARGET (the env contract: lares-cli/src/env.ts):
 *
 *   staged (default) — the harness OWNS the instance: ephemeral root under
 *     os.tmpdir(), random port, `lares vessel clear --force` → daemon boot → await
 *     `phase → live` → tests run → daemon killed, root deleted. QA isolation
 *     by construction; every run starts from genesis.
 *
 *   live — the harness ATTACHES to a running lararium (LAR_ROOT + LAR_PORT
 *     required). It NEVER resets, never stops, never deletes — read-and-gesture
 *     only. Tests that mutate or assume genesis state MUST guard on
 *     `instance.mode === "staged"`.
 *
 * The harness drives the REAL `lares` CLI binary with the instance's env —
 * the same surface an operator's hands touch (tests/TEST-ARCHITECTURE.md:
 * exercise the live model, not fixtures).
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const CLI_BIN   = join(REPO_ROOT, "packages/lares-cli/dist/src/bin/lares.js");
const NODE_MAIN = join(REPO_ROOT, "packages/lararium-node/dist/src/main.js");
const NODE_CWD  = join(REPO_ROOT, "packages/lararium-node");

export interface CliResult {
  readonly code:   number;
  readonly stdout: string;
  readonly stderr: string;
  /** Last JSON object on stdout when --json was passed (null when none parsed). */
  readonly json:   Record<string, unknown> | null;
}

export interface LarInstance {
  readonly mode: "staged" | "live";
  readonly root: string;
  readonly port: number;
  /** Daemon stdout+stderr captured so far (staged mode only). */
  readonly bootLog: () => string;
  /** Run the real lares CLI against THIS instance. */
  readonly cli: (args: readonly string[]) => Promise<CliResult>;
  /** Staged: kill daemon + delete root. Live: no-op (never touch a live hearth). */
  readonly stop: () => Promise<void>;
  /**
   * Staged: kill the daemon but PRESERVE the root — for reboot vectors that
   * boot a second daemon on the same fed store. Live: no-op.
   */
  readonly stopDaemonOnly: () => Promise<void>;
}

function runCli(env: Record<string, string>, args: readonly string[]): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI_BIN, ...args], {
      env: { ...process.env, ...env },
      cwd: REPO_ROOT,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += String(d); });
    child.stderr.on("data", (d) => { stderr += String(d); });
    child.on("close", (code) => {
      let json: Record<string, unknown> | null = null;
      for (const line of stdout.trim().split("\n").reverse()) {
        try { json = JSON.parse(line) as Record<string, unknown>; break; } catch { /* not json */ }
      }
      resolve({ code: code ?? -1, stdout, stderr, json });
    });
  });
}

/** An OS-assigned free port (bind :0 → read the assigned port → close). Collision-
 *  FREE at that instant — strictly better than the old PID-stride guess (which only
 *  reduced collisions). Tiny TOCTOU before the daemon binds; acceptable for tests. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const p = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => (p ? resolve(p) : reject(new Error("freePort: no port assigned"))));
    });
  });
}

async function openStaged(): Promise<LarInstance> {
  const root = mkdtempSync(join(tmpdir(), "lares-staged-"));
  // OS-assigned free port — each staged island its own port, collision-free
  // (causal-island isolation; was a PID-stride guess that only reduced collisions).
  const port = await freePort();
  const env  = { LAR_ROOT: root, LAR_PORT: String(port) };

  // Genesis — `lares vessel clear --force` seeds the root (init runs inside).
  const reset = await runCli(env, ["vessel", "clear", "--root", root, "--force"]);
  if (reset.code !== 0) {
    rmSync(root, { recursive: true, force: true });
    throw new Error(`staged reset failed (${reset.code}):\n${reset.stderr.slice(-800)}`);
  }

  // ── THE RITE RUNS IN TWO STEPS, SO THE HARNESS PERFORMS BOTH ───────────────────────────────
  // `vessel clear` re-founds a PLACE: @daemon, the vessel's own Keyhive individual, the hearth
  // true-name. A place stands and serves while holding no face — which is correct, and which is
  // NOT what these suites test. They exercise a hearth: personas, wiki, catalog, the pairing the
  // boot path derives. So the staged instance lights its face here, and a suite that wants the
  // FLOOR asks for it deliberately rather than inheriting it from a founding that stopped early.
  const face = await runCli(env, ["persona", "new", "0", "--name", "staged"]);
  if (face.code !== 0) {
    rmSync(root, { recursive: true, force: true });
    throw new Error(`staged face-founding failed (${face.code}):\n${face.stderr.slice(-800)}`);
  }

  // Boot the daemon from dist; capture its log; await `phase → live`.
  let log = "";
  const daemon: ChildProcess = spawn(process.execPath, [NODE_MAIN, "--root", root, "--port", String(port)], {
    cwd: NODE_CWD,
    env: { ...process.env, ...env },
  });
  daemon.stdout?.on("data", (d) => { log += String(d); });
  daemon.stderr?.on("data", (d) => { log += String(d); });

  const liveAt = Date.now();
  await new Promise<void>((resolve, reject) => {
    const poll = setInterval(() => {
      if (log.includes("phase → live")) { clearInterval(poll); resolve(); }
      else if (daemon.exitCode !== null) { clearInterval(poll); reject(new Error(`staged daemon exited ${daemon.exitCode} before live:\n${log.slice(-800)}`)); }
      else if (Date.now() - liveAt > 120_000) { clearInterval(poll); reject(new Error(`staged daemon never reached live (120s):\n${log.slice(-800)}`)); }
    }, 250);
  });

  return {
    mode: "staged",
    root,
    port,
    bootLog: () => log,
    cli: (args) => runCli(env, args),
    stop: async () => {
      daemon.kill();
      await new Promise((r) => setTimeout(r, 500));
      rmSync(root, { recursive: true, force: true });
    },
    stopDaemonOnly: async () => {
      daemon.kill();
      await new Promise((r) => setTimeout(r, 800));
    },
  };
}

function attachLive(): LarInstance {
  const root = process.env["LAR_ROOT"];
  const port = Number(process.env["LAR_PORT"] ?? 8080);
  if (!root) throw new Error("LAR_TARGET=live requires LAR_ROOT (and usually LAR_PORT) to name the instance");
  // A FOUNDED vessel proves itself by its own address book, which lives with the store it addresses —
  // never in genesis/, where only the shared seed rides. Under LAR_ROOT the store sites at <root>/data/vessel.
  if (!existsSync(join(root, "data", "vessel", "social-bootstrap.json"))) {
    throw new Error(`LAR_TARGET=live: no social bootstrap at ${root}/data/vessel — has this root been founded?`);
  }
  const env = { LAR_ROOT: root, LAR_PORT: String(port) };
  return {
    mode: "live",
    root,
    port,
    bootLog: () => "",                 // a live hearth's log belongs to its operator
    cli: (args) => runCli(env, args),
    stop: async () => { /* NEVER stop, reset, or delete a live instance */ },
    stopDaemonOnly: async () => { /* NEVER touch a live hearth's daemon */ },
  };
}

/** Target an instance per LAR_TARGET: "live" attaches; anything else stages. */
export async function targetInstance(): Promise<LarInstance> {
  return process.env["LAR_TARGET"] === "live" ? attachLive() : openStaged();
}

/**
 * The vessel's Automerge STORE on disk — the one path a raw-storage read may open.
 *
 * It rides under the DATA home (`<root>/data/vessel`) rather than beside the root, because the home
 * inversion split the two XDG homes on whether a thing can be RE-MADE: identity, seal, library and the
 * vessel store crossed to <data>; <state> keeps watermarks alone. A test that hardcodes the older
 * sibling path does not fail loudly — it opens an absent directory, finds no chunks, and reports the
 * document "unavailable", which reads as a replication fault rather than a wrong address.
 */
export function vesselStorageDir(instance: LarInstance): string {
  return join(instance.root, "data", "vessel");
}

/** Read a `key: automerge:...` line from the staged boot log (e.g. "lararium", "catalog"). */
export function bootDocUrl(instance: LarInstance, key: string): string | null {
  const m = instance.bootLog().match(new RegExp(`${key}:\\s+(automerge:[A-Za-z0-9]+)`));
  return m?.[1] ?? null;
}
