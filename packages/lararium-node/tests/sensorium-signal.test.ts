/**
 * sensorium-signal — the auto-extraction PROJECTOR witness. It reads a poured target's `coupling.children`
 * into a ChildSignalMV[] signal-matrix (the couple_r/mismatch/flow shape). These build REAL temp sensorium
 * dirs on disk (a real manifest.json + real signal.json sidecars) — never a mock — and assert both the
 * STRUCTURE (children with a signal → a matrix) and the feature-GATE (no signal lands → an honest empty
 * matrix, the calibration data-wait the re-pour fills).
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { extractSignalFromTarget, CHILD_SIGNAL_SIDECAR } from "../src/sensorium-signal.js";

const cleanups: string[] = [];
afterEach(() => { for (const d of cleanups.splice(0)) rmSync(d, { recursive: true, force: true }); });

/** Stand a REAL target sensorium dir on disk — a manifest with the named children, plus each child's
 *  signal.json when a series is given (absent when null, so the child drops). Returns the dir. */
function standTarget(children: Array<{ name: string; signal: number[] | number[][] | null }>): string {
  const root = mkdtempSync(join(tmpdir(), "lares-signal-"));
  cleanups.push(root);
  const manifest = {
    schema: 1, sensorium: "target", lar: "lar:///ha.ka.ba/lararium/sensorium/target",
    has: {}, bands: {},
    coupling: { children: children.map((c) => ({ sensorium: c.name, dir: c.name })) },
    ephemeral: true, lifecycle: "pioneer", created: new Date().toISOString(),
  };
  writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest));
  for (const c of children) {
    const d = join(root, c.name);
    mkdirSync(d, { recursive: true });
    if (c.signal !== null) writeFileSync(join(d, CHILD_SIGNAL_SIDECAR), JSON.stringify(c.signal));
  }
  return root;
}

describe("extractSignalFromTarget — the auto-extraction projector", () => {
  it("projects ≥2 children carrying a signal into a time × N coupling matrix", () => {
    const root = standTarget([
      { name: "who", signal: [1, 2, 3, 4, 5, 6] },
      { name: "flow", signal: [2, 3, 4, 5, 6, 7] },
    ]);
    const ex = extractSignalFromTarget(root);
    expect(ex.readable).toBe(2);
    expect(ex.names).toEqual(["who", "flow"]);
    expect(ex.rows.length).toBe(6);                 // aligned to the shared time axis
    expect(ex.rows[0]).toEqual([1, 2]);             // each column a child's univariate series
    expect(ex.rows[5]).toEqual([6, 7]);
    expect(ex.note).toContain("6×2");
  });

  it("aligns unequal child series to the SHORTEST (the shared time axis)", () => {
    const root = standTarget([
      { name: "a", signal: [1, 2, 3, 4, 5] },
      { name: "b", signal: [9, 8, 7] },             // shorter → the matrix truncates to 3
    ]);
    const ex = extractSignalFromTarget(root);
    expect(ex.rows.length).toBe(3);
    expect(ex.rows[2]).toEqual([3, 7]);
  });

  it("reads a number[][] multivariate signal, projecting the first dim as the column", () => {
    const root = standTarget([
      { name: "a", signal: [[1, 10], [2, 20], [3, 30]] },
      { name: "b", signal: [[4, 40], [5, 50], [6, 60]] },
    ]);
    const ex = extractSignalFromTarget(root);
    expect(ex.rows[0]).toEqual([1, 4]);             // first dim rides the coupling column
    expect(ex.children[0]!.signal[0]).toEqual([1, 10]);  // the full MV series stays available
  });

  it("GATE — a single-stream target (no children) reads an empty matrix, honest", () => {
    const root = standTarget([]);
    const ex = extractSignalFromTarget(root);
    expect(ex.rows).toEqual([]);
    expect(ex.readable).toBe(0);
    expect(ex.note).toContain("no coupling children");
  });

  it("GATE — children declared but no signal lands ⇒ empty, naming the re-pour data-wait", () => {
    const root = standTarget([
      { name: "who", signal: null },                // declared, no signal.json (every real sensorium today)
      { name: "flow", signal: null },
    ]);
    const ex = extractSignalFromTarget(root);
    expect(ex.rows).toEqual([]);
    expect(ex.readable).toBe(0);
    expect(ex.note).toContain("re-pour");
  });

  it("GATE — a lone child with a signal is insufficient (coupling needs ≥2 streams)", () => {
    const root = standTarget([
      { name: "who", signal: [1, 2, 3] },
      { name: "flow", signal: null },
    ]);
    const ex = extractSignalFromTarget(root);
    expect(ex.rows).toEqual([]);
    expect(ex.readable).toBe(1);
    expect(ex.note).toContain("insufficient");
  });

  it("drops a malformed signal.json (never fabricated)", () => {
    const root = standTarget([
      { name: "a", signal: [1, 2, 3] },
      { name: "b", signal: [] },                    // empty → drops
    ]);
    const ex = extractSignalFromTarget(root);
    expect(ex.readable).toBe(1);
    expect(ex.rows).toEqual([]);
  });

  it("honest note when the target dir carries no manifest", () => {
    const empty = mkdtempSync(join(tmpdir(), "lares-nomanifest-"));
    cleanups.push(empty);
    const ex = extractSignalFromTarget(empty);
    expect(ex.sensorium).toBe("(no-manifest)");
    expect(ex.rows).toEqual([]);
  });
});
