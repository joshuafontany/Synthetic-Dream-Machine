/**
 * e2e/carrier-roundtrip — the kupono vectors for "carrier-whole at rest"
 * (disk-projection#granularity, operator ruling 2026-06-11).
 *
 * The grain ladder: disk = whole carriers · CRDT doc = record-grain · VM =
 * decomposed. These vectors assert the DISK stratum after a carrier-borne
 * LOAD lands record-grain content in the lares doc:
 *
 *   V1 — the doc holds record-grain (parent + ahu children) — LAWFUL
 *   V2 — the @lares disk mirror materializes some projection at all
 *   V3 — NO fragment files: no `#`-grain filename ever reaches disk
 *   V4 — the projected carrier round-trips content-whole; iam framing
 *        normalizes once (canonical-form law)
 *
 * A failing vector NAMES A HOLE — the point of this file. Holes H1/H2 got
 * burned out 2026-06-11 (group routing + the expandMemeRefs recompose
 * inverse); the vectors flipped green and now stand guard.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { targetInstance, type LarInstance } from "../harness/instance.js";
import { memeticWikitextDeserializer, expandMemeRefs } from "../../packages/lararium-tw5/src/deserializer.js";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const BOOT_MEME = join(REPO_ROOT, "bags/lares/ha.ka.ba/lares/api/noosphere-boot.mem");
const LARES_URI = "lar:///ha.ka.ba/bags/lares";
const BOOT_URI  = "lar:///ha.ka.ba/lares/api/noosphere-boot";

/** Canonical render of carrier text through the membrane (the V4 law's left side). */
function renderOf(text: string, uri: string): string {
  const records = memeticWikitextDeserializer(text, { title: uri });
  const map = new Map(records.map((r) => [String(r.title), r] as const));
  return expandMemeRefs((t) => map.get(t), uri) ?? "";
}

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
  const mirrorRoot = join(root, "bags/lares");
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
    expect(loadOk).toBe(true);               // 18 records asserted in smoke; here: the LOAD landed
  });

  test("V2 — the @lares mirror materializes a disk projection after LOAD", async () => {
    if (lar.mode !== "staged") return;
    const files = await awaitMirrorFiles(lar.root);
    expect(files.length).toBeGreaterThan(0);
  });

  // Hole H1 (named 2026-06-11, BURNED same day): the projector used to flush
  // every record — parent AND ahu children — to its own file. Now fragment
  // URIs resolve to no disk path (bag-paths), and the projector group-routes:
  // a child change climbs `fragment-parent` to the carrier root and re-flushes
  // the ROOT. One carrier in, one file out. This vector stands guard.
  test("V3 — one carrier in, ONE file out: ahu children never become disk files", async () => {
    if (lar.mode !== "staged") return;
    const files = await awaitMirrorFiles(lar.root, 5_000);  // V2 already waited
    expect(files.filter((f) => f.includes("#") || /%23/.test(f))).toEqual([]);
    expect(files).toHaveLength(1);
  });

  // Hole H2 (named 2026-06-11; the retain-whole-carrier direction DIED under
  // the co-projection ruling — recomputable bytes never enter the record
  // stratum). Byte-fidelity comes from the pipeline instead: lossless
  // membrane + the recompose inverse (expandMemeRefs), under the
  // canonical-form law (handoff #pattern-integrities §2):
  //   - operator CONTENT bytes survive whole — everything outside the iam
  //     fence compares byte-exact against the source;
  //   - iam FRAMING normalizes once (sorted keys, aligned equals, the
  //     namespace line re-homed to the SOH) — authored key order does not
  //     survive the record stratum; retaining bytes for it was H2, dead;
  //   - idempotence + parse∘render ≡ records hold in the membrane harness
  //     (packages/lararium-tw5/tests/meme-roundtrip.test.ts).
  test("V4 — the carrier round-trips content-whole; only iam framing normalizes", async () => {
    if (lar.mode !== "staged") return;
    const files = await awaitMirrorFiles(lar.root, 5_000);
    const parent = files.find((f) => f.endsWith("noosphere-boot.mem"));
    expect(parent, "no whole-carrier projection of the loaded meme found").toBeTruthy();
    const projected = readFileSync(parent as string, "utf8");
    // Compare against the CANONICAL RENDER of the source — the law under
    // witness reads render(parse(source)) == projected, and it must hold even
    // while the source file sits mid-edit under the operator's other hand
    // (tests witness laws, never police WIP).
    const source    = renderOf(readFileSync(BOOT_MEME, "utf8"), BOOT_URI);
    const iamFence = /```toml iam\n[\s\S]*?```\n/g;
    const contentView = (s: string) => s.replace(iamFence, "```toml iam\n<normalized>\n```\n");
    expect(contentView(projected)).toBe(contentView(source));
    // The normalized iam still carries the identity whole: spot-check keys.
    expect(projected).toMatch(/^uri-path\s+= "ha\.ka\.ba\/lares\/api\/noosphere-boot"$/m);
    expect(projected).toMatch(/^register\s+= "Synthesis-Canon"$/m);
  });
});
