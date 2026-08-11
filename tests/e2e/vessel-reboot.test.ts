/**
 * e2e/vessel-reboot — the long-lived-hearth vector: a vessel MUST survive
 * a restart on its own fed store.
 *
 * Found live 2026-06-11: fresh stores boot to `live` every time; a REBOOT
 * on a fed store dies at `openAdminVm ea timeout` — the admin island never
 * signals readiness when it re-mounts existing state. Rhymes with the
 * 2026-06-10 relay heal (a readiness signal that fired on the create path
 * but never the re-attach path; canon: "readiness reads local").
 *
 * The vector: staged vessel boots → feeds one carrier → daemon stops
 * (root PRESERVED via harness stopDaemonOnly) → a second daemon boots the
 * SAME root → MUST reach `phase → live`.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { targetInstance, type LarInstance } from "../harness/instance.js";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const NODE_MAIN = join(REPO_ROOT, "packages/lararium-node/dist/src/main.js");
const NODE_CWD  = join(REPO_ROOT, "packages/lararium-node");
// The WHOLE corpus — the live failure rode a 1,464-record store while a
// single-meme reboot passed; the vector must carry the real load.
// `@` marks a SURFACE (the bag); the content tree inside it reads bare.
const CORPUS    = join(REPO_ROOT, "bags/@lares/ha.ka.ba/lares");
const LARES_URI = "lar:///ha.ka.ba/bags/@lares";

let lar: LarInstance;
let second: ChildProcess | null = null;
let secondLog = "";

beforeAll(async () => {
  lar = await targetInstance();
}, 180_000);

afterAll(async () => {
  second?.kill();
  await new Promise((r) => setTimeout(r, 500));
  if (lar.mode === "staged") rmSync(lar.root, { recursive: true, force: true });
  await lar.stop();
});

describe("vessel reboot — a hearth survives restarting on its own fed store", () => {
  test("boot → feed → stop → REBOOT reaches live", async () => {
    if (lar.mode !== "staged") return;     // lifecycle-mutating — staged only

    const fed = await lar.cli(["act", "LOAD", "--source-uri", CORPUS, "--to", LARES_URI, "--yes", "--json"]);
    expect(fed.json?.["ok"]).toBe(true);
    // let the post-LOAD flush waves settle before the stop
    await new Promise((r) => setTimeout(r, 10_000));

    await lar.stopDaemonOnly();

    // SAME port as the first daemon — the live failures all rebooted on the
    // original port; the reboot must own the dead daemon's whole seat.
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
        else if (second!.exitCode !== null) { clearInterval(poll); reject(new Error(`reboot daemon exited ${second!.exitCode}:\n${secondLog.slice(-800)}`)); }
        else if (Date.now() - t0 > 120_000) { clearInterval(poll); reject(new Error(`reboot never reached live:\n${secondLog.slice(-800)}`)); }
      }, 500);
    });

    expect(secondLog).toContain("phase → live");
  }, 300_000);
});
