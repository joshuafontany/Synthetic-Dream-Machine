/**
 * seed-holdings — `lares seed`'s holdings map (seed.ts discoverHoldings).
 *
 * The map DISCOVERS every `@*` dir under `<root>/bags/`, never hardcodes: files,
 * non-@ dirs, and a missing bags/ all stay out; order sorts stable; each holding
 * carries its disk source + its `lar:///ha.ka.ba/@…` bag address.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverHoldings } from "../src/commands/seed.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "lares-seed-holdings-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("discoverHoldings — the discovered @* map", () => {
  test("maps every @dir, sorted, with source path + lar bag address", () => {
    mkdirSync(join(root, "bags", "@lares"), { recursive: true });
    mkdirSync(join(root, "bags", "@elyncia"), { recursive: true });
    mkdirSync(join(root, "bags", "@sdm"), { recursive: true });
    const holdings = discoverHoldings(root);
    expect(holdings.map((h) => h.holding)).toEqual(["@elyncia", "@lares", "@sdm"]);
    expect(holdings[0]).toEqual({
      holding: "@elyncia",
      source: join(root, "bags", "@elyncia"),
      toBag: "lar:///ha.ka.ba/@elyncia",
    });
  });

  test("skips non-@ dirs and @-prefixed FILES (dirs only)", () => {
    mkdirSync(join(root, "bags", "@lares"), { recursive: true });
    mkdirSync(join(root, "bags", "scratch"), { recursive: true });
    writeFileSync(join(root, "bags", "@note.md"), "not a holding\n");
    const holdings = discoverHoldings(root);
    expect(holdings.map((h) => h.holding)).toEqual(["@lares"]);
  });

  test("a missing bags/ answers the empty map (no throw)", () => {
    expect(discoverHoldings(join(root, "nope"))).toEqual([]);
  });
});
