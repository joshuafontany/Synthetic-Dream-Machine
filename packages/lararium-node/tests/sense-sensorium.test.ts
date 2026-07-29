/**
 * sense-sensorium — the ephemeral sensorium lifecycle: a `run` dissolves on exit (success OR
 * error), `dissolve` is idempotent, and `--orphans` reaps leaked scratch.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runSensorium, openSensorium, listSensoria, listOrphans, reapOrphans,
  dissolveSensorium, keepSensorium, sensoriumStructurePath, sensoriumBandsCellsPath, sensoriumFormConstructiconPath,
  type SensoriumIngest, type SensoriumSearch,
} from "../src/sense-sensorium.js";
import { scratchSensoriumDir, scratchSensoriumInstanceDir } from "../src/vessel-paths.js";

let home: string;
let savedRoot: string | undefined;
let src: string;

/** A no-python ingest stub — the lifecycle tests never touch the holder. */
const fakeIngest: SensoriumIngest = () => ({ drawers: 3, structures: 2, bands: 5, forms: 4, note: "fake-ingest" });

beforeEach(() => {
  savedRoot = process.env["LAR_ROOT"];
  home = mkdtempSync(join(tmpdir(), "lar-corpus-home-"));
  process.env["LAR_ROOT"] = home;
  src = mkdtempSync(join(tmpdir(), "lar-corpus-src-"));
  writeFileSync(join(src, "a.md"), "# corpus source\n");
});

afterEach(() => {
  if (savedRoot === undefined) delete process.env["LAR_ROOT"]; else process.env["LAR_ROOT"] = savedRoot;
  for (const d of [home, src]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ } }
});

describe("runSensorium — the `--rm` ephemeral default", () => {
  test("dissolves on SUCCESS — no scratch survives", async () => {
    const res = await runSensorium({ sourcePath: src, ingest: fakeIngest });
    expect(res.dissolved).toBe(true);
    expect(res.drawers).toBe(3);
    expect(res.structures).toBe(2); // the S2 structure-plane count threads through
    expect(res.bands).toBe(5); // the S1 bands-plane cell count threads through
    expect(res.forms).toBe(4); // the S3 form-plane construction count threads through
    expect(existsSync(scratchSensoriumInstanceDir(res.id))).toBe(false);
    expect(listSensoria()).toHaveLength(0);
  });

  test("dissolves on ERROR — the analysis throws, the finally still sweeps", async () => {
    const throwingSearch: SensoriumSearch = async () => { throw new Error("boom"); };
    let capturedId = "";
    // Capture the id by spying through listSensoria mid-flight is racy; instead assert the root ends empty.
    await expect(
      runSensorium({ sourcePath: src, ingest: fakeIngest, analysis: "anything", search: throwingSearch }),
    ).rejects.toThrow("boom");
    void capturedId;
    expect(listSensoria()).toHaveLength(0);
    // the corpus root holds no leaked instance dir
    expect(existsSync(scratchSensoriumDir()) ? listOrphans() : []).toHaveLength(0);
  });

  test("--keep LANDS it durable — the scratch survives, marked non-ephemeral", async () => {
    const res = await runSensorium({ sourcePath: src, ingest: fakeIngest, keep: true });
    expect(res.dissolved).toBe(false);
    expect(existsSync(scratchSensoriumInstanceDir(res.id))).toBe(true);
    const live = listSensoria();
    expect(live).toHaveLength(1);
    expect(live[0]!.ephemeral).toBe(false);
  });
});

describe("dissolveSensorium — idempotent", () => {
  test("first dissolve removes it; second is a no-op success", () => {
    const { id } = openSensorium({ sourcePath: src, ingest: fakeIngest });
    expect(existsSync(scratchSensoriumInstanceDir(id))).toBe(true);

    const first = dissolveSensorium(id);
    expect(first.dissolved).toBe(true);
    expect(first.existed).toBe(true);

    const second = dissolveSensorium(id);
    expect(second.dissolved).toBe(false);
    expect(second.existed).toBe(false);
  });
});

