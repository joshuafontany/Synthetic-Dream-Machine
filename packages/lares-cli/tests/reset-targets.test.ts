/**
 * reset-targets — the wipe-list contract (`lares vessel clear`, scripted.ts).
 *
 * Two laws under test (GAP 1, regenesis scout 2026-07-01):
 *   1. the projection watermark dies WITH the store — a surviving synced-tree
 *      watermark makes the post-reset ingest read every carrier "unchanged",
 *      leaving the fresh docs empty, silently.
 *   2. identity NEVER appears in the wipe-list — the keypair survives every reset.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resetTargets } from "../src/commands/scripted.js";
import { larDataDir, larProjectionDir, larIdentityDir } from "../src/env.js";

let root: string;
let savedRoot: string | undefined;

beforeEach(() => {
  savedRoot = process.env["LAR_ROOT"];
  root = mkdtempSync(join(tmpdir(), "lares-reset-targets-"));
  process.env["LAR_ROOT"] = root;
});

afterEach(() => {
  if (savedRoot === undefined) delete process.env["LAR_ROOT"];
  else process.env["LAR_ROOT"] = savedRoot;
  rmSync(root, { recursive: true, force: true });
});

describe("resetTargets — the one wipe-list spelling", () => {
  test("wipes the vessel store AND the projection watermark together (GAP 1)", () => {
    const paths = resetTargets().map((t) => t.path);
    expect(paths).toContain(larDataDir());
    expect(paths).toContain(larProjectionDir());
  });

  test("store + projection + CAS dir wipe recursively; genesis artifacts wipe flat", () => {
    const byPath = new Map(resetTargets().map((t) => [t.path, t.recursive]));
    expect(byPath.get(larDataDir())).toBe(true);
    expect(byPath.get(larProjectionDir())).toBe(true);
    expect(byPath.get(join(root, "genesis", "cas"))).toBe(true);
    expect(byPath.get(join(root, "genesis", "island.bin"))).toBe(false);
  });

  test("identity NEVER rides the wipe-list (keys survive every reset)", () => {
    const identity = larIdentityDir();
    for (const t of resetTargets()) {
      expect(t.path).not.toBe(identity);
      expect(t.path.startsWith(identity + "/")).toBe(false);
    }
  });
});
