/**
 * sense-corpus — the ephemeral corpus-sensorium lifecycle: a `run` dissolves on exit (success OR
 * error), `dissolve` is idempotent, and `--orphans` reaps leaked scratch.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runCorpus, openCorpus, listCorpora, listOrphans, reapOrphans,
  dissolveCorpus, keepSensorium, corpusStructurePath, corpusBandsCellsPath, corpusFormConstructiconPath,
  type CorpusIngest, type CorpusSearch,
} from "../src/sense-corpus.js";
import { larCorpusDir, corpusInstanceDir } from "../src/vessel-paths.js";

let home: string;
let savedRoot: string | undefined;
let src: string;

/** A no-python ingest stub — the lifecycle tests never touch the sidecar. */
const fakeIngest: CorpusIngest = () => ({ drawers: 3, structures: 2, bands: 5, forms: 4, note: "fake-ingest" });

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

describe("runCorpus — the `--rm` ephemeral default", () => {
  test("dissolves on SUCCESS — no scratch survives", async () => {
    const res = await runCorpus({ sourcePath: src, ingest: fakeIngest });
    expect(res.dissolved).toBe(true);
    expect(res.drawers).toBe(3);
    expect(res.structures).toBe(2); // the S2 structure-plane count threads through
    expect(res.bands).toBe(5); // the S1 bands-plane cell count threads through
    expect(res.forms).toBe(4); // the S3 form-plane construction count threads through
    expect(existsSync(corpusInstanceDir(res.id))).toBe(false);
    expect(listCorpora()).toHaveLength(0);
  });

  test("dissolves on ERROR — the analysis throws, the finally still sweeps", async () => {
    const throwingSearch: CorpusSearch = async () => { throw new Error("boom"); };
    let capturedId = "";
    // Capture the id by spying through listCorpora mid-flight is racy; instead assert the root ends empty.
    await expect(
      runCorpus({ sourcePath: src, ingest: fakeIngest, analysis: "anything", search: throwingSearch }),
    ).rejects.toThrow("boom");
    void capturedId;
    expect(listCorpora()).toHaveLength(0);
    // the corpus root holds no leaked instance dir
    expect(existsSync(larCorpusDir()) ? listOrphans() : []).toHaveLength(0);
  });

  test("--keep LANDS it durable — the scratch survives, marked non-ephemeral", async () => {
    const res = await runCorpus({ sourcePath: src, ingest: fakeIngest, keep: true });
    expect(res.dissolved).toBe(false);
    expect(existsSync(corpusInstanceDir(res.id))).toBe(true);
    const live = listCorpora();
    expect(live).toHaveLength(1);
    expect(live[0]!.ephemeral).toBe(false);
  });
});

describe("dissolveCorpus — idempotent", () => {
  test("first dissolve removes it; second is a no-op success", () => {
    const { id } = openCorpus({ sourcePath: src, ingest: fakeIngest });
    expect(existsSync(corpusInstanceDir(id))).toBe(true);

    const first = dissolveCorpus(id);
    expect(first.dissolved).toBe(true);
    expect(first.existed).toBe(true);

    const second = dissolveCorpus(id);
    expect(second.dissolved).toBe(false);
    expect(second.existed).toBe(false);
  });
});

describe("orphan reaping", () => {
  test("a durable (open) corpus is NEVER an orphan; a manifest-less dir + a dead-pid ephemeral ARE", () => {
    // a live, durable corpus — must be spared
    const durable = openCorpus({ sourcePath: src, ingest: fakeIngest });

    // a record-less leaked dir (interrupted mid-mint)
    const orphanDir = corpusInstanceDir("c-orphan-nomanifest");
    mkdirSync(orphanDir, { recursive: true });

    // an ephemeral whose owner pid is dead (a crashed run) — the leak-record rides corpus.json
    const deadDir = corpusInstanceDir("c-orphan-deadpid");
    mkdirSync(deadDir, { recursive: true });
    writeFileSync(join(deadDir, "corpus.json"), JSON.stringify({
      id: "c-orphan-deadpid", name: "x", sourcePath: src, createdAt: new Date().toISOString(),
      ephemeral: true, pid: 2_147_483_646, // a pid that is not alive
    }) + "\n");

    const orphans = listOrphans();
    expect(orphans).toContain(orphanDir);
    expect(orphans).toContain(deadDir);
    expect(orphans).not.toContain(corpusInstanceDir(durable.id));

    const reaped = reapOrphans();
    expect(reaped.sort()).toEqual([deadDir, orphanDir].sort());
    expect(existsSync(orphanDir)).toBe(false);
    expect(existsSync(deadDir)).toBe(false);
    // the durable corpus stands
    expect(existsSync(corpusInstanceDir(durable.id))).toBe(true);
    expect(listCorpora().map((m) => m.id)).toEqual([durable.id]);
  });

  test("keepSensorium promotes an ephemeral so reaping spares it", () => {
    // forge an ephemeral with THIS process's pid → alive → spared even before keep
    const live = openCorpus({ sourcePath: src, ingest: fakeIngest, ephemeral: true });
    keepSensorium(live.id);
    expect(listOrphans()).not.toContain(corpusInstanceDir(live.id));
    expect(reapOrphans()).not.toContain(corpusInstanceDir(live.id));
    expect(existsSync(corpusInstanceDir(live.id))).toBe(true);
  });
});

