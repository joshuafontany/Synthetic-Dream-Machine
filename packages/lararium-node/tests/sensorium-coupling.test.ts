/**
 * sensorium-coupling — the reader that makes `coupling.children` load-bearing: resolve the child edges →
 * each child's section over a shared stalk → the H¹-GATED fusion (fuse vs hold-open), never a silent
 * average. Proves both gate verdicts wire through + the graceful insufficient case + the default sidecar.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSensoriumManifest, writeManifest } from "../src/sensorium.js";
import { readCoupling, defaultChildRestriction, SALIENCES_SIDECAR, type ChildRestriction } from "../src/sensorium-coupling.js";
import type { PlaneRestriction } from "../src/sensorium-consistency.js";

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "lar-coupling-")); });
afterEach(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ } });

/** Stamp a parent sensorium with N coupling children (dirs nested by name). */
function stampParent(children: string[]): string {
  const dir = join(root, "parent");
  mkdirSync(dir, { recursive: true });
  for (const c of children) mkdirSync(join(dir, c), { recursive: true });
  writeManifest(dir, buildSensoriumManifest(dir, {
    sensorium: "parent",
    lar: "lar:///ha.ka.ba/test/coupling",
    caps: {},
    children: children.map((c) => ({ sensorium: c, absDir: join(dir, c) })),
  }));
  return dir;
}

function restr(plane: string, value: Record<string, number>): PlaneRestriction {
  return { plane, variance: "sheaf", value: new Map(Object.entries(value)) };
}

describe("readCoupling — the H¹ gate over coupling.children", () => {
  test("two reconcilable peers (H¹=0) → FUSE, with a consensus over the shared units", () => {
    const dir = stampParent(["formal", "informal"]);
    const byName: Record<string, PlaneRestriction> = {
      formal:   restr("formal",   { s0: 0.4, s1: 0.6 }),
      informal: restr("informal", { s0: 0.4, s1: 0.6 }),   // agree on the shared units
    };
    const childRestriction: ChildRestriction = ({ child }) => byName[child.sensorium] ?? null;

    const read = readCoupling(dir, { childRestriction });
    expect(read.readable).toBe(2);
    expect(read.sharedUnits).toBe(2);
    expect(read.fusion).not.toBeNull();
    expect(read.fusion!.verdict).toBe("fuse");
    if (read.fusion!.verdict === "fuse") {
      expect(read.fusion!.fused.consensus.get("s0")).toBeCloseTo(0.4, 6);
      expect(read.fusion!.fused.consensus.get("s1")).toBeCloseTo(0.6, 6);
    }
  });

  test("three pairwise-agreeing peers with NO common witness (hollow triangle, H¹≠0) → HOLD-OPEN", () => {
    const dir = stampParent(["a", "b", "c"]);
    // each pair shares exactly one unit and AGREES there; no unit is shared by all three → a cocycle.
    const byName: Record<string, PlaneRestriction> = {
      a: restr("a", { ab: 0.5, ac: 0.5 }),
      b: restr("b", { ab: 0.5, bc: 0.5 }),
      c: restr("c", { ac: 0.5, bc: 0.5 }),
    };
    const childRestriction: ChildRestriction = ({ child }) => byName[child.sensorium] ?? null;

    const read = readCoupling(dir, { childRestriction });
    expect(read.readable).toBe(3);
    expect(read.fusion).not.toBeNull();
    expect(read.fusion!.verdict).toBe("hold-open");
    if (read.fusion!.verdict === "hold-open") {
      expect(read.fusion!.obstruction.dimH1).toBeGreaterThan(0);
    }
  });

  test("fewer than two readable children → fusion null (insufficient), NEVER averaged", () => {
    const dir = stampParent(["formal", "informal"]);
    const childRestriction: ChildRestriction = ({ child }) =>
      child.sensorium === "formal" ? restr("formal", { s0: 0.5 }) : null;
    const read = readCoupling(dir, { childRestriction });
    expect(read.readable).toBe(1);
    expect(read.fusion).toBeNull();
    expect(read.note).toMatch(/insufficient/);
  });

  test("no coupling children → fusion null, plane glues nothing", () => {
    const dir = stampParent([]);
    const read = readCoupling(dir);
    expect(read.readable).toBe(0);
    expect(read.fusion).toBeNull();
  });

  test("the default child reader loads saliences.json sidecars → the gate runs on real dirs", () => {
    const dir = stampParent(["formal", "informal"]);
    writeFileSync(join(dir, "formal", SALIENCES_SIDECAR), JSON.stringify({ s0: 0.3, s1: 0.7 }));
    writeFileSync(join(dir, "informal", SALIENCES_SIDECAR), JSON.stringify({ s0: 0.3, s1: 0.7 }));
    const read = readCoupling(dir);   // default childRestriction
    expect(read.readable).toBe(2);
    expect(read.fusion!.verdict).toBe("fuse");
  });

  test("a missing manifest reads gracefully (no throw)", () => {
    const read = readCoupling(join(root, "nope"));
    expect(read.fusion).toBeNull();
    expect(read.sensorium).toBe("(no-manifest)");
  });

  test("defaultChildRestriction clamps to [0,1] and drops non-numeric / empty", () => {
    const cdir = join(root, "child");
    mkdirSync(cdir, { recursive: true });
    writeFileSync(join(cdir, SALIENCES_SIDECAR), JSON.stringify({ a: 2, b: -1, c: "x", d: 0.5 }));
    const r = defaultChildRestriction({ child: { sensorium: "x", dir: "." }, childDir: cdir, manifest: null });
    expect(r).not.toBeNull();
    expect(r!.value.get("a")).toBe(1);
    expect(r!.value.get("b")).toBe(0);
    expect(r!.value.has("c")).toBe(false);
    expect(r!.value.get("d")).toBe(0.5);
  });
});
