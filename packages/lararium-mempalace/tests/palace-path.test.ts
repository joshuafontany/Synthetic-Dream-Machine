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

  it("defaultPalacePath honors MEMPALACE_PALACE_PATH, else ~/.mempalace/palace", () => {
    const prev = process.env["MEMPALACE_PALACE_PATH"];
    try {
      process.env["MEMPALACE_PALACE_PATH"] = join(root, "custom");
      expect(defaultPalacePath()).toBe(join(root, "custom"));
      delete process.env["MEMPALACE_PALACE_PATH"];
      expect(defaultPalacePath()).toMatch(/[\\/]\.mempalace[\\/]palace$/);
    } finally {
      if (prev === undefined) delete process.env["MEMPALACE_PALACE_PATH"];
      else process.env["MEMPALACE_PALACE_PATH"] = prev;
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
