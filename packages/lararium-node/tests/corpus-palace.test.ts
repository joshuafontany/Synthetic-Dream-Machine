/**
 * corpus-palace — the ephemeral astral multipalace lifecycle: a `run` dissolves on exit (success OR
 * error), `dissolve` is idempotent, and `--orphans` reaps leaked scratch.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runCorpus, openCorpus, listCorpora, listOrphans, reapOrphans,
  dissolveCorpus, keepCorpus, type CorpusIngest, type CorpusSearch,
} from "../src/corpus-palace.js";
import { larCorpusDir, corpusInstanceDir } from "../src/vessel-paths.js";

let home: string;
let savedRoot: string | undefined;
let src: string;

/** A no-python ingest stub — the lifecycle tests never touch the sidecar. */
const fakeIngest: CorpusIngest = () => ({ drawers: 3, note: "fake-ingest" });

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

    // a manifest-less leaked dir (interrupted mid-mint)
    const orphanDir = corpusInstanceDir("c-orphan-nomanifest");
    mkdirSync(orphanDir, { recursive: true });

    // an ephemeral whose owner pid is dead (a crashed run)
    const deadDir = corpusInstanceDir("c-orphan-deadpid");
    mkdirSync(deadDir, { recursive: true });
    writeFileSync(join(deadDir, "manifest.json"), JSON.stringify({
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

  test("keepCorpus promotes an ephemeral so reaping spares it", () => {
    // forge an ephemeral with THIS process's pid → alive → spared even before keep
    const live = openCorpus({ sourcePath: src, ingest: fakeIngest, ephemeral: true });
    keepCorpus(live.id);
    expect(listOrphans()).not.toContain(corpusInstanceDir(live.id));
    expect(reapOrphans()).not.toContain(corpusInstanceDir(live.id));
    expect(existsSync(corpusInstanceDir(live.id))).toBe(true);
  });
});
