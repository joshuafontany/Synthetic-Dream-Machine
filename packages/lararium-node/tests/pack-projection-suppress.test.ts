/**
 * pack-projection-suppress — SHORE 2, the loop-stopper. A tiddler that belongs to
 * a PACK (its title rides in `$:/config/OriginalTiddlerPaths`) NEVER self-projects:
 * its bytes live inside the pack file (`foo.json`). Without the suppress, a dropped
 * `foo.json` (members A·B·C) explodes into three per-member files on projection,
 * leaves `foo.json` stale, and the watcher re-ingests both copies — a doubling loop.
 * WITH it, the pack file stays the one file on disk and a re-scan finds nothing new.
 *
 * The members here carry lar:/// titles (which `carrierBaseRelPath` DOES resolve to
 * disk paths, so absent the guard each WOULD write its own file) — the guard, not an
 * accident of siting, is what holds the line. A non-member control still projects,
 * proving the guard suppresses ONLY pack members.
 */

import { describe, test, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { serializeProvenance, ORIGINAL_TIDDLER_PATHS } from "@lararium/mesh";
import { LarDiskProjector } from "../src/disk-projector.js";
import type { TW5Engine } from "@lararium/tw5";

let root = "";
afterEach(() => { if (root) { rmSync(root, { recursive: true, force: true }); root = ""; } });

const BAG = "@lares";
const PACK_URI_A = "lar:///ha.ka.ba/pack/alpha";
const PACK_URI_B = "lar:///ha.ka.ba/pack/beta";
const PACK_URI_C = "lar:///ha.ka.ba/pack/gamma";
const LONER_URI  = "lar:///ha.ka.ba/pack/loner";
const PACK_PATH  = "ha.ka.ba/pack/bundle.json";

/** A minimal $tw whose wiki resolves the fixed tiddler set — enough for the
 *  projector's reconcile (getTiddler) + start (add/removeEventListener). */
function fakeEngine(tiddlers: Record<string, Record<string, unknown>>): TW5Engine {
  return {
    $tw: {
      wiki: {
        getTiddler: (title: string) =>
          tiddlers[title] ? { fields: tiddlers[title] } : undefined,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    },
  } as unknown as TW5Engine;
}

/** Reach the projector's private reconcile for the test (the change-handler's
 *  choke point — routeToRoot returns a pack member's own title unchanged). */
function reconcile(p: LarDiskProjector, uri: string): Promise<void> {
  return (p as unknown as { reconcile: (u: string) => Promise<void> }).reconcile(uri);
}

describe("pack projection-suppress — a pack member never self-projects", () => {
  test("members A·B·C stay inside the pack file; the file stays one file; a control still projects", async () => {
    root = mkdtempSync(join(tmpdir(), "lar-packsup-"));

    // The operator's dropped pack file — the ONE file that must survive untouched.
    const packAbs = join(root, PACK_PATH);
    mkdirSync(dirname(packAbs), { recursive: true });
    const packBytes = JSON.stringify(
      [{ title: PACK_URI_A, text: "a" }, { title: PACK_URI_B, text: "b" }, { title: PACK_URI_C, text: "g" }],
      null, 2,
    );
    writeFileSync(packAbs, packBytes, "utf-8");

    // The wiki VM view after INGEST landed the pack: three member records (byte-clean,
    // titled by their own lar: URIs) + a control record OUTSIDE any pack + the aside
    // provenance map naming each member's home file.
    const prov = serializeProvenance({ [PACK_URI_A]: PACK_PATH, [PACK_URI_B]: PACK_PATH, [PACK_URI_C]: PACK_PATH });
    const engine = fakeEngine({
      [PACK_URI_A]: { title: PACK_URI_A, text: "a", bag: BAG },
      [PACK_URI_B]: { title: PACK_URI_B, text: "b", bag: BAG },
      [PACK_URI_C]: { title: PACK_URI_C, text: "g", bag: BAG },
      [LONER_URI]:  { title: LONER_URI,  text: "l", bag: BAG },
      [ORIGINAL_TIDDLER_PATHS]: { title: ORIGINAL_TIDDLER_PATHS, text: prov, bag: BAG },
    });

    // Every carrier sites as a `.tid` — so absent the suppress, each member WOULD
    // write `<uri>.tid`. The guard is the only thing keeping them off disk.
    const projector = new LarDiskProjector({
      mirrors: [{ bagId: BAG, mirrorRoot: root }],
      carrierFileFn: async (uri) => ({ ext: ".tid", body: `title: ${uri}\n\nbody`, encoding: "utf8" }),
      debounceMs: 1,
    });
    const stop = projector.start(engine);

    const memberFiles = [
      join(root, "ha.ka.ba/pack/alpha.tid"),
      join(root, "ha.ka.ba/pack/beta.tid"),
      join(root, "ha.ka.ba/pack/gamma.tid"),
    ];

    // ── project the members — every one is SUPPRESSED ────────────────────────
    await reconcile(projector, PACK_URI_A);
    await reconcile(projector, PACK_URI_B);
    await reconcile(projector, PACK_URI_C);
    for (const f of memberFiles) expect(existsSync(f)).toBe(false);   // zero explosion

    // ── the pack file stays THE one file, byte-unchanged ─────────────────────
    expect(existsSync(packAbs)).toBe(true);
    expect(readFileSync(packAbs, "utf-8")).toBe(packBytes);

    // ── the guard is precise — a non-member control DOES project ─────────────
    await reconcile(projector, LONER_URI);
    expect(existsSync(join(root, "ha.ka.ba/pack/loner.tid"))).toBe(true);

    // ── idempotent re-scan: reconcile again → still no member files, no double ─
    await reconcile(projector, PACK_URI_A);
    await reconcile(projector, PACK_URI_B);
    await reconcile(projector, PACK_URI_C);
    for (const f of memberFiles) expect(existsSync(f)).toBe(false);
    expect(readFileSync(packAbs, "utf-8")).toBe(packBytes);          // pack file untouched by the re-scan

    stop();
  });

  test("with the provenance map ABSENT, the same tiddlers project normally (no over-suppression)", async () => {
    root = mkdtempSync(join(tmpdir(), "lar-packsup-none-"));
    // No $:/config/OriginalTiddlerPaths → parseProvenance reads empty → nothing suppressed.
    const engine = fakeEngine({
      [PACK_URI_A]: { title: PACK_URI_A, text: "a", bag: BAG },
    });
    const projector = new LarDiskProjector({
      mirrors: [{ bagId: BAG, mirrorRoot: root }],
      carrierFileFn: async (uri) => ({ ext: ".tid", body: `title: ${uri}\n\nbody`, encoding: "utf8" }),
      debounceMs: 1,
    });
    const stop = projector.start(engine);
    await reconcile(projector, PACK_URI_A);
    expect(existsSync(join(root, "ha.ka.ba/pack/alpha.tid"))).toBe(true);   // no pack → normal projection
    stop();
  });
});
