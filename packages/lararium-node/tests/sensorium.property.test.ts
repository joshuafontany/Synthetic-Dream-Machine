/**
 * sensorium — ADVERSARIAL / property-based attack on the li/ki VARIANCE-TAG partition + the
 * manifest disk round-trip (The-Sword QA, 2026-07-01):
 *   · the partition is TOTAL — every KNOWN plane resolves to sheaf XOR cosheaf, never both/neither.
 *   · content/structure/form = sheaf, bands/coupling = cosheaf (canonical base-cap posture).
 *   · planeVariance survives the disk round-trip for ANY manifest.
 *
 * BOUNDARY documented below: `has` is an OPEN, self-describing record (has-stack clause 4), so a
 * fiber cap declared with the NAME "bands"/"coupling" reports its OWN tag — the has-tag WINS over
 * the canonical base-cap posture. A well-formed manifest never puts those base-cap names in `has`;
 * the collision is characterized (not a break) so any future guard change is caught.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildSensoriumManifest, readManifest, writeManifest, planeVariance, capDir,
  SHEAF_PLANES, COSHEAF_PLANES, type Variance,
} from "../src/sensorium.js";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "lar-sensorium-prop-")); });
afterEach(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } });

// a pool of NON-base-cap fiber names (never "bands"/"coupling", which are base caps)
const FIBER_NAMES = ["content", "structure", "form", "flux", "aura", "echo", "grain", "vein"];

/** Build a random well-formed manifest (fiber caps avoid the base-cap names). */
function randManifest(u: () => number, sensoriumDir: string) {
  const nCaps = Math.floor(u() * FIBER_NAMES.length);
  const chosen = [...FIBER_NAMES].sort(() => u() - 0.5).slice(0, nCaps);
  const caps: Record<string, { absDir: string; engine: string; variance?: Variance }> = {};
  const wanted: Record<string, Variance> = {};
  for (const name of chosen) {
    const variance: Variance = u() < 0.5 ? "sheaf" : "cosheaf";
    const inside = u() < 0.5;
    caps[name] = {
      absDir: inside ? join(sensoriumDir, name) : join(tmpdir(), `outside-${name}-${Math.floor(u() * 1e6)}`),
      engine: ["mempalace", "structurepalace", "formpalace", ""][Math.floor(u() * 4)]!,
      variance,
    };
    wanted[name] = variance;
  }
  const m = buildSensoriumManifest(sensoriumDir, {
    sensorium: `s${Math.floor(u() * 1e6)}`,
    lar: `lar:///ha.ka.ba/@x/${Math.floor(u() * 1e9).toString(36)}`,
    caps,
    bands: u() < 0.5 ? { grain: "wavelet", k: Math.floor(u() * 5) } : {},
    children: u() < 0.5 ? [{ sensorium: "kid", absDir: join(sensoriumDir, "kid") }] : [],
    ephemeral: u() < 0.5,
    created: new Date(Math.floor(u() * 1e12)).toISOString(),
  });
  return { m, wanted };
}

describe("planeVariance — the partition is TOTAL and canonical (property)", () => {
  test("every declared fiber cap reports its OWN tag; base + declared partition is exhaustive", () => {
    const u = rng(2024);
    for (let i = 0; i < 500; i++) {
      const { m, wanted } = randManifest(u, dir);
      // 1. each declared fiber cap resolves to exactly the tag it was built with
      for (const [name, variance] of Object.entries(wanted)) {
        const v = planeVariance(m, name);
        expect(v === "sheaf" || v === "cosheaf").toBe(true); // sheaf XOR cosheaf, never null
        expect(v).toBe(variance);
      }
      // 2. the canonical base-cap posture holds for the un-declared base names
      for (const p of SHEAF_PLANES) if (!(p in m.has)) expect(planeVariance(m, p)).toBe("sheaf");
      for (const p of COSHEAF_PLANES) expect(planeVariance(m, p)).toBe("cosheaf");
      // 3. a truly unknown plane is null (outside the partition) — never silently sheaf/cosheaf
      expect(planeVariance(m, `unknown-${i}`)).toBeNull();
    }
  });

  test("content/structure/form = sheaf, bands/coupling = cosheaf on a default manifest", () => {
    const m = buildSensoriumManifest(dir, {
      sensorium: "memory", lar: "lar:///x",
      caps: {
        content: { absDir: join(dir, "content"), engine: "mempalace" },
        structure: { absDir: join(dir, "structure"), engine: "structurepalace" },
        form: { absDir: join(dir, "form"), engine: "formpalace" },
      },
    });
    for (const p of SHEAF_PLANES) expect(planeVariance(m, p)).toBe("sheaf");
    for (const p of COSHEAF_PLANES) expect(planeVariance(m, p)).toBe("cosheaf");
  });
});

describe("planeVariance — survives the disk round-trip for ANY manifest (property)", () => {
  test("write → read preserves the manifest AND every plane's variance verdict", () => {
    const u = rng(4048);
    for (let i = 0; i < 300; i++) {
      const d = mkdtempSync(join(tmpdir(), "lar-rt-"));
      try {
        const { m, wanted } = randManifest(u, d);
        writeManifest(d, m);
        const back = readManifest(d)!;
        expect(back).toEqual(m); // full structural round-trip
        // the variance verdict is identical before and after disk
        const probes = [...Object.keys(wanted), ...SHEAF_PLANES, ...COSHEAF_PLANES, "nope"];
        for (const p of probes) expect(planeVariance(back, p)).toBe(planeVariance(m, p));
        // capDir inverts for every declared cap after the round-trip
        for (const name of Object.keys(wanted)) {
          expect(capDir(d, back, name)).toBe(capDir(d, m, name));
        }
      } finally {
        rmSync(d, { recursive: true, force: true });
      }
    }
  });
});

describe("planeVariance — the OPEN-record boundary (characterization, not a break)", () => {
  test("a fiber cap NAMED 'bands' with a sheaf tag: the has-tag wins (self-describing record)", () => {
    // has-stack clause 4 makes `has` an open, tag-driven record. Declaring a fiber cap under the
    // base-cap name "bands" shadows the canonical cosheaf posture — the tag is authoritative.
    // A WELL-FORMED manifest never does this (bands is a base cap, not a has.* fiber cap); this
    // pins the current precedence so a future name-collision guard is a visible, tested change.
    const m = buildSensoriumManifest(dir, {
      sensorium: "odd", lar: "lar:///x",
      caps: { bands: { absDir: join(dir, "bands"), engine: "e", variance: "sheaf" } },
    });
    expect(planeVariance(m, "bands")).toBe("sheaf"); // the has-tag wins over the base-cap posture
    // coupling — untouched by has — keeps its canonical cosheaf posture
    expect(planeVariance(m, "coupling")).toBe("cosheaf");
  });
});
