/**
 * ingest-quiescence.test.ts — NEXT VECTOR build 3: the composed loop's
 * quiescence vectors (§6 CI law: an echo storm = a one-line test failure).
 *
 *   Q1 — project∘ingest = identity: a settled mirror scans all-unchanged
 *   Q2 — one-cycle convergence: a disk content edit ingests, re-projects
 *        canonical, and the NEXT scan reads unchanged (the gofmt-loop guard)
 *   Q3 — quiescence: zero writes after round N — the settled file's bytes
 *        hold through a quiet window
 *   Q4 — the NFC membrane assertion: non-NFC bytes refuse loudly at the
 *        gesture, never entering the merge seat
 *
 * Staged-only (mutating). Rides the live CLI: feed one boot meme, then
 * drive `lares ingest` against the vessel's own mirror.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { targetInstance, type LarInstance } from "../harness/instance.js";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const BOOT_MEME = join(REPO_ROOT, "bags/@lares/ha.ka.ba/lares/api/lares/noosphere-boot.mem");
const BOOT_PROJ = "bags/@lares/ha.ka.ba/lares/api/lares/noosphere-boot.mem";
const LARES_URI = "lar:///ha.ka.ba/bags/@lares";

let lar: LarInstance;
let projected = "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function awaitProjection(timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  while (!existsSync(projected)) {
    if (Date.now() - start > timeoutMs) throw new Error("projection never landed");
    await sleep(500);
  }
}

/** Wait until the projected file's bytes stabilize across a quiet window. */
async function awaitSettled(quietMs = 4_000, timeoutMs = 60_000): Promise<string> {
  const start = Date.now();
  let last = ""; let since = Date.now();
  for (;;) {
    const now = existsSync(projected) ? readFileSync(projected, "utf8") : "";
    if (now !== last) { last = now; since = Date.now(); }
    else if (now && Date.now() - since > quietMs) return now;
    if (Date.now() - start > timeoutMs) return now;
    await sleep(500);
  }
}

function ingest(args: string[]): ReturnType<LarInstance["cli"]> {
  return lar.cli(["ingest", "--source", join(lar.root, "bags/@lares"), "--to", LARES_URI, ...args, "--json"]);
}

beforeAll(async () => {
  lar = await targetInstance();
  if (lar.mode !== "staged") return;
  projected = join(lar.root, BOOT_PROJ);
  const r = await lar.cli(["act", "LOAD", "--source-uri", BOOT_MEME, "--to", LARES_URI, "--yes", "--json"]);
  if (r.json?.["ok"] !== true) throw new Error(`seed LOAD failed: ${JSON.stringify(r.json)}`);
  await awaitProjection();
  await awaitSettled();
}, 120_000);
afterAll(async () => { await lar.stop(); });

describe("ingest quiescence — the composed loop holds still", () => {
  test("Q1 — project∘ingest = identity: the settled mirror scans all-unchanged", async () => {
    if (lar.mode !== "staged") return;
    const r = await ingest([]);
    const d = r.json?.["data"] as Record<string, unknown>;
    expect(d["changed"]).toBe(0);
    expect(d["new"]).toBe(0);
    expect(d["unchanged"]).toBe(1);
  }, 60_000);

  test("Q2 — a disk content edit converges in ONE cycle", async () => {
    if (lar.mode !== "staged") return;
    const before = readFileSync(projected, "utf8");
    const edited = before.replace(
      "# Entry ~ Lararium Boot",
      "# Entry ~ Lararium Boot (quiescence-edit)",
    );
    expect(edited).not.toBe(before); // guard: heading drift must fail loud, not collapse to a no-op edit
    writeFileSync(projected, edited);

    const r = await ingest(["--apply", "--yes"]);
    const d = r.json?.["data"] as Record<string, unknown>;
    const carriers = d["carriers"] as Array<Record<string, unknown>>;
    expect(carriers?.[0]?.["decision"]).toBe("ingest");

    // The projection wave re-renders the carrier canonical, edit preserved.
    await sleep(2_000);
    const settled = await awaitSettled();
    expect(settled).toContain("(quiescence-edit)");

    // ONE cycle: the next scan reads the mirror as unchanged.
    const r2 = await ingest([]);
    const d2 = r2.json?.["data"] as Record<string, unknown>;
    expect(d2["changed"]).toBe(0);
    expect(d2["unchanged"]).toBe(1);
  }, 120_000);

  test("Q3 — quiescence: zero writes after round N", async () => {
    if (lar.mode !== "staged") return;
    const settled = await awaitSettled();
    await sleep(6_000);
    expect(readFileSync(projected, "utf8")).toBe(settled);
  }, 60_000);

  test("Q4 — the NFC membrane assertion refuses foreign normal forms loudly", async () => {
    if (lar.mode !== "staged") return;
    const nfdPath = join(lar.root, "bags/@lares/ha.ka.ba/lares/api/lares/nfd-probe.md");
    const body = readFileSync(projected, "utf8")
      .replace(/noosphere-boot/g, "nfd-probe")
      .replace("# Entry", "# Entrée".normalize("NFD"));   // é as e + combining accent
    writeFileSync(nfdPath, body);
    expect(body).not.toBe(body.normalize("NFC"));

    const r = await ingest([]);
    const d = r.json?.["data"] as Record<string, unknown>;
    const nonNfc = d["nonNfc"] as string[];
    expect(nonNfc).toContain("lar:///ha.ka.ba/lares/api/lares/nfd-probe");
    expect(d["changed"]).toBe(0);
    expect(d["new"]).toBe(0);
  }, 60_000);
});
