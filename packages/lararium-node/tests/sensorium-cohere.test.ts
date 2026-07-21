/**
 * sensorium-cohere — the li-radius READER that glues a sensorium's OWN sheaf planes: enumerate the sheaf
 * planes → each plane's section over a shared cid stalk → the Robinson li-radius AND the H¹ gate (fuse vs
 * hold-open), never a fabricated glue. Proves both gate verdicts wire through, the graceful insufficient
 * case, the vacuous (disjoint) case, and — load-bearing — that the DEFAULT single-stream cover carries the
 * `nested-cover` PLUMBING flag while a live-boundary reader clears it (the boundary, not the codomain).
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSensoriumManifest, writeManifest } from "../src/sensorium.js";
import { readCohere, readCohereAcrossContexts, type PlaneReader, type CohereContext } from "../src/sensorium-cohere.js";
import type { PlaneRestriction } from "@lararium/mesh";

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "lar-cohere-")); });
afterEach(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ } });

/** Stamp a sensorium declaring the named planes as SHEAF fiber caps (each with a nested store dir). */
function stampSensorium(planes: string[]): string {
  const dir = join(root, "sens");
  mkdirSync(dir, { recursive: true });
  const caps: Record<string, { absDir: string; engine: string; variance: "sheaf" }> = {};
  for (const p of planes) {
    mkdirSync(join(dir, p), { recursive: true });
    caps[p] = { absDir: join(dir, p), engine: p, variance: "sheaf" };
  }
  writeManifest(dir, buildSensoriumManifest(dir, {
    sensorium: "sens", lar: "lar:///ha.ka.ba/test/cohere", caps,
  }));
  return dir;
}

/** Write a shard-structured store doc under a plane's store dir so enumerateStoreDocs reads its cid back. */
function stampDoc(dir: string, plane: string, cid: string): void {
  const d = join(dir, plane, cid.slice(0, 2), cid.slice(2));
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "snapshot"), "x");
}

function restr(plane: string, value: Record<string, number>): PlaneRestriction {
  return { plane, variance: "sheaf", value: new Map(Object.entries(value)) };
}

describe("readCohere — the li-radius + H¹ gate over a sensorium's sheaf planes", () => {
  test("live-boundary GLUE: two agreeing sections (H¹=0) → FUSE, radius 0, NO nested-cover flag", () => {
    const dir = stampSensorium(["a", "b"]);
    const byPlane: Record<string, PlaneRestriction> = {
      a: restr("a", { c0: 0.4, c1: 0.6 }),
      b: restr("b", { c0: 0.4, c1: 0.6 }),   // agree on the shared cids
    };
    const planeReader: PlaneReader = ({ plane }) => byPlane[plane] ?? null;

    const read = readCohere(dir, { planeReader });
    expect(read.readable).toBe(2);
    expect(read.sharedUnits).toBe(2);
    expect(read.fusion!.verdict).toBe("fuse");
    expect(read.consistency!.radius).toBeCloseTo(0, 6);
    expect(read.consistency!.glues).toBe(true);
    expect(read.dependenceRisk).toBeUndefined();   // a caller's reader asserts a live boundary
  });

  test("live-boundary OBSTRUCT: hollow triangle (pairwise-agree, no common witness, H¹≠0) → HOLD-OPEN", () => {
    const dir = stampSensorium(["a", "b", "c"]);
    const byPlane: Record<string, PlaneRestriction> = {
      a: restr("a", { ab: 0.5, ac: 0.5 }),
      b: restr("b", { ab: 0.5, bc: 0.5 }),
      c: restr("c", { ac: 0.5, bc: 0.5 }),
    };
    const planeReader: PlaneReader = ({ plane }) => byPlane[plane] ?? null;

    const read = readCohere(dir, { planeReader });
    expect(read.readable).toBe(3);
    expect(read.fusion!.verdict).toBe("hold-open");
    if (read.fusion!.verdict === "hold-open") {
      expect(read.fusion!.obstruction.dimH1).toBeGreaterThan(0);
    }
    expect(read.dependenceRisk).toBeUndefined();
  });

  test("DEFAULT single-stream cover → glues a tautological 0 but carries dependenceRisk:'nested-cover'", () => {
    const dir = stampSensorium(["content", "structure"]);
    // both planes plumb through to the SAME cids — the nested cover glues by construction.
    for (const cid of ["ab01", "cd02", "ef03"]) { stampDoc(dir, "content", cid); stampDoc(dir, "structure", cid); }
    const read = readCohere(dir);   // default coveragePlaneReader
    expect(read.readable).toBe(2);
    expect(read.sharedUnits).toBe(3);
    expect(read.consistency!.glues).toBe(true);
    expect(read.dependenceRisk).toBe("nested-cover");
    expect(read.note).toMatch(/PLUMBING/);
  });

  test("fewer than two readable planes → consistency null (insufficient), never fabricated", () => {
    const dir = stampSensorium(["content", "structure"]);
    for (const cid of ["ab01", "cd02"]) stampDoc(dir, "content", cid);   // only one store populated
    const read = readCohere(dir);
    expect(read.readable).toBe(1);
    expect(read.consistency).toBeNull();
    expect(read.fusion).toBeNull();
    expect(read.note).toMatch(/insufficient/);
  });

  test("disjoint sections (no shared cid) → a vacuous glue, sharedUnits 0", () => {
    const dir = stampSensorium(["a", "b"]);
    const byPlane: Record<string, PlaneRestriction> = {
      a: restr("a", { x0: 0.5 }),
      b: restr("b", { y0: 0.5 }),   // disjoint domains
    };
    const planeReader: PlaneReader = ({ plane }) => byPlane[plane] ?? null;
    const read = readCohere(dir, { planeReader });
    expect(read.readable).toBe(2);
    expect(read.sharedUnits).toBe(0);
    expect(read.consistency!.vacuous).toBe(true);
  });

  test("a missing manifest reads gracefully (no throw)", () => {
    const read = readCohere(join(root, "nope"));
    expect(read.consistency).toBeNull();
    expect(read.sensorium).toBe("(no-manifest)");
  });
});

