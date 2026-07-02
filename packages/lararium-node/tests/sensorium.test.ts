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
  planeVariance, SHEAF_PLANES, COSHEAF_PLANES,
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
          structure: { absDir: join(dir, "structure"),      engine: "structurepalace" },  // inside → relative
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

  test("carries the li/ki VARIANCE tag — fiber caps = sheaf (li), bands/coupling = cosheaf (ki)", () => {
    const m = buildSensoriumManifest(dir, {
      sensorium: "memory",
      lar: "lar:///x",
      caps: {
        content:   { absDir: join(dir, "content"),   engine: "mempalace" },   // default sheaf
        structure: { absDir: join(dir, "structure"),  engine: "structurepalace" },
        form:      { absDir: join(dir, "form"),        engine: "formpalace" },
      },
    });
    // fiber caps carry the sheaf (li) posture on the wire, by default
    expect(m.has["content"]!.variance).toBe("sheaf");
    expect(m.has["structure"]!.variance).toBe("sheaf");
    expect(m.has["form"]!.variance).toBe("sheaf");
    // planeVariance reads the dual pair: content/structure/form = sheaf; bands/coupling = cosheaf
    for (const p of SHEAF_PLANES) expect(planeVariance(m, p)).toBe("sheaf");
    for (const p of COSHEAF_PLANES) expect(planeVariance(m, p)).toBe("cosheaf");
    expect(planeVariance(m, "not-a-plane")).toBeNull();
    // the variance survives the disk round-trip (the manifest self-describes its dual pair)
    writeManifest(dir, m);
    expect(readManifest(dir)!.has["content"]!.variance).toBe("sheaf");
  });

  test("a cosheaf-natured fiber cap may DECLARE its variance (has is an open, tag-driven record)", () => {
    const m = buildSensoriumManifest(dir, {
      sensorium: "odd",
      lar: "lar:///x",
      caps: { flux: { absDir: join(dir, "flux"), engine: "e", variance: "cosheaf" } },
    });
    expect(m.has["flux"]!.variance).toBe("cosheaf");
    expect(planeVariance(m, "flux")).toBe("cosheaf");
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

describe("sensorium — the persistence cap (the 5th part, path-A un-fuse)", () => {
  test("a sensorium composes has.persistence as a COSHEAF fiber + a persistencePolicy base-cap", () => {
    const dir = "/tmp/sens-x";
    const m = buildSensoriumManifest(dir, {
      sensorium: "memory", lar: "lar:///x",
      caps: {
        content: { absDir: "/home/u/.mempalace", engine: "mempalace" },              // li sheaf (default)
        persistence: { absDir: dir + "/persistence", engine: "persistence", variance: "cosheaf" },
      },
      persistencePolicy: { admitThreshold: 0.5, halfLife: null },                     // witness/authority mode
    });
    expect(m.has["persistence"]!.variance).toBe("cosheaf");
    expect(planeVariance(m, "persistence")).toBe("cosheaf");                          // read from the fiber's own tag
    expect(planeVariance(m, "content")).toBe("sheaf");
    expect(m.persistencePolicy).toEqual({ admitThreshold: 0.5, halfLife: null });
  });

  test("path-A: the maturation mode rides halfLife, ORTHOGONAL to the ephemeral bool", () => {
    const dir = "/tmp/sens-eph";
    // an ephemeral (swept-on-exit) sensorium in AUTHORITY mode (halfLife null) — the two axes cross freely
    const m = buildSensoriumManifest(dir, {
      sensorium: "scratch", lar: "lar:///y",
      caps: { persistence: { absDir: dir + "/p", engine: "persistence", variance: "cosheaf" } },
      persistencePolicy: { admitThreshold: 0.5, halfLife: 2592000 },                  // affinity mode
      ephemeral: false,                                                               // but durable-on-disk
    });
    expect(m.ephemeral).toBe(false);                 // swept-on-exit axis UNTOUCHED
    expect(m.persistencePolicy!.halfLife).toBe(2592000); // maturation axis independent
  });

  test("no persistence cap → the field is simply absent (non-breaking)", () => {
    const m = buildSensoriumManifest("/tmp/sens-none", {
      sensorium: "plain", lar: "lar:///z", caps: { content: { absDir: "/c", engine: "mempalace" } },
    });
    expect(m.persistencePolicy).toBeUndefined();
  });
});
