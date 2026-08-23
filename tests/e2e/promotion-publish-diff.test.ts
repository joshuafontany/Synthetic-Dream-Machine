/**
 * e2e/promotion-publish-diff — the cap-gated promotion MOVE, witnessed as a
 * disk publish-diff (shore-law: working↔canon crosses only by an audited MOVE).
 *
 * Promotion is CARRIER-grain (operator ruling 2026-06-18): a MOVE of a carrier
 * root carries its whole group (root + #fragment + /path), so a meme publishes
 * entire and never orphans a fragment. Here @lares→@lararium (both already
 * disk-mirrored) stands in for the working→canon crossing.
 *
 * THE round-trip's three once-unbuilt pieces are now CLOSED, each witnessed:
 *   - V3 (the @working disk mirror) — working-loop.test.ts
 *   - @working CLI-reachability + ingest-back — wikis-ingest-back.test.ts (--in-wiki)
 *   - minted-@{slug} canon projection — minted-canon-projection.test.ts
 * This vector keeps its own focus: the MOVE gate + change-id + effect-record +
 * the disk publish-diff, with @lares→@lararium standing in for the crossing.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { targetInstance, type LarInstance } from "../harness/instance.js";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const BOOT_MEME = join(REPO_ROOT, "bags/lares/ha.ka.ba/lares/api/noosphere-boot.mem");
const BOOT_URI  = "lar:///ha.ka.ba/lares/api/noosphere-boot";
const LARES_URI    = "lar:///ha.ka.ba/bags/lares";
const LARARIUM_URI = "lar:///ha.ka.ba/bags/lararium";
const REL = "ha.ka.ba/lares/api/noosphere-boot.mem";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lar: LarInstance;

/** Poll a path until it reaches the wanted existence state (or timeout). */
async function awaitFileState(path: string, want: boolean, timeoutMs = 30_000): Promise<boolean> {
  const start = Date.now();
  for (;;) {
    if (existsSync(path) === want) return true;
    if (Date.now() - start > timeoutMs) return false;
    await sleep(500);
  }
}

/** Poll BOTH publish surfaces in one window — the carrier gains the destination
 *  mirror AND leaves the source mirror (the cross-mirror move resolves together). */
async function awaitPublishDiff(gainPath: string, losePath: string, timeoutMs = 45_000): Promise<{ gained: boolean; lost: boolean }> {
  const start = Date.now();
  for (;;) {
    const gained = existsSync(gainPath);
    const lost   = !existsSync(losePath);
    if ((gained && lost) || Date.now() - start > timeoutMs) return { gained, lost };
    await sleep(500);
  }
}

beforeAll(async () => {
  lar = await targetInstance();
  if (lar.mode !== "staged") return;          // mutating — staged only
  const r = await lar.cli(["act", "LOAD", "--source-uri", BOOT_MEME, "--to", LARES_URI, "--yes", "--json"]);
  if (r.json?.["ok"] !== true) throw new Error(`seed LOAD failed: ${JSON.stringify(r.json)}`);
  if (!(await awaitFileState(join(lar.root, "bags/lares", REL), true)))
    throw new Error("seed: the @lares projection never materialized");
}, 120_000);
afterAll(async () => { await lar.stop(); });

describe("promotion publish-diff — the cap-gated carrier MOVE across a canon shore", () => {
  test("P1 — the cap-gated carrier MOVE succeeds for the owner, with an audit record", async () => {
    if (lar.mode !== "staged") return;
    const r = await lar.cli(["act", "MOVE", "--title", BOOT_URI, "--from", LARES_URI, "--to", LARARIUM_URI, "--yes", "--json"]);
    expect(r.json?.["ok"]).toBe(true);
    const data = r.json?.["data"] as Record<string, unknown>;
    expect(String(data?.["audit"])).toMatch(/@daemon\/outcomes\//);  // the effect-record audit URI
    expect(Number(data?.["moved"])).toBeGreaterThan(1);             // the WHOLE carrier group, not one title
  }, 60_000);

  test("P2 — the disk publish-diff: the whole carrier moves bags/lares → bags/lararium", async () => {
    if (lar.mode !== "staged") return;
    const { gained, lost } = await awaitPublishDiff(
      join(lar.root, "bags/lararium", REL),
      join(lar.root, "bags/lares",    REL),
    );
    expect(gained, "the carrier did not publish under bags/lararium").toBe(true);
    expect(lost,   "the carrier still sits under bags/lares").toBe(true);
  }, 90_000);
});
