/**
 * e2e/carrier-roundtrip — the kupono vectors for "carrier-whole at rest"
 * (disk-projection#granularity, operator ruling 2026-06-11).
 *
 * The grain ladder: disk = whole carriers · CRDT doc = record-grain · VM =
 * decomposed. These vectors assert the DISK stratum after a carrier-borne
 * LOAD lands record-grain content in the @lares doc:
 *
 *   V1 — the doc holds record-grain (parent + ahu children) — LAWFUL
 *   V2 — the @lares disk mirror materializes some projection at all
 *   V3 — NO fragment files: no `#`-grain filename ever reaches disk
 *   V4 — the parent's projected carrier round-trips byte-faithful to source
 *
 * A failing vector NAMES A HOLE — the point of this file. Holes get burned
 * out and replaced with clean web3 code; the vector flips green and stays.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { targetInstance, type LarInstance } from "../harness/instance.js";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const BOOT_MEME = join(REPO_ROOT, "bags/@lares/v0.1/api/lares/noosphere-boot.md");
const LARES_URI = "lar:///ha.ka.ba/@lares";

let lar: LarInstance;
let loadOk = false;

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

/** Poll the staged root's @lares mirror surface until files appear (or timeout). */
async function awaitMirrorFiles(root: string, timeoutMs = 30_000): Promise<string[]> {
  const mirrorRoot = join(root, "bags/@lares/v0.1");
  const start = Date.now();
  for (;;) {
    const files = walkFiles(mirrorRoot);
    if (files.length > 0 || Date.now() - start > timeoutMs) return files;
    await new Promise((r) => setTimeout(r, 500));
  }
}

beforeAll(async () => {
  lar = await targetInstance();
  if (lar.mode !== "staged") return;        // mutating vectors — staged only
  const r = await lar.cli(["act", "LOAD", "--source-uri", BOOT_MEME, "--to", LARES_URI, "--yes", "--json"]);
  loadOk = r.json?.["ok"] === true;
});
afterAll(async () => { await lar.stop(); });

describe("carrier-whole at rest — the kupono vectors", () => {
  test("V1 — the CRDT doc holds record-grain (parent + ahu children): lawful", () => {
    if (lar.mode !== "staged") return;
    expect(loadOk).toBe(true);               // 17 records asserted in smoke; here: the LOAD landed
  });

  test("V2 — the @lares mirror materializes a disk projection after LOAD", async () => {
    if (lar.mode !== "staged") return;
    const files = await awaitMirrorFiles(lar.root);
    expect(files.length).toBeGreaterThan(0);
  });

  // HOLE H1 (named 2026-06-11): the projector flushes every record — parent
  // AND ahu children — to its own file (children site as parent/child.md, so
  // a bare `#` scan misses them). The codified legacy lives in meme-write.ts
  // ("per-node law ... the child tiddler's own flush writes the child's file").
  // Burn: fragment-URI records never flush; a child change re-flushes its
  // PARENT. This vector alarms (fails) the moment the burn lands — then drop
  // the `.fails` and it stands guard.
  test.fails("V3 — one carrier in, ONE file out: ahu children never become disk files", async () => {
    if (lar.mode !== "staged") throw new Error("staged-only vector");
    const files = await awaitMirrorFiles(lar.root, 5_000);  // V2 already waited
    expect(files.filter((f) => f.includes("#") || /%23/.test(f))).toEqual([]);
    expect(files).toHaveLength(1);
  });

  // HOLE H2 (named 2026-06-11): the parent's flush re-renders the envelope
  // from FIELDS (iam re-ordered, origin-bag injected) with kahea refs in
  // place of ahu bodies — not the operator's carrier. Burn: the membrane
  // retains the whole carrier on the parent record (children stay derived,
  // DB/VM grain); the parent flush emits it byte-faithful.
  test.fails("V4 — the parent carrier round-trips byte-faithful to the operator's source", async () => {
    if (lar.mode !== "staged") throw new Error("staged-only vector");
    const files = await awaitMirrorFiles(lar.root, 5_000);
    const parent = files.find((f) => f.endsWith("noosphere-boot.md"));
    expect(parent, "no whole-carrier projection of the loaded meme found").toBeTruthy();
    const projected = readFileSync(parent as string, "utf8");
    const source    = readFileSync(BOOT_MEME, "utf8");
    expect(projected).toBe(source);
  });
});
