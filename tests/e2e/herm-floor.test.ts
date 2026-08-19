/**
 * e2e/herm-floor — THE HERM CONTRACT, held red until the floor of the cap stack stands.
 *
 * INTENTIONALLY RED. These name what the floor owes, and they fail today.
 *
 * A HERM IS NOT A LARARIUM MISSING SOMETHING. The stack says so in its own types: `VesselClass` reads
 * "hearth" | "leaf" | "herm", `NodeRecipe` reads "lararium" | "herm" — a recipe an operator CHOOSES — and
 * `personaSlotCeiling("herm") === 0` bars a seated persona root outright. The code's word for it is
 * "faceless-by-class". So facelessness is not a window between two commands; it is what this tier IS, and a
 * herm someone stands as a public crossroads may never light a face at all.
 *
 * That makes the herm the BASE CASE of the lararium cap stack rather than an edge of it — a lararium is a
 * herm with its hearth-fire lit — and it makes the present fault worse than a rough edge: the daemon cannot
 * boot its own floor. A live stand prints "the PLACE stands" and then dies reaching for a face.
 *
 * WHY THESE ARE E2E AND NOT UNIT. Three times this session a unit vector fenced the exact site just found,
 * went green, and the live boot produced another one further along — the prefab, then the wiring pass, then
 * the verifier. A vector that fences a SITE finds one; a vector that stands the PATH lets the boot enumerate
 * its own reaches for a face. R1 fails with the next site's name in its message, and that is its job.
 *
 *   R1 — a herm reaches `live`                         · the base case of the stack
 *   R2 — a herm serves the public shelf                · carrying is what the floor is FOR
 *   R3 — a herm carries a crossing                     · admit-by-lease, the relay role that is load-bearing
 *   R4 — a herm refuses hearth-scoped acts LEGIBLY     · refusal is a feature of the floor
 *   R5 — a herm LIFTS into a lararium                  · the cap-stack transition the runbook's rite performs
 */
import { describe, test, expect, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawn } from "node:child_process";

const REPO = new URL("../..", import.meta.url).pathname;
const CLI  = join(REPO, "packages/lares-cli/dist/src/bin/lares.js");
const PORT = 8231;
let root = "";

/** A herm's own root: the tracked genesis, and nothing else. No face is ever lit here. */
function standHermRoot(): string {
  const r = mkdtempSync(join(tmpdir(), "lares-herm-"));
  execFileSync("bash", ["-lc", `cd ${REPO} && git ls-files -z genesis/ | xargs -0 -I{} cp --parents "{}" "${r}/"`]);
  return r;
}

function findSock(dir: string, depth = 5): string | null {
  if (depth < 0 || !existsSync(dir)) return null;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (n === "lares.sock") return dir;
    let d = false; try { d = statSync(p).isDirectory(); } catch { d = false; }
    if (d) { const hit = findSock(p, depth - 1); if (hit) return hit; }
  }
  return null;
}

/** Stand the floor and report what it reached. Resolves the boot log either way — a fault is a result. */
async function standHerm(r: string): Promise<{ live: boolean; log: string }> {
  const child = spawn(process.execPath, [CLI, "vessel", "stand"], {
    env: { ...process.env, LAR_ROOT: r, LAR_PORT: String(PORT) }, cwd: REPO,
  });
  let log = "";
  child.stdout.on("data", (b) => { log += String(b); });
  child.stderr.on("data", (b) => { log += String(b); });
  const deadline = Date.now() + 150_000;
  for (;;) {
    if (/phase → live/.test(log)) return { live: true, log };
    if (/boot fault|fatal|Error:/.test(log)) return { live: false, log };
    if (Date.now() > deadline) return { live: false, log: log + "\n[timeout]" };
    await new Promise((res) => setTimeout(res, 500));
  }
}

afterAll(() => {
  try {
    const pid = execFileSync("bash", ["-lc",
      `ss -ltnp 2>/dev/null | grep ':${PORT} ' | grep -oP 'pid=\\K[0-9]+' | head -1`], { encoding: "utf8" }).trim();
    if (pid) process.kill(Number(pid));
  } catch { /* nothing held the port */ }
  if (root) rmSync(root, { recursive: true, force: true });
});

describe("the herm — the floor of the lararium cap stack", () => {
  test("R1 — a herm reaches live: found, stood, and NO face ever lit", async () => {
    root = standHermRoot();
    execFileSync(process.execPath, [CLI, "vessel", "found"], {
      env: { ...process.env, LAR_ROOT: root }, cwd: REPO, stdio: "ignore",
    });
    const { live, log } = await standHerm(root);
    // The failure carries the next reach-for-a-face by name — that is what this vector is for.
    expect(live, `the floor did not stand:\n${log.slice(-1200)}`).toBe(true);
  }, 200_000);

  test("R2 — a herm serves the public shelf with no hearth-fire lit", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/oracle/pointer`).catch(() => null);
    expect(res?.ok, "the read-face never answered — carrying is what the floor is FOR").toBe(true);
  }, 60_000);

  test("R3 — a herm carries: its verb channel answers a caller", async () => {
    const dir = findSock(root);
    expect(dir, "no UDS door — a herm that carries nothing has no floor under anything").not.toBeNull();
    const { invokeLocal } = await import("../../packages/lares-cli/src/local-connector.js");
    const r = await invokeLocal("where", {}, `0x${"0".repeat(64)}`, { dataDir: dir!, timeoutMs: 20_000 });
    expect((r as { status?: string }).status).toBe("done");
  }, 60_000);

  test("R4 — a herm refuses a hearth-scoped act LEGIBLY, never by stack trace", async () => {
    const dir = findSock(root);
    const { invokeLocal } = await import("../../packages/lares-cli/src/local-connector.js");
    const r = await invokeLocal("persona-selves", {}, `0x${"0".repeat(64)}`, { dataDir: dir!, timeoutMs: 20_000 })
      .catch((e: Error) => ({ error: e.message }));
    // Either an unknown verb or a named refusal — both say "light a face". Neither may be a raw throw.
    expect(JSON.stringify(r)).toMatch(/light a face|unknown verb|no face|waking floor/i);
  }, 60_000);

  test("R5 — a herm LIFTS into a lararium: light the face, re-wake, the hearth verbs stand", async () => {
    execFileSync(process.execPath, [CLI, "persona", "new", "0", "--name", "the lift"], {
      env: { ...process.env, LAR_ROOT: root }, cwd: REPO, stdio: "ignore",
    });
    const pid = execFileSync("bash", ["-lc",
      `ss -ltnp 2>/dev/null | grep ':${PORT} ' | grep -oP 'pid=\\K[0-9]+' | head -1`], { encoding: "utf8" }).trim();
    if (pid) { process.kill(Number(pid)); await new Promise((r) => setTimeout(r, 2500)); }
    const { live } = await standHerm(root);
    expect(live, "the lift left the vessel unable to stand").toBe(true);

    const dir = findSock(root);
    const { invokeLocal } = await import("../../packages/lares-cli/src/local-connector.js");
    const r = await invokeLocal("persona-selves", {}, `0x${"0".repeat(64)}`, { dataDir: dir!, timeoutMs: 20_000 });
    expect((r as { status?: string }).status).toBe("done");
  }, 240_000);
});
