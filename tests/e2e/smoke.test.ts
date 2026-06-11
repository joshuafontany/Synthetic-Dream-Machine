/**
 * e2e/smoke — the first stable harness layer. Codifies the 2026-06-10 live
 * witnesses as repeatable assertions, driven through the REAL lares CLI
 * against a staged (or live) instance. Current canon only:
 *
 *   1. the vessel boots to live with the @lares hearth seated (quine default)
 *   2. the invariant plane carries the operator-minted @lares oracle
 *   3. LOAD feeds the hearth carrier-borne (boot meme → 17 records)
 *   4. wiki init + add-bag write the user registry (@catalog composition lane)
 *
 * Staged-only tests guard on instance.mode — a LIVE target never gets reset,
 * re-seeded, or asserted against genesis state.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import { join } from "node:path";
import { targetInstance, bootDocUrl, type LarInstance } from "../harness/instance.js";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const BOOT_MEME = join(REPO_ROOT, "bags/@lares/v0.1/api/lares/noosphere-boot.md");
const LARES_URI = "lar:///ha.ka.ba/@lares";

let lar: LarInstance;

beforeAll(async () => { lar = await targetInstance(); });
afterAll(async () => { await lar.stop(); });

describe("smoke — the vessel stands", () => {
  test("staged vessel reaches live with the @lares hearth seated", () => {
    if (lar.mode !== "staged") return;   // a live hearth already stands; its log is its own
    expect(lar.bootLog()).toContain("phase → live");
    expect(lar.bootLog()).toMatch(/live — wiki: lares/);
  });

  test("the invariant plane carries the operator-minted @lares oracle", async () => {
    if (lar.mode !== "staged") return;   // raw-storage read assumes an owned root
    const larariumUrl = bootDocUrl(lar, "lararium");
    expect(larariumUrl).toBeTruthy();
    const repo = new Repo({ storage: new NodeFSStorageAdapter(join(lar.root, ".lararium")) });
    const isle = await repo.find(larariumUrl as never);
    const rec  = (isle.doc() as { tiddlers?: Record<string, { tiddler?: { text?: string }; meta?: { authority?: string } }> })?.tiddlers?.[LARES_URI];
    expect(rec?.tiddler?.text).toMatch(/^automerge:/);
    expect(rec?.meta?.authority).toBe("operator-mint");
  });
});

describe("smoke — residency canon through the real CLI", () => {
  test("LOAD feeds the hearth carrier-borne: boot meme → parent + 16 ahu children", async () => {
    if (lar.mode !== "staged") return;   // mutating gesture — staged only
    const r = await lar.cli(["act", "LOAD", "--source-uri", BOOT_MEME, "--to", LARES_URI, "--yes", "--json"]);
    expect(r.json?.["ok"]).toBe(true);
    const data = r.json?.["data"] as { count: number; titles: string[] };
    expect(data.count).toBe(17);
    expect(data.titles).toContain("lar:///ha.ka.ba/@lares/v0.1/api/lares/noosphere-boot");
    expect(data.titles).toContain("lar:///ha.ka.ba/@lares/v0.1/api/lares/noosphere-boot#exchange-protocol");
  });

  test("LOAD refuses a carrier-less gesture loudly (islands never fetch)", async () => {
    if (lar.mode !== "staged") return;
    const r = await lar.cli(["act", "LOAD", "--source-uri", "https://example.org/nope", "--to", LARES_URI, "--yes", "--json"]);
    expect(r.json?.["ok"]).toBe(false);
    expect(String(r.json?.["error"] ?? "")).toMatch(/no carriers/);
  });

  test("wiki init + add-bag compose the user registry", async () => {
    if (lar.mode !== "staged") return;   // mints registry entries — staged only
    // KNOWN BURR: `lares wiki` prints human output even under --json — these
    // assertions read the human surface; tighten to JSON when the burr heals.
    const g = await lar.cli(["wiki", "init", "garden"]);
    expect(g.code).toBe(0);
    expect(g.stdout).toMatch(/recipes\/garden/);
    const v = await lar.cli(["wiki", "init", "grove"]);
    expect(v.code).toBe(0);

    const a = await lar.cli(["wiki", "add-bag", "garden", "lar:///ha.ka.ba/@lararium/wikis/grove"]);
    expect(a.code).toBe(0);
    expect(a.stdout).toMatch(/added/);
    expect(a.stdout).toMatch(/wikis\/grove/);
  });
});

describe("smoke — any target (live-safe reads)", () => {
  test("lares status answers from the targeted instance", async () => {
    const r = await lar.cli(["status", "--json"]);
    // Status reads local instance health; ok on both modes, and the gesture
    // mutates nothing — the one assertion a LIVE hearth always tolerates.
    expect(r.code).toBe(0);
  });
});
