/**
 * sensorium-square — the JING read: the li∘ki square over a child-hosting sensorium's cover. Proves the
 * round-trip regimes that matter: lobes that already glue round-trip clean (coheres, radius 0 — the jing
 * lands); lobes reconcilable-but-not-agreeing show a positive round-trip obstruction localized to the
 * offending lobe (extend→restrict is not the identity); lobes with no common self hold the extension open;
 * and fewer than two readable lobes read honest-insufficient, never a fabricated coherence.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSensoriumManifest, writeManifest } from "../src/sensorium.js";
import { readJing } from "../src/sensorium-square.js";
import { type ChildRestriction } from "../src/sensorium-coupling.js";
import type { PlaneRestriction } from "@lararium/mesh";

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "lar-jing-")); });
afterEach(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ } });

/** Stamp a child-hosting parent (mesh-shaped) with the named lobes as coupling children. */
function stampHost(lobes: string[]): string {
  const dir = join(root, "mesh");
  mkdirSync(dir, { recursive: true });
  for (const l of lobes) mkdirSync(join(dir, l), { recursive: true });
  writeManifest(dir, buildSensoriumManifest(dir, {
    sensorium: "mesh", lar: "lar:///ha.ka.ba/lararium/mesh", caps: {},
    children: lobes.map((l) => ({ sensorium: l, absDir: join(dir, l) })),
  }));
  return dir;
}

function restr(o: Record<string, number>): PlaneRestriction {
  return { plane: "x", variance: "sheaf", value: new Map(Object.entries(o)) };
}

describe("readJing — the li∘ki round-trip over the children cover", () => {
  test("lobes that GLUE round-trip clean → coheres (radius 0), the jing lands", () => {
    const dir = stampHost(["who", "authority", "flow"]);
    const agree = { c0: 0.5, c1: 0.2 };
    const byLobe: Record<string, PlaneRestriction> = { who: restr(agree), authority: restr(agree), flow: restr(agree) };
    const childRestriction: ChildRestriction = ({ child }) => byLobe[child.sensorium] ?? null;

    const j = readJing(dir, { childRestriction });
    expect(j.readable).toBe(3);
    expect(j.coheres).toBe(true);
    expect(j.radius).toBeCloseTo(0, 12);
    expect(j.offendingLobe).toBeNull();
    expect(j.note).toMatch(/jing lands/);
  });

  test("reconcilable-but-diverging lobes → positive round-trip, localized to the offending lobe", () => {
    const dir = stampHost(["who", "authority", "flow"]);
    // who & authority agree; flow carries a divergent view on c0 — reconcilable (a consensus exists) but the
    // extend→restrict is not the identity, so the round-trip fires at flow.
    const byLobe: Record<string, PlaneRestriction> = {
      who:       restr({ c0: 0.4, c1: 0.4 }),
      authority: restr({ c0: 0.4, c1: 0.4 }),
      flow:      restr({ c0: 1.0, c1: 0.4 }),
    };
    const childRestriction: ChildRestriction = ({ child }) => byLobe[child.sensorium] ?? null;

    const j = readJing(dir, { childRestriction });
    expect(j.coheres).toBe(false);
    expect(j.radius).toBeGreaterThan(0);
    expect(j.offendingLobe).toBe("flow");
    const flow = j.lobes.find((l) => l.lobe === "flow")!;
    expect(flow.locus).toEqual(["c0"]);
  });

  test("lobes with NO common self hold the extension open (H¹≠0) — no self to restrict back", () => {
    const dir = stampHost(["who", "authority", "flow"]);
    // a hollow triangle: each pair shares one cid and agrees there, no cid shared by all three → a cocycle.
    const byLobe: Record<string, PlaneRestriction> = {
      who:       restr({ wa: 0.5, wf: 0.5 }),
      authority: restr({ wa: 0.5, af: 0.5 }),
      flow:      restr({ wf: 0.5, af: 0.5 }),
    };
    const childRestriction: ChildRestriction = ({ child }) => byLobe[child.sensorium] ?? null;

    const j = readJing(dir, { childRestriction });
    expect(j.coheres).toBe(false);
    expect(j.fusion!.verdict).toBe("hold-open");
    expect(j.note).toMatch(/holds open/);
  });

  test("fewer than two readable lobes → insufficient, never a fabricated coherence", () => {
    const dir = stampHost(["who", "authority"]);
    const childRestriction: ChildRestriction = ({ child }) =>
      child.sensorium === "who" ? restr({ c0: 0.5 }) : null;
    const j = readJing(dir, { childRestriction });
    expect(j.readable).toBe(1);
    expect(j.coheres).toBe(false);
    expect(j.consistency).toBeNull();
    expect(j.note).toMatch(/insufficient/);
  });

  test("a missing manifest reads gracefully (no throw)", () => {
    const j = readJing(join(root, "nope"));
    expect(j.sensorium).toBe("(no-manifest)");
    expect(j.coheres).toBe(false);
  });
});
