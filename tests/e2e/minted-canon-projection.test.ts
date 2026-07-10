/**
 * minted-canon-projection.test.ts — thread 1: a minted USER wiki's own
 * `@{slug}` canon projects to `bags/@{slug}`.
 *
 * The disk grant carried literal mirrors for @lares/@lararium and a per-wiki
 * @working leaf, but nothing projected a freshly-minted wiki's own canon. The
 * self-canon grant (authority) + the recipe designating wikiBagUri(slug)
 * (designation) now close it: resolveDiskMirrors expands @{slug} → bags/@{slug}
 * for a minted wiki, while the system wikis keep their literal roots.
 *
 *   mint a user wiki → set it active → REBOOT (the active marker only loads on
 *   boot) → LOAD a carrier into its @{slug} canon → it lands under bags/@{slug}.
 *
 * Staged-only (lifecycle-mutating). Rides the reboot harness pattern
 * (vessel-reboot) + the live CLI (--in-wiki LOAD into the minted canon).
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { targetInstance, type LarInstance } from "../harness/instance.js";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const NODE_MAIN = join(REPO_ROOT, "packages/lararium-node/dist/src/main.js");
const NODE_CWD  = join(REPO_ROOT, "packages/lararium-node");
const BOOT_MEME = join(REPO_ROOT, "bags/@lares/ha.ka.ba/@lares/api/lares/noosphere-boot.mem");
const SLUG      = "my-world";
const MY_WORLD  = `lar:///ha.ka.ba/bags/@${SLUG}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lar: LarInstance;
let second: ChildProcess | null = null;
let secondLog = "";

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** True once `port` accepts a bind — the old daemon released it. The reboot
 *  reuses lar.port (lar.cli targets it), so we MUST wait for release after
 *  stopDaemonOnly (which only sleeps 800ms) before spawning the second daemon —
 *  else it dies fast on EADDRINUSE under suite load (the dev-loop-restart cure:
 *  wait-for-port-free, never a fixed sleep). */
function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.listen(port, "127.0.0.1", () => srv.close(() => resolve(true)));
  });
}

async function awaitPortFree(port: number, timeoutMs = 20_000): Promise<void> {
  const start = Date.now();
  while (!(await portFree(port))) {
    if (Date.now() - start > timeoutMs) throw new Error(`port ${port} never freed after stopDaemonOnly`);
    await sleep(300);
  }
}

async function awaitCarrier(dir: string, timeoutMs = 60_000): Promise<boolean> {
  const start = Date.now();
  for (;;) {
    if (walk(dir).some((f) => f.endsWith("noosphere-boot.mem"))) return true;
    if (Date.now() - start > timeoutMs) return false;
    await sleep(500);
  }
}

beforeAll(async () => { lar = await targetInstance(); }, 180_000);
afterAll(async () => {
  second?.kill();
  await sleep(500);
  if (lar.mode === "staged") rmSync(lar.root, { recursive: true, force: true });
  await lar.stop();
});

describe("minted-canon projection — a user wiki's @{slug} canon reaches bags/@{slug}", () => {
  test("mint → activate → reboot → LOAD into @{slug} canon → projects to bags/@{slug}", async () => {
    if (lar.mode !== "staged") return;     // lifecycle-mutating — staged only

    // 1) mint a fresh user wiki + 2) set it active for the next boot
    const minted = await lar.cli(["wiki", "init", SLUG, "--json"]);
    expect(minted.json?.["ok"], `mint failed: ${JSON.stringify(minted.json)}`).toBe(true);
    const opened = await lar.cli(["wiki", "open", SLUG, "--json"]);
    expect(opened.json?.["ok"] ?? true).not.toBe(false);

    // 3) REBOOT — the active-wiki marker only takes on boot (open does not remount)
    await lar.stopDaemonOnly();
    await awaitPortFree(lar.port);   // the reboot reuses lar.port — wait for the old daemon to release it
    second = spawn(process.execPath, [NODE_MAIN, "--root", lar.root, "--port", String(lar.port)], {
      cwd: NODE_CWD,
      env: { ...process.env, LAR_ROOT: lar.root, LAR_PORT: String(lar.port) },
    });
    second.stdout?.on("data", (d) => { secondLog += String(d); });
    second.stderr?.on("data", (d) => { secondLog += String(d); });
    await new Promise<void>((resolve, reject) => {
      const t0 = Date.now();
      const poll = setInterval(() => {
        if (secondLog.includes("phase → live")) { clearInterval(poll); resolve(); }
        else if (second!.exitCode !== null) { clearInterval(poll); reject(new Error(`reboot exited ${second!.exitCode}:\n${secondLog.slice(-800)}`)); }
        else if (Date.now() - t0 > 120_000) { clearInterval(poll); reject(new Error(`reboot never reached live:\n${secondLog.slice(-800)}`)); }
      }, 500);
    });

    // sanity: the reboot actually activated the minted wiki (not the @lares fallback)
    expect(secondLog, "reboot did not activate the minted wiki").toContain(`→ ${SLUG}`);

    // 4) LOAD a carrier into the minted wiki's OWN canon (@{slug}), in-wiki
    const r = await lar.cli(["act", "LOAD", "--source-uri", BOOT_MEME, "--to", MY_WORLD, "--in-wiki", "--yes", "--json"]);
    expect(r.json?.["ok"], `LOAD --to @${SLUG} --in-wiki failed: ${JSON.stringify(r.json)}`).toBe(true);

    // 5) the self-canon mirror projects @{slug} canon to bags/@{slug}
    const projected = await awaitCarrier(join(lar.root, `bags/@${SLUG}`));
    expect(projected, `minted canon never projected to bags/@${SLUG}`).toBe(true);
  }, 300_000);
});