describe("the S2 structure plane — the parse-router seam", () => {
  test("a router-less ingest GRACEFULLY structure-skips (content plane unaffected)", async () => {
    // a seam that mimics a host with no python/router: drawers filed, 0 structures, skip note.
    const skipIngest: CorpusIngest = () => ({ drawers: 1, structures: 0, bands: 0, forms: 0, note: "mined → 1 drawers · structure-skipped: no router/python · bands-skipped: no sidecar/python" });
    const res = await runCorpus({ sourcePath: src, ingest: skipIngest });
    expect(res.structures).toBe(0);
    expect(res.bands).toBe(0);
    expect(res.drawers).toBe(1);
    expect(res.note).toContain("structure-skipped");
    expect(res.note).toContain("bands-skipped");
    expect(res.dissolved).toBe(true);
  });

  test("the structure sub-palace lives UNDER the corpus dir (swept on dissolve)", () => {
    // a seam that writes a marker into the structure cap, proving it nests under the root.
    const writingIngest: CorpusIngest = ({ sensoriumRoot }) => {
      const sdir = corpusStructurePath(sensoriumRoot);
      mkdirSync(sdir, { recursive: true });
      writeFileSync(join(sdir, "chroma.sqlite3"), "x");
      return { drawers: 0, structures: 1, bands: 0, forms: 0, note: "structure: 1 vectors (0 skipped)" };
    };
    const { id, dir } = openCorpus({ sourcePath: src, ingest: writingIngest });
    expect(existsSync(corpusStructurePath(dir))).toBe(true);
    dissolveCorpus(id);
    expect(existsSync(corpusStructurePath(dir))).toBe(false); // swept with the instance dir
  });

  // Opt-in end-to-end: the REAL defaultCorpusIngest over a code/markdown dir, exercised through the
  // public openCorpus seam. Skips unless RUN_CORPUS_E2E=1 (it needs the venv python + tree-sitter +
  // chroma). When it runs, it proves `corpus run`-shaped ingest produces structure vectors.
  const e2e = process.env["RUN_CORPUS_E2E"] === "1" ? test : test.skip;
  e2e("defaultCorpusIngest's structure leg files vectors over real source", () => {
    writeFileSync(join(src, "x.js"), "function f(n){ if(n>0){return n*2;} return 0; }\n");
    const out = openCorpus({ sourcePath: src }); // default ingest → real python structure router
    expect(out.manifest.structures ?? 0).toBeGreaterThan(0);
    expect(existsSync(corpusStructurePath(out.dir))).toBe(true);
    dissolveCorpus(out.id);
  });
});

describe("the S1 bands plane — the multi-scale FFZ seam", () => {
  test("a sidecar-less ingest GRACEFULLY bands-skips (content/structure planes unaffected)", async () => {
    const skipIngest: CorpusIngest = () => ({ drawers: 2, structures: 1, bands: 0, forms: 0, note: "mined → 2 drawers · structure: 1 vectors · bands-skipped: no sidecar/python" });
    const res = await runCorpus({ sourcePath: src, ingest: skipIngest });
    expect(res.bands).toBe(0);
    expect(res.drawers).toBe(2);
    expect(res.structures).toBe(1);
    expect(res.note).toContain("bands-skipped");
    expect(res.dissolved).toBe(true);
  });

  test("the bands leg files adaptive lar_ffz cells the manifest + result thread through", () => {
    // a seam that writes the bands-cells NDJSON (proving the path nests under the corpus dir)
    const bandsIngest: CorpusIngest = ({ sensoriumRoot }) => {
      writeFileSync(corpusBandsCellsPath(sensoriumRoot), JSON.stringify({ lar_ffz: "corpus/0.0.0.0.0", register: "Canon" }) + "\n");
      return { drawers: 4, structures: 3, bands: 12, forms: 0, note: "bands: 2 cuts · 1 Canon / 1 Provisional" };
    };
    const { id, dir, manifest } = openCorpus({ sourcePath: src, ingest: bandsIngest });
    expect(manifest.bands).toBe(12);
    expect(existsSync(corpusBandsCellsPath(dir))).toBe(true);
    dissolveCorpus(id);
    expect(existsSync(corpusBandsCellsPath(dir))).toBe(false); // swept with the instance dir
  });
});

describe("the S3 form plane — the blind-induction seam", () => {
  test("a sidecar-less ingest GRACEFULLY form-skips (content/structure/bands planes unaffected)", async () => {
    const skipIngest: CorpusIngest = () => ({ drawers: 2, structures: 1, bands: 3, forms: 0, note: "mined → 2 drawers · structure: 1 vectors · bands: 3 cells · form-skipped: no sidecar/python" });
    const res = await runCorpus({ sourcePath: src, ingest: skipIngest });
    expect(res.forms).toBe(0);
    expect(res.drawers).toBe(2);
    expect(res.structures).toBe(1);
    expect(res.bands).toBe(3);
    expect(res.note).toContain("form-skipped");
    expect(res.dissolved).toBe(true);
  });

  test("the form leg files the constructicon the manifest + result thread through", () => {
    // a seam that writes the constructicon NDJSON (proving the path nests under the corpus dir)
    const formIngest: CorpusIngest = ({ sensoriumRoot }) => {
      writeFileSync(corpusFormConstructiconPath(sensoriumRoot), JSON.stringify({ struct_hash: "abc", origin: "tree", seq: ["ahu_block", "sigil_name"], support: 5 }) + "\n");
      return { drawers: 6, structures: 5, bands: 4, forms: 7, note: "form: 7 constructions from 5 structures" };
    };
    const { id, dir, manifest } = openCorpus({ sourcePath: src, ingest: formIngest });
    expect(manifest.forms).toBe(7);
    expect(existsSync(corpusFormConstructiconPath(dir))).toBe(true);
    dissolveCorpus(id);
    expect(existsSync(corpusFormConstructiconPath(dir))).toBe(false); // swept with the instance dir
  });
});
