/**
 * wikis-ingest-back.test.ts — thread 2: the @working write-layer's disk
 * surface ingests BACK. @working projects per-wiki to wikis/@{slug}/…;
 * editing a projected wikis/ file and running
 * `lares ingest --source <wikis> --to @working --in-wiki` derives the carrier
 * URI off the @working plane (wikisFileToUri) and lands the edit back in
 * @working — closing the loop the projection opened (wikis/ projected OUT
 * only until this thread).
 *
 *   WB1 — round-trip identity: a settled wikis/ mirror scans all-unchanged
 *         through the @working plane (proves wikisFileToUri ⇄ the projector)
 *   WB2 — a disk edit on a wikis/ file ingests back to @working in one cycle
 *
 * Staged-only (mutating). Rides the live CLI + the wiki island (--in-wiki),
 * mirroring ingest-quiescence Q1/Q2 on the write-layer plane.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { targetInstance, type LarInstance } from "../harness/instance.js";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const BOOT_MEME = join(REPO_ROOT, "bags/@lares/ha.ka.ba/lares/api/noosphere-boot.mem");
const WORKING   = "lar:///ha.ka.ba/wikis/@lares/working";

let lar: LarInstance;
let wikisDir  = "";
let projected = "";   // the boot carrier as projected under wikis/@{slug}/

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

async function awaitWikisCarrier(timeoutMs = 60_000): Promise<string> {
  const start = Date.now();
  for (;;) {
    const hit = walk(wikisDir).find((f) => f.endsWith("noosphere-boot.mem"));
    if (hit) return hit;
    if (Date.now() - start > timeoutMs) throw new Error("boot carrier never projected under wikis/");
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

function ingest(extra: string[]): ReturnType<LarInstance["cli"]> {
  return lar.cli(["ingest", "--source", wikisDir, "--to", WORKING, "--in-wiki", ...extra, "--json"]);
}

beforeAll(async () => {
  lar = await targetInstance();
  if (lar.mode !== "staged") return;
  wikisDir = join(lar.root, "wikis");
  const r = await lar.cli(["act", "LOAD", "--source-uri", BOOT_MEME, "--to", WORKING, "--in-wiki", "--yes", "--json"]);
  if (r.json?.["ok"] !== true) throw new Error(`seed LOAD --to @working failed: ${JSON.stringify(r.json)}`);
  projected = await awaitWikisCarrier();
  await awaitSettled();
}, 120_000);
afterAll(async () => { await lar.stop(); });

describe("wikis ingest-back — the @working write-layer round-trips", () => {
  test("WB1 — a settled wikis/ mirror scans all-unchanged through @working", async () => {
    if (lar.mode !== "staged") return;
    const r = await ingest([]);
    const d = r.json?.["data"] as Record<string, unknown>;
    // the wikis/ carrier derived a URI off the @working plane — NOT skipped
    expect(Number(d["scanned"])).toBeGreaterThanOrEqual(1);
    expect((d["skipped"] as string[]) ?? []).toHaveLength(0);
    expect(d["new"]).toBe(0);
    expect(d["changed"]).toBe(0);
  }, 60_000);

  test("WB2 — a disk edit on a wikis/ file ingests back to @working in one cycle", async () => {
    if (lar.mode !== "staged") return;
    const before = readFileSync(projected, "utf8");
    // Bind to the SHAPE of a heading, never to its prose. What the seed's first heading SAYS belongs to
    // the operator; a literal here turns any rewording of theirs into a red suite, which is what it did.
    const edited = before.replace(/^(#\s+\S.*)$/m, "$1 (wikis-ingest-back-edit)");
    expect(edited).not.toBe(before);  // guard: a carrier with no heading at all fails loud, never a no-op
    writeFileSync(projected, edited);

    const r = await ingest(["--apply", "--yes"]);
    const d = r.json?.["data"] as Record<string, unknown>;
    const carriers = d["carriers"] as Array<Record<string, unknown>>;
    expect(carriers?.[0]?.["decision"]).toBe("ingest");

    // the @working projection re-renders canonical, the edit preserved
    await sleep(2_000);
    const settled = await awaitSettled();
    expect(settled).toContain("(wikis-ingest-back-edit)");

    // ONE cycle: the next scan reads the @working mirror unchanged
    const r2 = await ingest([]);
    const d2 = r2.json?.["data"] as Record<string, unknown>;
    expect(d2["changed"]).toBe(0);
    expect(Number(d2["unchanged"])).toBeGreaterThanOrEqual(1);
  }, 120_000);
});
