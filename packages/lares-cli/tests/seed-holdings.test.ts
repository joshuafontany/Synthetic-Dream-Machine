/**
 * seed-holdings — `lares vessel seed`'s holdings map (seed.ts discoverHoldings).
 *
 * The map DISCOVERS every dir under `<root>/bags/`, never hardcodes: files, dotted
 * entries, and a missing bags/ all stay out; order sorts stable; each holding
 * carries its disk source + its `lar:///ha.ka.ba/bags/…` bag address.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverHoldings, SYSTEM_HOLDINGS } from "../src/commands/seed.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "lares-seed-holdings-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("discoverHoldings — the discovered holdings map", () => {
  test("maps every dir, sorted, with source path + lar bag address", () => {
    mkdirSync(join(root, "bags", "lares"), { recursive: true });
    mkdirSync(join(root, "bags", "elyncia"), { recursive: true });
    mkdirSync(join(root, "bags", "sdm"), { recursive: true });
    const holdings = discoverHoldings(root);
    expect(holdings.map((h) => h.holding)).toEqual(["elyncia", "lares", "sdm"]);
    expect(holdings[0]).toEqual({
      holding: "elyncia",
      source: join(root, "bags", "elyncia"),
      toBag: "lar:///ha.ka.ba/bags/elyncia",
    });
  });

  test("holds every dir; files and dotted entries stay out", () => {
    mkdirSync(join(root, "bags", "lares"), { recursive: true });
    mkdirSync(join(root, "bags", "scratch"), { recursive: true });
    mkdirSync(join(root, "bags", ".git"), { recursive: true });
    writeFileSync(join(root, "bags", "note.md"), "not a holding\n");
    const holdings = discoverHoldings(root);
    expect(holdings.map((h) => h.holding)).toEqual(["lares", "scratch"]);
  });

  test("★ SYSTEM_HOLDINGS spells what discoverHoldings returns ★", () => {
    // THE GUARD THE DEAD BRANCH NEEDED. `seed.ts` gates the infrastructure bags on set membership, and
    // membership compares against directory names read off `bags/`. When the two spellings drifted the
    // test answered false for every holding and NOTHING said so — the diff-gate simply stopped running.
    // Comparing the two vocabularies directly is the only reading that catches a silent miss.
    mkdirSync(join(root, "bags", "lares"),    { recursive: true });
    mkdirSync(join(root, "bags", "lararium"), { recursive: true });
    const found = new Set(discoverHoldings(root).map((h) => h.holding));
    for (const sys of SYSTEM_HOLDINGS) {
      expect(found.has(sys), `SYSTEM_HOLDINGS names "${sys}", which no bags/ directory spells`).toBe(true);
    }
  });

  test("a missing bags/ answers the empty map (no throw)", () => {
    expect(discoverHoldings(join(root, "nope"))).toEqual([]);
  });
});