describe("orphan reaping", () => {
  test("a durable (open) corpus is NEVER an orphan; a manifest-less dir + a dead-pid ephemeral ARE", () => {
    // a live, durable corpus — must be spared
    const durable = openSensorium({ sourcePath: src, ingest: fakeIngest });

    // a record-less leaked dir (interrupted mid-mint)
    const orphanDir = scratchSensoriumInstanceDir("c-orphan-nomanifest");
    mkdirSync(orphanDir, { recursive: true });

    // an ephemeral whose owner pid is dead (a crashed run) — the leak-record rides sensorium.json
    const deadDir = scratchSensoriumInstanceDir("c-orphan-deadpid");
    mkdirSync(deadDir, { recursive: true });
    writeFileSync(join(deadDir, "sensorium.json"), JSON.stringify({
      id: "c-orphan-deadpid", name: "x", sourcePath: src, createdAt: new Date().toISOString(),
      ephemeral: true, pid: 2_147_483_646, // a pid that is not alive
    }) + "\n");

    const orphans = listOrphans();
    expect(orphans).toContain(orphanDir);
    expect(orphans).toContain(deadDir);
    expect(orphans).not.toContain(scratchSensoriumInstanceDir(durable.id));

    const reaped = reapOrphans();
    expect(reaped.sort()).toEqual([deadDir, orphanDir].sort());
    expect(existsSync(orphanDir)).toBe(false);
    expect(existsSync(deadDir)).toBe(false);
    // the durable corpus stands
    expect(existsSync(scratchSensoriumInstanceDir(durable.id))).toBe(true);
    expect(listSensoria().map((m) => m.id)).toEqual([durable.id]);
  });

  test("keepSensorium promotes an ephemeral so reaping spares it", () => {
    // forge an ephemeral with THIS process's pid → alive → spared even before keep
    const live = openSensorium({ sourcePath: src, ingest: fakeIngest, ephemeral: true });
    keepSensorium(live.id);
    expect(listOrphans()).not.toContain(scratchSensoriumInstanceDir(live.id));
    expect(reapOrphans()).not.toContain(scratchSensoriumInstanceDir(live.id));
    expect(existsSync(scratchSensoriumInstanceDir(live.id))).toBe(true);
  });
});

describe("the S2 structure plane — the parse-router shore", () => {
  test("a router-less ingest GRACEFULLY structure-skips (content plane unaffected)", async () => {
    // a shore that mimics a host with no python/router: drawers filed, 0 structures, skip note.
    const skipIngest: SensoriumIngest = () => ({ drawers: 1, structures: 0, bands: 0, forms: 0, note: "mined → 1 drawers · structure-skipped: no router/python · bands-skipped: no holder/python" });
    const res = await runSensorium({ sourcePath: src, ingest: skipIngest });
    expect(res.structures).toBe(0);
    expect(res.bands).toBe(0);
    expect(res.drawers).toBe(1);
    expect(res.note).toContain("structure-skipped");
    expect(res.note).toContain("bands-skipped");
    expect(res.dissolved).toBe(true);
  });

  test("the structure sub-palace lives UNDER the corpus dir (swept on dissolve)", () => {
    // a shore that writes a marker into the structure cap, proving it nests under the root.
    const writingIngest: SensoriumIngest = ({ sensoriumRoot }) => {
      const sdir = sensoriumStructurePath(sensoriumRoot);
      mkdirSync(sdir, { recursive: true });
      writeFileSync(join(sdir, "chroma.sqlite3"), "x");
      return { drawers: 0, structures: 1, bands: 0, forms: 0, note: "structure: 1 vectors (0 skipped)" };
    };
    const { id, dir } = openSensorium({ sourcePath: src, ingest: writingIngest });
    expect(existsSync(sensoriumStructurePath(dir))).toBe(true);
    dissolveSensorium(id);
    expect(existsSync(sensoriumStructurePath(dir))).toBe(false); // swept with the instance dir
  });

  // Opt-in end-to-end: the REAL defaultSensoriumIngest over a code/markdown dir, exercised through the
  // public openSensorium shore. Skips unless RUN_CORPUS_E2E=1 (it needs the venv python + tree-sitter +
  // chroma). When it runs, it proves `sensorium run`-shaped ingest produces structure vectors.
  const e2e = process.env["RUN_CORPUS_E2E"] === "1" ? test : test.skip;
  e2e("defaultSensoriumIngest's structure leg files vectors over real source", () => {
    writeFileSync(join(src, "x.js"), "function f(n){ if(n>0){return n*2;} return 0; }\n");
    const out = openSensorium({ sourcePath: src }); // default ingest → real python structure router
    expect(out.manifest.structures ?? 0).toBeGreaterThan(0);
    expect(existsSync(sensoriumStructurePath(out.dir))).toBe(true);
    dissolveSensorium(out.id);
  });
});