describe("readCohereAcrossContexts — the dream-pass live boundary (same plane, two contexts)", () => {
  /** Stamp two context sensoria, each declaring `content` as a sheaf cap over a nested store dir. */
  function stampPasses(): { a: CohereContext; b: CohereContext } {
    const mk = (name: string): CohereContext => {
      const dir = join(root, name);
      mkdirSync(join(dir, "content"), { recursive: true });
      writeManifest(dir, buildSensoriumManifest(dir, {
        sensorium: name, lar: `lar:///ha.ka.ba/test/${name}`,
        caps: { content: { absDir: join(dir, "content"), engine: "content", variance: "sheaf" } },
      }));
      return { context: name, sensoriumDir: dir };
    };
    return { a: mk("daydream"), b: mk("deep-dream") };
  }

  test("two passes that AGREE on the plane GLUE (radius 0) — no nested-cover flag, a live boundary", () => {
    const { a, b } = stampPasses();
    for (const cid of ["ab01", "cd02"]) { stampDoc(root, join("daydream", "content"), cid); stampDoc(root, join("deep-dream", "content"), cid); }
    const read = readCohereAcrossContexts("content", [a, b]);   // default coverage reader — both cover the same cids
    expect(read.readable).toBe(2);
    expect(read.sharedUnits).toBe(2);
    expect(read.consistency!.glues).toBe(true);
    expect(read.dependenceRisk).toBeUndefined();   // a live boundary, never nested
    expect(read.note).toMatch(/GLUE/);
  });

  test("two passes that DIVERGE on the plane obstruct (radius > 0) — one pass drifted from the ground", () => {
    const { a, b } = stampPasses();
    // a custom reader gives the SAME cid different salience across the two passes — a genuine drift.
    const byContext: Record<string, number> = { daydream: 0.3, "deep-dream": 0.9 };
    const planeReader: PlaneReader = ({ manifest }) =>
      ({ plane: "content", variance: "sheaf", value: new Map([["ab01", byContext[manifest.sensorium] ?? 0]]) });
    const read = readCohereAcrossContexts("content", [a, b], { planeReader });
    expect(read.readable).toBe(2);
    expect(read.consistency!.glues).toBe(false);
    expect(read.consistency!.radius).toBeCloseTo(0.6, 6);
    expect(read.note).toMatch(/DIVERGE|drift/);
  });

  test("fewer than two readable contexts → insufficient, never a fabricated glue", () => {
    const { a } = stampPasses();
    const read = readCohereAcrossContexts("content", [a, { context: "ghost", sensoriumDir: join(root, "nope") }]);
    expect(read.readable).toBeLessThan(2);
    expect(read.consistency).toBeNull();
    expect(read.note).toMatch(/insufficient/);
  });
});
