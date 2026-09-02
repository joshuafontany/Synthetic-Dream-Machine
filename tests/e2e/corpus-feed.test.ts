/**
 * e2e/corpus-feed — vector 4's staged witness: the WHOLE lares corpus
 * (bags/lares/ha.ka.ba/lares, the hearth's content tree) rides one directory-batch LOAD
 * into a staged vessel, and the disk co-projection writes back carrier-whole.
 *
 * What this soaks (first contact at scale for the 2026-06-11 grain burn):
 *   F1 — the batch LOAD lands (one gesture, one change-id family)
 *   F2 — group routing at scale: one file per carrier root, NO fragment
 *        files, count parity with the distinct lares-bag root URIs
 *   F3 — the boot meme (corpus-canonical) projects byte-exact
 *
 * The live-hearth feed stays the operator's gesture; this vector proves the
 * shape so that gesture carries no surprises.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { execSync } from "node:child_process";
import { targetInstance, type LarInstance } from "../harness/instance.js";
import { memeticWikitextDeserializer, expandMemeRefs } from "../../packages/lararium-tw5/src/deserializer.js";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
// `@` marks a SURFACE (the bag), never a meme namespace — so the content tree inside the bag reads
// bare. `BOOT_PROJ` below already carried that; this constant is the one that needed to follow.
const CORPUS    = join(REPO_ROOT, "bags/lares/ha.ka.ba/lares");
const LARES_URI = "lar:///ha.ka.ba/bags/lares";
const BOOT_REL  = "api/noosphere-boot.mem";
// Projected (staged) siting under the full-path-inside-bag rule:
const BOOT_PROJ = "ha.ka.ba/lares/api/noosphere-boot.mem";
const BOOT_URI  = "lar:///ha.ka.ba/lares/api/noosphere-boot";

/** Canonical render of carrier text through the membrane. */
function renderOf(text: string): string {
  const records = memeticWikitextDeserializer(text, { title: BOOT_URI });
  const map = new Map(records.map((r) => [String(r.title), r] as const));
  return expandMemeRefs((t) => map.get(t), BOOT_URI) ?? "";
}

let lar: LarInstance;
let loadOk = false;
let loadCount = 0;

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

/** Distinct carrier-root URIs in the source corpus that mirror under the lares bag. */
function expectedRoots(): Set<string> {
  // THE CORPUS CARRIES `.mem`. This hunted `*.md` — the extension the carrier convention left behind —
  // so `find` returned nothing, the staged mirror stood empty, and every read below ENOENT'd on a boot
  // meme that was never copied. A zero-length find reads as "no corpus", never as "wrong glob".
  const files = execSync(`find ${CORPUS} -name '*.mem'`, { encoding: "utf8" }).trim().split("\n");
  const roots = new Set<string>();
  for (const f of files) {
    const m = /<<[\^~][^\n]*&#x(?:0001|0011);[^\n]*from=\? -> to=(\S+) >>/.exec(readFileSync(f, "utf8"));
    if (m?.[1]?.startsWith("lar:///ha.ka.ba/lares/")) roots.add(m[1]);
  }
  return roots;
}

/** Poll the staged mirror until the projected file count stabilizes. */
async function awaitStableMirror(root: string, capMs = 120_000): Promise<string[]> {
  const mirrorRoot = join(root, "bags/lares");
  const start = Date.now();
  let last = -1;
  let stableSince = Date.now();
  for (;;) {
    const n = walkFiles(mirrorRoot).length;
    if (n !== last) { last = n; stableSince = Date.now(); }
    if (n > 0 && Date.now() - stableSince > 4_000) return walkFiles(mirrorRoot);
    if (Date.now() - start > capMs) return walkFiles(mirrorRoot);
    await new Promise((r) => setTimeout(r, 1_000));
  }
}

beforeAll(async () => {
  lar = await targetInstance();
  if (lar.mode !== "staged") return;        // mutating, corpus-scale — staged only
  const r = await lar.cli(["act", "LOAD", "--source-uri", CORPUS, "--to", LARES_URI, "--yes", "--json"]);
  loadOk = r.json?.["ok"] === true;
  loadCount = Number((r.json?.["data"] as { count?: number } | undefined)?.count ?? 0);
}, 180_000);
afterAll(async () => { await lar.stop(); });

describe("corpus feed — the whole hearth in one gesture (staged witness)", () => {
  test("F1 — the directory-batch LOAD lands", () => {
    if (lar.mode !== "staged") return;
    expect(loadOk).toBe(true);
    expect(loadCount).toBeGreaterThan(189);   // records ≥ carriers (children ride along)
  });

  test("F2 — group routing at scale: one file per carrier root, no fragments", async () => {
    if (lar.mode !== "staged") return;
    const files = await awaitStableMirror(lar.root);
    expect(files.filter((f) => f.includes("#") || /%23/.test(f))).toEqual([]);
    // Full-path-inside-bag ruling: the mirror carries EVERY name the bag
    // holds (lawful residents outside the corpus namespace included), so the
    // law reads as membership: every corpus root projects to exactly one
    // file at its full-name path; fragments never surface.
    const mirrorRoot = join(lar.root, "bags/lares");
    const fileUris = new Set(files.map((f) =>
      "lar:///" + relative(mirrorRoot, f).split(sep).join("/").replace(/\.mem$/, ""),
    ));
    const roots = expectedRoots();
    for (const r of roots) expect(fileUris.has(r), `missing projection for ${r}`).toBe(true);
    expect(fileUris.size).toBe(files.length);   // one file, one name — no aliasing
  }, 180_000);

  test("F3 — the boot meme projects content-whole (iam framing normalizes once)", async () => {
    if (lar.mode !== "staged") return;
    const projected = join(lar.root, "bags/lares", BOOT_PROJ);
    expect(existsSync(projected)).toBe(true);
    const metaFence = /```toml meta\n[\s\S]*?```\n/g;
    const contentView = (s: string) => s.replace(metaFence, "```toml meta\n<normalized>\n```\n");
    expect(contentView(readFileSync(projected, "utf8")))
      // The law: projected == render(parse(source)) — robust to a source
      // file mid-edit under the other hand (tests witness laws, not WIP).
      .toBe(contentView(renderOf(readFileSync(join(CORPUS, BOOT_REL), "utf8"))));
  });

  test("F4 — pipeline idempotence: re-feeding a projection leaves it byte-stable", async () => {
    if (lar.mode !== "staged") return;
    const projected = join(lar.root, "bags/lares", BOOT_PROJ);
    const before = readFileSync(projected, "utf8");
    const r = await lar.cli(["act", "LOAD", "--source-uri", projected, "--to", LARES_URI, "--yes", "--json"]);
    expect(r.json?.["ok"]).toBe(true);
    // allow a flush wave, then assert the canonical form held still
    await new Promise((res) => setTimeout(res, 8_000));
    expect(readFileSync(projected, "utf8")).toBe(before);
  }, 60_000);
});