describe("the S1 bands plane — the multi-scale FFZ shore", () => {
  test("a holder-less ingest GRACEFULLY bands-skips (content/structure planes unaffected)", async () => {
    const skipIngest: SensoriumIngest = () => ({ drawers: 2, structures: 1, bands: 0, forms: 0, note: "mined → 2 drawers · structure: 1 vectors · bands-skipped: no holder/python" });
    const res = await runSensorium({ sourcePath: src, ingest: skipIngest });
    expect(res.bands).toBe(0);
    expect(res.drawers).toBe(2);
    expect(res.structures).toBe(1);
    expect(res.note).toContain("bands-skipped");
    expect(res.dissolved).toBe(true);
  });

  test("the bands leg files adaptive lar_ffz cells the manifest + result thread through", () => {
    // a shore that writes the bands-cells NDJSON (proving the path nests under the corpus dir)
    const bandsIngest: SensoriumIngest = ({ sensoriumRoot }) => {
      writeFileSync(sensoriumBandsCellsPath(sensoriumRoot), JSON.stringify({ lar_ffz: "corpus/0.0.0.0.0", register: "Canon" }) + "\n");
      return { drawers: 4, structures: 3, bands: 12, forms: 0, note: "bands: 2 cuts · 1 Canon / 1 Provisional" };
    };
    const { id, dir, manifest } = openSensorium({ sourcePath: src, ingest: bandsIngest });
    expect(manifest.bands).toBe(12);
    expect(existsSync(sensoriumBandsCellsPath(dir))).toBe(true);
    dissolveSensorium(id);
    expect(existsSync(sensoriumBandsCellsPath(dir))).toBe(false); // swept with the instance dir
  });
});

describe("the S3 form plane — the blind-induction shore", () => {
  test("a holder-less ingest GRACEFULLY form-skips (content/structure/bands planes unaffected)", async () => {
    const skipIngest: SensoriumIngest = () => ({ drawers: 2, structures: 1, bands: 3, forms: 0, note: "mined → 2 drawers · structure: 1 vectors · bands: 3 cells · form-skipped: no holder/python" });
    const res = await runSensorium({ sourcePath: src, ingest: skipIngest });
    expect(res.forms).toBe(0);
    expect(res.drawers).toBe(2);
    expect(res.structures).toBe(1);
    expect(res.bands).toBe(3);
    expect(res.note).toContain("form-skipped");
    expect(res.dissolved).toBe(true);
  });

  test("the form leg files the constructicon the manifest + result thread through", () => {
    // a shore that writes the constructicon NDJSON (proving the path nests under the corpus dir)
    const formIngest: SensoriumIngest = ({ sensoriumRoot }) => {
      writeFileSync(sensoriumFormConstructiconPath(sensoriumRoot), JSON.stringify({ struct_hash: "abc", origin: "tree", seq: ["ahu_block", "sigil_name"], support: 5 }) + "\n");
      return { drawers: 6, structures: 5, bands: 4, forms: 7, note: "form: 7 constructions from 5 structures" };
    };
    const { id, dir, manifest } = openSensorium({ sourcePath: src, ingest: formIngest });
    expect(manifest.forms).toBe(7);
    expect(existsSync(sensoriumFormConstructiconPath(dir))).toBe(true);
    dissolveSensorium(id);
    expect(existsSync(sensoriumFormConstructiconPath(dir))).toBe(false); // swept with the instance dir
  });
});
