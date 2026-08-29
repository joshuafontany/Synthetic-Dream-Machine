/**
 * palace-organs — the shared enumerator setup (`lares sense setup`) and teardown (`palace-teardown`)
 * BOTH consume, plus the idempotent wire-once contract (re-run ⇒ all "present").
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { palaceOrgans, setupPalaceOrgans, organHealthy, guestMempalaceOrgan, materializeMemorySensorium } from "../src/palace-organs.js";
import { readManifest, resolveCapDir } from "../src/sensorium.js";
import {
  larMempalaceDir, larContentDir, larStructurePalaceDir, larFormPalaceDir, larMeshPalaceDir,
  meshSensoriumDir, meshWhoDir, meshAuthorityDir, meshFlowDir,
  memeticWikitextSensoriumDir, memeticWikitextFormalDir, memeticWikitextInformalDir,
  memorySensoriumDir,
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
  test("enumerates the SOVEREIGN organs in dependency order — contentpalace FIRST, the mesh TREE last", () => {
    const names = palaceOrgans().map((o) => o.name);
    expect(names).toEqual([
      "contentpalace", "structurepalace", "formpalace", "persistencepalace",
      // The memory sensorium's IN-TREE mempalace cap store — a sovereign plane like its peers, standing
      // inside the lararium's own tree. It carries the guest's NAME and none of its location.
      "mempalace",
      "meshpalace",
      "mesh:who", "mesh:who:persistence",
      "mesh:authority", "mesh:authority:persistence",
      "mesh:flow", "mesh:flow:persistence",
      "memetic-wikitext",
      "memetic-wikitext:formal", "memetic-wikitext:formal:persistence",
      "memetic-wikitext:informal", "memetic-wikitext:informal:persistence",
    ]);
  });

  test("the GUEST ~/.mempalace never enters the sovereign registry (the comparator ruling)", () => {
    // A founding stands ONLY what the lararium owns. Standing the guest from the boot wrote the
    // very comparator the RUN arc measures against (RUN-ARC.md:14). It rides its own lane now.
    // The ruling discriminates by LOCATION, never by name: the sovereign registry carries an in-tree
    // organ that shares the guest's name, so asserting on the name alone would read the wrong thing.
    // Every sovereign dir sits inside the lararium's own tree; the guest's does not.
    expect(palaceOrgans().map((o) => o.dir)).not.toContain(larMempalaceDir());
    for (const organ of palaceOrgans()) expect(organ.dir.startsWith(home)).toBe(true);

    // …and the guest lane still enumerates it, so `lares mempalace` can raise it deliberately.
    const guest = guestMempalaceOrgan();
    expect(guest.name).toBe("mempalace");
    expect(guest.dir).toBe(larMempalaceDir());
  });

  test("each organ resolves its dir from the SAME vessel-path resolver (no ambient default)", () => {
    const byName = Object.fromEntries(palaceOrgans().map((o) => [o.name, o.dir]));
    expect(byName["contentpalace"]).toBe(larContentDir());
    expect(byName["structurepalace"]).toBe(larStructurePalaceDir());
    expect(byName["formpalace"]).toBe(larFormPalaceDir());
    expect(byName["meshpalace"]).toBe(larMeshPalaceDir());
    // the mesh children hang below the mesh sensorium dir — the TREE is the composition.
    expect(byName["meshpalace"]).toBe(meshSensoriumDir());
    expect(byName["mesh:who"]).toBe(meshWhoDir());
    expect(byName["mesh:authority"]).toBe(meshAuthorityDir());
    expect(byName["mesh:flow"]).toBe(meshFlowDir());
    expect(byName["mesh:who"].startsWith(meshSensoriumDir())).toBe(true);
    // all under the isolated temp roots — proof the env override flows through.
    expect(byName["contentpalace"].startsWith(home)).toBe(true);
    expect(byName["structurepalace"].startsWith(home)).toBe(true);
    expect(byName["meshpalace"].startsWith(home)).toBe(true);
    // …and the guest lane honours $MEMPALACE_PALACE_PATH the same way.
    expect(guestMempalaceOrgan().dir).toBe(mempalace);
  });
});

describe("setupPalaceOrgans — wire-once / detect-existing idempotency", () => {
  test("leaves Python's richer Memory declaration under its capture authority", () => {
    mkdirSync(memorySensoriumDir(), { recursive: true });
    const pythonManifest = {
      schema: 1,
      sensorium: "memory",
      lar: "lar:///ha.ka.ba/lararium/api/living-grammar-palace#palace-instance",
      has: {
        content: { dir: "content", engine: "content", variance: "sheaf" },
        structure: { dir: "structure", engine: "structurepalace", variance: "sheaf" },
        form: { dir: "form", engine: "formpalace", variance: "sheaf" },
        persistence: { dir: "persistence", engine: "persistence", variance: "cosheaf" },
        worldline: { dir: "worldline", engine: "worldline", variance: "sheaf" },
      },
      order: { projector: "worldline", basis: "observed:turn-dag" },
      apertures: { beat: "worldline-dag" },
      worldline: { real: ["turn-dag"], arbitrary: ["source-sequence"] },
      persistencePolicy: { halfLife: null },
      bands: { grain: "membership", computed: "capture" },
      coupling: { children: [] },
      ephemeral: false,
      created: "2026-01-01T00:00:00.000Z",
    };
    const path = join(memorySensoriumDir(), "manifest.json");
    const body = JSON.stringify(pythonManifest, null, 2) + "\n";
    writeFileSync(path, body);

    expect(materializeMemorySensorium()).toMatchObject({ ran: false, ok: true });
    expect(readFileSync(path, "utf8")).toBe(body);
  });

  test("first run STANDS UP every absent organ; a re-run reads all 'present'", () => {
    // NOTE: no mempalace config is pre-created. The boot must not need one, and must not make one.
    const first = setupPalaceOrgans();
    // every step ok
    expect(first.every((s) => s.ok)).toBe(true);
    // the li planes + the mesh tree + the memetic-wikitext tree were absent → init ran, dirs created
    for (const name of [
      "contentpalace", "structurepalace", "formpalace", "persistencepalace", "meshpalace", "mesh:who", "mesh:authority", "mesh:flow",
      "memetic-wikitext", "memetic-wikitext:formal", "memetic-wikitext:informal",
    ]) {
      const step = first.find((s) => s.step === name)!;
      expect(step.ran).toBe(true);
      expect(existsSync(palaceOrgans().find((o) => o.name === name)!.dir)).toBe(true);
    }
    // THE COMPARATOR RULING (RUN-ARC.md:14): the boot never writes the GUEST — the ruling names a
    // LOCATION, never a name. A sovereign in-tree organ shares the guest's name and stands freely; the
    // guest's own dir stays untouched on disk, no config and no dir conjured by standing the sensorium.
    expect(existsSync(join(mempalace, "config.json"))).toBe(false);
    expect(existsSync(mempalace) && readdirSync(mempalace).length > 0).toBe(false);
    expect(palaceOrgans().find((o) => o.name === "mempalace")!.dir.startsWith(home)).toBe(true);
    // the sensorium manifests stamped on the FIRST pass (memory + the four mesh + the three memetic-wikitext)
    for (const step of [
      "memory:manifest", "mesh:manifest", "mesh:who:manifest", "mesh:authority:manifest", "mesh:flow:manifest",
      "memetic-wikitext:manifest", "memetic-wikitext:formal:manifest", "memetic-wikitext:informal:manifest",
    ]) {
      expect(first.find((s) => s.step === step)!.ran).toBe(true);
    }

    // SECOND run — everything present, nothing ran (manifests byte-stable → no rewrite).
    const second = setupPalaceOrgans();
    expect(second.every((s) => s.ok)).toBe(true);
    expect(second.every((s) => s.ran === false)).toBe(true);
    for (const o of palaceOrgans()) expect(organHealthy(o)).toBe(true);
  });

  test("the auto_save off-switch rewrites config.json ATOMICALLY — parse-back holds, no stranded temp", () => {
    // Config present but auto_save NOT yet false → the off-switch leg fires the durable write.
    mkdirSync(mempalace, { recursive: true });
    writeFileSync(join(mempalace, "config.json"), JSON.stringify({ hooks: { auto_save: true }, keep: "me" }) + "\n");

    // Fire the GUEST organ's init directly (the `lares mempalace` lane — never the boot): config
    // PRESENT → the CLI spawn leg skips, and ONLY the auto-save off-switch (the atomic config write
    // under witness) runs.
    const steps = guestMempalaceOrgan().init!();
    const off = steps.find((s) => s.step === "mempalace:auto-save-off")!;
    expect(off.ran).toBe(true);
    expect(off.ok).toBe(true);

    // Parse-back: the rewritten config reads whole (never torn), gate pinned, siblings preserved.
    const cfg = JSON.parse(readFileSync(join(mempalace, "config.json"), "utf8")) as Record<string, unknown>;
    expect((cfg["hooks"] as Record<string, unknown>)["auto_save"]).toBe(false);
    expect(cfg["keep"]).toBe("me");
    // The atomic path leaves NO stranded `<path>.<pid>.tmp` sibling behind.
    expect(readdirSync(mempalace).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  test("stamps the mesh sensorium TREE: parent #has {who,authority,flow}, each child self-describes", () => {
    mkdirSync(mempalace, { recursive: true });
    writeFileSync(join(mempalace, "config.json"), JSON.stringify({ hooks: { auto_save: false } }) + "\n");
    setupPalaceOrgans();

    // The parent mesh manifest declares the three children as dumb coupling edges (no role vocab).
    const mesh = readManifest(meshSensoriumDir())!;
    expect(mesh.sensorium).toBe("mesh");
    expect(mesh.lar).toBe("lar:///ha.ka.ba/lararium/mesh");
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
    expect(who.lar).toBe("lar:///ha.ka.ba/lararium/mesh/who");
    expect(auth.lar).toBe("lar:///ha.ka.ba/lararium/mesh/authority");
    expect(flow.lar).toBe("lar:///ha.ka.ba/lararium/mesh/flow");
    // Every sensorium carries the persistence infrastructure (a cosheaf fiber + policy); the
    // perceptual fibers the parallel fills WHEN it perceives them.
    for (const m of [who, auth, flow]) {
      expect(m.has["persistence"]!.variance).toBe("cosheaf");
      expect(m.persistencePolicy).toEqual({ halfLife: null });
    }
    // FLOW reserves its coupling-lobe child-edges (empty) for the node-stream effective-connectivity.
    expect(flow.coupling.children).toEqual([]);
  });

  test("stamps the memetic-wikitext TREE: top #has {formal,informal} as coupling children; peers carry a self-cap", () => {
    mkdirSync(mempalace, { recursive: true });
    writeFileSync(join(mempalace, "config.json"), JSON.stringify({ hooks: { auto_save: false } }) + "\n");
    setupPalaceOrgans();

    // The top holds NO fiber cap; the peers ride the dumb coupling child-edges, NEITHER on top.
    const top = readManifest(memeticWikitextSensoriumDir())!;
    expect(top.sensorium).toBe("memetic-wikitext");
    expect(top.has).toEqual({});
    expect(top.coupling.children.map((c) => c.sensorium)).toEqual(["formal", "informal"]);
    const byChild = Object.fromEntries(top.coupling.children.map((c) => [c.sensorium, resolveCapDir(memeticWikitextSensoriumDir(), c.dir)]));
    expect(byChild["formal"]).toBe(memeticWikitextFormalDir());
    expect(byChild["informal"]).toBe(memeticWikitextInformalDir());

    // Each peer self-describes with a THIN content cap whose bytes ARE its own dir — the self-cap "." fix.
    const formal   = readManifest(memeticWikitextFormalDir())!;
    const informal = readManifest(memeticWikitextInformalDir())!;
    expect([formal.sensorium, informal.sensorium]).toEqual(["formal", "informal"]);
    expect(formal.has["content"]!.dir).toBe(".");
    expect(informal.has["content"]!.dir).toBe(".");
    // and "." inverts back to the peer dir (relocate-as-one holds).
    expect(resolveCapDir(memeticWikitextFormalDir(), formal.has["content"]!.dir)).toBe(memeticWikitextFormalDir());
  });
});
