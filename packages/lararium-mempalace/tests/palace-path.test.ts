import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalPalacePath, defaultPalacePath, resolvePalacePath } from "../src/palace-path.js";

describe("palace-path canonicalization (the daemon pile-up cure)", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "palace-canon-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("collapses `.` / `..` / trailing-slash spellings of one existing palace to ONE", () => {
    const palace = join(root, "palace");
    mkdirSync(palace, { recursive: true });

    const spellings = [
      palace,
      palace + "/",
      join(root, ".", "palace"),
      join(root, "sub", "..", "palace"),
    ];
    const canon = spellings.map(canonicalPalacePath);
    // Every spelling resolves to the SAME single canonical path.
    expect(new Set(canon).size).toBe(1);
    expect(canon[0]).toBe(palace);
  });

  it("resolves a SYMLINKED spelling to the same physical palace (the symlink trap)", () => {
    const palace = join(root, "real-palace");
    mkdirSync(palace, { recursive: true });
    const link = join(root, "linked-palace");
    symlinkSync(palace, link, "dir");

    // Two genuinely-different spellings (one through a symlink) of ONE physical dir.
    expect(canonicalPalacePath(link)).toBe(canonicalPalacePath(palace));
  });

  it("falls back to the resolved absolute path when the palace does not yet exist (first boot)", () => {
    const notYet = join(root, "sub", "..", "palace-not-created");
    // realpath would throw ENOENT — we still get a stable, normalized absolute spelling.
    expect(canonicalPalacePath(notYet)).toBe(join(root, "palace-not-created"));
  });

  it("defaultPalacePath honors MEMPALACE_PALACE_PATH, else the upstream-default ~/.mempalace/palace", () => {
    const prevMp = process.env["MEMPALACE_PALACE_PATH"];
    const prevData = process.env["XDG_DATA_HOME"];
    const prevRoot = process.env["LAR_ROOT"];
    const prevHome = process.env["HOME"];
    const prevProfile = process.env["USERPROFILE"];
    try {
      delete process.env["LAR_ROOT"];
      // Hermetic home: point HOME at a temp dir so the resolution is independent of the developer's
      // real home (which may hold a live palace).
      process.env["HOME"] = join(root, "home");
      process.env["USERPROFILE"] = join(root, "home");
      // env override is taken AS the chroma dir, verbatim.
      process.env["MEMPALACE_PALACE_PATH"] = join(root, "custom");
      expect(defaultPalacePath()).toBe(join(root, "custom"));

      // No override → the upstream-default parent. Per the content-cap-home ruling the content cap stays
      // EXTERNAL at `~/.mempalace` (never strangled into the XDG tree), so the chroma dir is
      // `~/.mempalace/palace` regardless of XDG_DATA_HOME.
      delete process.env["MEMPALACE_PALACE_PATH"];
      process.env["XDG_DATA_HOME"] = join(root, "xdg-data");
      expect(defaultPalacePath()).toBe(
        join(root, "home", ".mempalace", "palace"),
      );
    } finally {
      if (prevMp === undefined) delete process.env["MEMPALACE_PALACE_PATH"]; else process.env["MEMPALACE_PALACE_PATH"] = prevMp;
      if (prevData === undefined) delete process.env["XDG_DATA_HOME"]; else process.env["XDG_DATA_HOME"] = prevData;
      if (prevRoot === undefined) delete process.env["LAR_ROOT"]; else process.env["LAR_ROOT"] = prevRoot;
      if (prevHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = prevHome;
      if (prevProfile === undefined) delete process.env["USERPROFILE"]; else process.env["USERPROFILE"] = prevProfile;
    }
  });

  it("resolvePalacePath is idempotent (canonical of canonical = canonical)", () => {
    const prev = process.env["MEMPALACE_PALACE_PATH"];
    try {
      const palace = join(root, "palace");
      mkdirSync(palace, { recursive: true });
      process.env["MEMPALACE_PALACE_PATH"] = palace + "/";
      const once = resolvePalacePath();
      expect(canonicalPalacePath(once)).toBe(once);
      expect(once).toBe(palace);
    } finally {
      if (prev === undefined) delete process.env["MEMPALACE_PALACE_PATH"];
      else process.env["MEMPALACE_PALACE_PATH"] = prev;
    }
  });
});
