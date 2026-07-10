/**
 * e2e/working-loop — the live working→canon loop, witnessed end-to-end.
 *
 * Residency verbs run IN the active wiki island over ITS composite (where the
 * per-wiki working layer + canon both live), commanded via `lares act --in-wiki`
 * (→ the `wiki-act` forwarder → placeWikiVerb); the admin never reaches the
 * per-fingerprint working binding.
 *
 *   W1 — LOAD --to wikis/@lares/working --in-wiki → the carrier projects to
 *        wikis/ (the per-wiki working write-layer disk surface).
 *   W2 — MOVE wikis/@lares/working → bags/@lares --in-wiki (PROMOTION) → the
 *        carrier publishes to bags/@lares (canon) AND retracts from wikis/.
 *
 * Closes the working/canon spine's live loop: edit (→ working → wikis/) →
 * promote (→ canon → bags/), island-local.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { targetInstance, type LarInstance } from "../harness/instance.js";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const BOOT_MEME = join(REPO_ROOT, "bags/@lares/ha.ka.ba/@lares/api/lares/noosphere-boot.mem");
const BOOT_URI  = "lar:///ha.ka.ba/@lares/api/lares/noosphere-boot";
const WORKING   = "lar:///ha.ka.ba/wikis/@lares/working";
const LARES     = "lar:///ha.ka.ba/bags/@lares";
const REL = "ha.ka.ba/@lares/api/lares/noosphere-boot.mem";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lar: LarInstance;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** True once a noosphere-boot carrier appears (want=true) / vanishes (want=false) under dir. */
async function awaitCarrier(dir: string, want: boolean, timeoutMs = 45_000): Promise<boolean> {
  const start = Date.now();
  for (;;) {
    const present = walk(dir).some((f) => f.endsWith("noosphere-boot.mem"));
    if (present === want) return true;
    if (Date.now() - start > timeoutMs) return false;
    await sleep(500);
  }
}

beforeAll(async () => { lar = await targetInstance(); }, 120_000);
afterAll(async () => { await lar.stop(); });

describe("working→canon live loop (island-local, --in-wiki)", () => {
  test("W1 — LOAD --to @working --in-wiki projects to wikis/ (the live write layer)", async () => {
    if (lar.mode !== "staged") return;
    const r = await lar.cli(["act", "LOAD", "--source-uri", BOOT_MEME, "--to", WORKING, "--in-wiki", "--yes", "--json"]);
    expect(r.json?.["ok"], `LOAD --to @working --in-wiki failed: ${JSON.stringify(r.json)}`).toBe(true);
    expect(await awaitCarrier(join(lar.root, "wikis"), true), "carrier did not project under wikis/").toBe(true);
    // and NOT into canon yet — promotion is a separate, deliberate act.
    expect(existsSync(join(lar.root, "bags/@lares", REL)), "carrier reached canon without promotion").toBe(false);
  }, 90_000);

  test("W2 — MOVE @working→@lares --in-wiki (promotion) publishes to bags/@lares + retracts wikis/", async () => {
    if (lar.mode !== "staged") return;
    const r = await lar.cli(["act", "MOVE", "--title", BOOT_URI, "--from", WORKING, "--to", LARES, "--in-wiki", "--yes", "--json"]);
    expect(r.json?.["ok"], `MOVE @working→@lares --in-wiki failed: ${JSON.stringify(r.json)}`).toBe(true);
    expect(await awaitCarrier(join(lar.root, "bags/@lares"), true), "carrier did not publish to bags/@lares (canon)").toBe(true);
    expect(await awaitCarrier(join(lar.root, "wikis"), false), "carrier still sits in wikis/ after promotion").toBe(true);
  }, 90_000);
});
