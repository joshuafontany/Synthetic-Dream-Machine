/**
 * palace-organs — the shared enumerator setup (`wake --init`) and teardown (`palace-teardown`)
 * BOTH consume, plus the idempotent wire-once contract (re-run ⇒ all "present").
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { palaceOrgans, setupPalaceOrgans, organHealthy } from "../src/palace-organs.js";
import { readManifest, resolveCapDir } from "../src/sensorium.js";
import {
  larMempalaceDir, larAstPalaceDir, larFormPalaceDir, larMeshPalaceDir,
  meshSensoriumDir, meshWhoDir, meshAuthorityDir, meshFlowDir,
} from "../src/vessel-paths.js";

let home: string;
let mempalace: string;
let savedRoot: string | undefined;
let savedMp: string | undefined;

beforeEach(() => {
  savedRoot = process.env["LAR_ROOT"];
  savedMp = process.env["MEMPALACE_PALACE_PATH"];
  home = mkdtempSync(join(tmpdir(), "lar-organs-home-"));
  mempalace = mkdtempSync(join(tmpdir(), "lar-organs-mp-"));
  process.env["LAR_ROOT"] = home;
  process.env["MEMPALACE_PALACE_PATH"] = mempalace;
});

afterEach(() => {
  if (savedRoot === undefined) delete process.env["LAR_ROOT"]; else process.env["LAR_ROOT"] = savedRoot;
  if (savedMp === undefined) delete process.env["MEMPALACE_PALACE_PATH"]; else process.env["MEMPALACE_PALACE_PATH"] = savedMp;
  for (const d of [home, mempalace]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ } }
});

describe("palaceOrgans — the ONE registry both consumers read", () => {
  test("enumerates the organs in dependency order — mempalace FIRST, the mesh TREE last", () => {
    const names = palaceOrgans().map((o) => o.name);
    expect(names).toEqual([
      "mempalace", "astpalace", "formpalace",
      "meshpalace", "mesh:who", "mesh:authority", "mesh:flow",
    ]);
  });

  test("each organ resolves its dir from the SAME vessel-path resolver (no ambient default)", () => {
    const byName = Object.fromEntries(palaceOrgans().map((o) => [o.name, o.dir]));
    expect(byName["mempalace"]).toBe(larMempalaceDir());
    expect(byName["astpalace"]).toBe(larAstPalaceDir());
    expect(byName["formpalace"]).toBe(larFormPalaceDir());
    expect(byName["meshpalace"]).toBe(larMeshPalaceDir());
    // the mesh children hang below the mesh sensorium dir — the TREE is the composition.
    expect(byName["meshpalace"]).toBe(meshSensoriumDir());
    expect(byName["mesh:who"]).toBe(meshWhoDir());
    expect(byName["mesh:authority"]).toBe(meshAuthorityDir());
    expect(byName["mesh:flow"]).toBe(meshFlowDir());
    expect(byName["mesh:who"].startsWith(meshSensoriumDir())).toBe(true);
    // all under the isolated temp roots — proof the env override flows through.
    expect(byName["mempalace"]).toBe(mempalace);
    expect(byName["astpalace"].startsWith(home)).toBe(true);
    expect(byName["meshpalace"].startsWith(home)).toBe(true);
  });
});

describe("setupPalaceOrgans — wire-once / detect-existing idempotency", () => {
  test("first run STANDS UP every absent organ; a re-run reads all 'present'", () => {
    // Pre-create the mempalace config so its organ is healthy WITHOUT spawning the real `mempalace` CLI.
    mkdirSync(mempalace, { recursive: true });
    writeFileSync(join(mempalace, "config.json"), JSON.stringify({ hooks: { auto_save: false } }) + "\n");

    const first = setupPalaceOrgans();
    // every step ok
    expect(first.every((s) => s.ok)).toBe(true);
    // ast/form + the whole mesh tree were absent → init ran and created their dirs
    for (const name of ["astpalace", "formpalace", "meshpalace", "mesh:who", "mesh:authority", "mesh:flow"]) {
      const step = first.find((s) => s.step === name)!;
      expect(step.ran).toBe(true);
      expect(existsSync(palaceOrgans().find((o) => o.name === name)!.dir)).toBe(true);
    }
    // mempalace was present → skipped (no subprocess)
    expect(first.find((s) => s.step === "mempalace")!.ran).toBe(false);
    // the sensorium manifests stamped on the FIRST pass (memory + the four mesh manifests)
    for (const step of ["memory:manifest", "mesh:manifest", "mesh:who:manifest", "mesh:authority:manifest", "mesh:flow:manifest"]) {
      expect(first.find((s) => s.step === step)!.ran).toBe(true);
    }

    // SECOND run — everything present, nothing ran (manifests byte-stable → no rewrite).
    const second = setupPalaceOrgans();
    expect(second.every((s) => s.ok)).toBe(true);
    expect(second.every((s) => s.ran === false)).toBe(true);
    for (const o of palaceOrgans()) expect(organHealthy(o)).toBe(true);
  });

  test("stamps the mesh sensorium TREE: parent #has {who,authority,flow}, each child self-describes", () => {
    mkdirSync(mempalace, { recursive: true });
    writeFileSync(join(mempalace, "config.json"), JSON.stringify({ hooks: { auto_save: false } }) + "\n");
    setupPalaceOrgans();

    // The parent mesh manifest declares the three children as dumb coupling edges (no role vocab).
    const mesh = readManifest(meshSensoriumDir())!;
    expect(mesh.sensorium).toBe("mesh");
    expect(mesh.lar).toBe("lar:///ha.ka.ba/@lararium/mesh");
    expect(mesh.has).toEqual({});                                // minimal own caps
    expect(mesh.coupling.children.map((c) => c.sensorium)).toEqual(["who", "authority", "flow"]);
    // resolveCapDir INVERTS the nesting back to the child dirs.
    const byChild = Object.fromEntries(mesh.coupling.children.map((c) => [c.sensorium, resolveCapDir(meshSensoriumDir(), c.dir)]));
    expect(byChild["who"]).toBe(meshWhoDir());
    expect(byChild["authority"]).toBe(meshAuthorityDir());
    expect(byChild["flow"]).toBe(meshFlowDir());

    // Each child self-describes with its OWN thin manifest — empty `has` (the parallel fills it).
    const who  = readManifest(meshWhoDir())!;
    const auth = readManifest(meshAuthorityDir())!;
    const flow = readManifest(meshFlowDir())!;
    expect([who.sensorium, auth.sensorium, flow.sensorium]).toEqual(["who", "authority", "flow"]);
    expect(who.lar).toBe("lar:///ha.ka.ba/@lararium/mesh/who");
    expect(auth.lar).toBe("lar:///ha.ka.ba/@lararium/mesh/authority");
    expect(flow.lar).toBe("lar:///ha.ka.ba/@lararium/mesh/flow");
    for (const m of [who, auth, flow]) expect(m.has).toEqual({});   // thin — parallel fills without a structure change
    // FLOW reserves its coupling-lobe child-edges (empty) for the node-stream effective-connectivity.
    expect(flow.coupling.children).toEqual([]);
  });
});
