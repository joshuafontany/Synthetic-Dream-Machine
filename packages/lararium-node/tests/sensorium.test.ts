/**
 * sensorium — the SHEAF-TRUE manifest round-trips, chooses relative/absolute per cap (fiber caps =
 * leaf-dirs, base caps = manifest structure), and nests child sub-sensoriums via dumb coupling edges.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildSensoriumManifest, readManifest, writeManifest, capDir, resolveCapDir, SENSORIUM_SCHEMA,
} from "../src/sensorium.js";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "lar-sensorium-")); });
afterEach(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } });

describe("sensorium manifest — SHEAF-TRUE shape", () => {
  test("fiber caps INSIDE the dir store RELATIVE; a cap OUTSIDE stores ABSOLUTE", () => {
    const legacyContent = mkdtempSync(join(tmpdir(), "lar-legacy-content-"));
    try {
      const m = buildSensoriumManifest(dir, {
        sensorium: "memory",
        lar: "lar:///ha.ka.ba/@lararium/api/living-grammar-palace#palace-instance",
        caps: {
          content:   { absDir: legacyContent,               engine: "mempalace" },  // OUTSIDE → absolute
          structure: { absDir: join(dir, "structure"),      engine: "astpalace" },  // inside → relative
          form:      { absDir: join(dir, "form"),           engine: "formpalace" }, // inside → relative
        },
        bands: { grain: "wavelet" },
      });
      expect(m.has["content"]!.dir).toBe(legacyContent);   // absolute (strangler window)
      expect(m.has["structure"]!.dir).toBe("structure");    // relative (consolidated)
      expect(m.has["form"]!.dir).toBe("form");
      // base caps carry NO dir — they live in the manifest structure only
      expect(m.bands).toEqual({ grain: "wavelet" });
      expect(m.coupling.children).toEqual([]);
      // resolution inverts cleanly for both
      expect(capDir(dir, m, "content")).toBe(legacyContent);
      expect(capDir(dir, m, "structure")).toBe(join(dir, "structure"));
      expect(capDir(dir, m, "absent")).toBeNull();
    } finally {
      rmSync(legacyContent, { recursive: true, force: true });
    }
  });

  test("round-trips through disk (atomic write → read) unchanged", () => {
    const m = buildSensoriumManifest(dir, {
      sensorium: "memory",
      lar: "lar:///x",
      caps: { content: { absDir: join(dir, "content"), engine: "mempalace" } },
      created: "2026-07-01T00:00:00.000Z",
    });
    writeManifest(dir, m);
    expect(readManifest(dir)).toEqual(m);
    expect(readManifest(dir)!.schema).toBe(SENSORIUM_SCHEMA);
  });

  test("readManifest is null before a manifest exists (a bare dir is not yet a sensorium)", () => {
    expect(readManifest(dir)).toBeNull();
  });

  test("coupling nests child sub-sensoriums as dumb edges (the follow-on Meshpalace shape)", () => {
    const m = buildSensoriumManifest(dir, {
      sensorium: "mesh",
      lar: "lar:///ha.ka.ba/@lararium/mesh",
      caps: {},
      children: [
        { sensorium: "who",       absDir: join(dir, "who") },
        { sensorium: "authority", absDir: join(dir, "authority") },
        { sensorium: "flow",      absDir: join(dir, "flow") },
      ],
    });
    expect(m.coupling.children.map((c) => c.sensorium)).toEqual(["who", "authority", "flow"]);
    expect(m.coupling.children[0]!.dir).toBe("who"); // relative, nested
    expect(resolveCapDir(dir, m.coupling.children[0]!.dir)).toBe(join(dir, "who"));
  });
});
