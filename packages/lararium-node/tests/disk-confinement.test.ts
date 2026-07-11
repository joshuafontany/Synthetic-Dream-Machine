/**
 * disk-confinement — the sovereign-island disk ward (bag-paths.confineMirrorWrite).
 *
 * Law (disk-projection#write-ward, operator ruling 2026-06-11): a mirror's
 * writes confine to its OWN bag subdir; the widened grant (allowBagsRootFiles)
 * MAY place files DIRECTLY in the root-bags-dir, but MUST NEVER escape the
 * bags dir or enter another bag's subdir. Cascade output = untrusted input.
 */

import { describe, test, expect } from "vitest";
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { confineMirrorWrite } from "../src/bag-paths.js";

const ROOT = "/srv/lar/bags/@lares";

describe("disk ward — own-subdir confinement (default)", () => {
  test("a path under the mirror root passes", () => {
    const r = confineMirrorWrite(ROOT, "ha.ka.ba/lares/api/lares/noosphere-boot.mem");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.path).toBe("/srv/lar/bags/@lares/ha.ka.ba/lares/api/lares/noosphere-boot.mem");
  });

  test("dot-dot traversal out of the root refuses", () => {
    const r = confineMirrorWrite(ROOT, "../escape.md");
    expect(r.ok).toBe(false);
  });

  test("deep traversal toward another bag refuses", () => {
    const r = confineMirrorWrite(ROOT, "../../@lararium/poison.md");
    expect(r.ok).toBe(false);
  });

  test("absolute paths refuse outright", () => {
    const r = confineMirrorWrite(ROOT, "/etc/passwd");
    expect(r.ok).toBe(false);
  });

  test("a sneaky mid-path dot-dot that stays inside passes; one that leaves refuses", () => {
    expect(confineMirrorWrite(ROOT, "api/../api/x.md").ok).toBe(true);
    expect(confineMirrorWrite(ROOT, "api/../../../@sdm/x.md").ok).toBe(false);
  });

  test("writing the mirror root itself refuses", () => {
    expect(confineMirrorWrite(ROOT, ".").ok).toBe(false);
  });
});

describe("disk ward — the widened grant (allowBagsRootFiles)", () => {
  test("a file DIRECTLY in the root-bags-dir passes with the grant", () => {
    const r = confineMirrorWrite(ROOT, "../README.md", true);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.path).toBe("/srv/lar/bags/README.md");
  });

  test("the same file refuses WITHOUT the grant", () => {
    expect(confineMirrorWrite(ROOT, "../../README.md", false).ok).toBe(false);
  });

  test("another bag's subdir refuses EVEN WITH the grant", () => {
    expect(confineMirrorWrite(ROOT, "../../@lararium/poison.md", true).ok).toBe(false);
    expect(confineMirrorWrite(ROOT, "../../@sdm/anything.md", true).ok).toBe(false);
  });

  test("escaping above the bags dir refuses EVEN WITH the grant", () => {
    expect(confineMirrorWrite(ROOT, "../../../outside.md", true).ok).toBe(false);
    expect(confineMirrorWrite(ROOT, "../../../../etc/cron.d/x", true).ok).toBe(false);
  });

  test("a NEW subdir under bags refuses (files directly in bags only — one level)", () => {
    expect(confineMirrorWrite(ROOT, "../../newdir/file.md", true).ok).toBe(false);
  });

  test("a mirror root without a bags ancestor leaves the grant inert", () => {
    expect(confineMirrorWrite("/srv/other/place", "../up.md", true).ok).toBe(false);
  });
});

describe("disk ward — refusal signal (the alert chain's first link)", () => {
  test("a refused flush fires onRefusal with bag, uri, and reason", async () => {
    const { LarDiskProjector } = await import("../src/disk-projector.js");
    const refusals: Array<{ bagId: string; uri: string; reason: string }> = [];
    const projector = new LarDiskProjector({
      mirrors: [{ bagId: "@lares", mirrorRoot: "/srv/lar/bags/@lares", toRelPath: () => "../@sdm/poison.md" }],
      renderFn: async () => "never-rendered",
      debounceMs: 1,
      onRefusal: (info) => refusals.push(info),
    });
    await (projector as unknown as { flush: (b: string, u: string) => Promise<void> })
      .flush("@lares", "lar:///ha.ka.ba/lares/x");
    expect(refusals).toHaveLength(1);
    expect(refusals[0]?.bagId).toBe("@lares");
    expect(refusals[0]?.reason).toMatch(/escapes mirror root/);
  });
});

describe("disk ward — cross-mirror stale-unlink guards on PATH, not bag", () => {
  test("a co-rooted sibling mirror never unlinks the file this flush just wrote", async () => {
    const { LarDiskProjector } = await import("../src/disk-projector.js");
    const root = mkdtempSync(join(tmpdir(), "lar-comirror-"));
    try {
      // Two mirrors, DIFFERENT bagId, SAME mirrorRoot, SAME path strategy —
      // so both resolve this URI to the identical file. Pre-fix, the second
      // mirror's stale-unlink deleted the file the first mirror just rendered
      // (the guard checked bagId, not path); post-fix the path guard skips it.
      const rel = "ha.ka.ba/bags/@x/note.md";
      const projector = new LarDiskProjector({
        mirrors: [
          { bagId: "@a", mirrorRoot: root, toRelPath: () => rel },
          { bagId: "@b", mirrorRoot: root, toRelPath: () => rel },
        ],
        renderFn: async () => "the carrier body",
        debounceMs: 1,
      });
      await (projector as unknown as { flush: (b: string, u: string) => Promise<void> })
        .flush("@a", "lar:///ha.ka.ba/bags/@x/note");
      expect(existsSync(join(root, rel))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("disk ward — a working edit SHADOWS its canon copy, never deletes it", () => {
  test("a carrier held in BOTH working and canon keeps both files (the boot-seed-deletion cure)", async () => {
    const { LarDiskProjector } = await import("../src/disk-projector.js");
    const root = mkdtempSync(join(tmpdir(), "lar-shadow-"));
    try {
      const uri        = "lar:///ha.ka.ba/lares/api/lares/noosphere-boot";
      const canonRel   = "bags/@lares/ha.ka.ba/lares/api/lares/noosphere-boot.mem";
      const workingRel = "wikis/@lares/ha.ka.ba/lares/api/lares/noosphere-boot.mem";
      const CANON   = "lar:///ha.ka.ba/bags/@lares";
      const WORKING = "lar:///ha.ka.ba/wikis/@lares/working";
      // The canon file — the read-only boot-seed source — sits on disk.
      mkdirSync(dirname(join(root, canonRel)), { recursive: true });
      writeFileSync(join(root, canonRel), "the boot seed", "utf-8");

      const projector = new LarDiskProjector({
        mirrors: [
          { bagId: CANON,   mirrorRoot: root, toRelPath: (u) => (u === uri ? canonRel   : null) },
          { bagId: WORKING, mirrorRoot: root, toRelPath: (u) => (u === uri ? workingRel : null) },
        ],
        renderFn: async () => "the boot seed",
        // The carrier lives in BOTH bags — a working edit shadowing its canon copy.
        bagsHolding: async () => [WORKING, CANON],
        debounceMs: 1,
      });

      // LOAD into working → flush the working owner (as a --to working ingest does).
      await (projector as unknown as { flush: (b: string, u: string) => Promise<void> }).flush(WORKING, uri);

      expect(existsSync(join(root, workingRel)), "working projection not written").toBe(true);
      expect(existsSync(join(root, canonRel)), "canon file deleted by a working shadow-load").toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
