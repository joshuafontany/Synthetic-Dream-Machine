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
import { clearTargets } from "../src/commands/scripted.js";
import { larDataDir, larProjectionDir, larIdentityDir, larariumDataHome } from "../src/env.js";
import { larLibraryHome, memorySensoriumDir, meshSensoriumDir, memeticWikitextSensoriumDir } from "@lararium/node";

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

describe("clearTargets — the one wipe-list spelling", () => {
  test("wipes the vessel store AND the projection watermark together (GAP 1)", () => {
    const paths = clearTargets().map((t) => t.path);
    expect(paths).toContain(larDataDir());
    expect(paths).toContain(larProjectionDir());
  });

  test("store + projection + CAS dir wipe recursively; genesis artifacts wipe flat", () => {
    const byPath = new Map(clearTargets().map((t) => [t.path, t.recursive]));
    expect(byPath.get(larDataDir())).toBe(true);
    expect(byPath.get(larProjectionDir())).toBe(true);
    expect(byPath.get(join(root, "genesis", "cas"))).toBe(true);
    expect(byPath.get(join(root, "genesis", "island.bin"))).toBe(false);
  });

  test("★ NO wipe target reaches the SHRINE — the ruling's whole claim, held here ★", () => {
    // LARES PASS; THE LARARIUM ABIDES. The shelf and the sensoriums survive by standing in a house
    // this list cannot name, so the assertion runs both ways: no target sits inside the shrine, and
    // the shrine does not sit inside any target. A `--root` run isolates both homes, so the vectors
    // hold on the operator's tree for the same reason they hold here.
    const targets = clearTargets().map((t) => t.path);
    expect(targets.length).toBeGreaterThan(0);                       // the list RESOLVED
    expect(targets).toContain(larDataDir());                         // and it really is the wipe-list
    const abiding = [larariumDataHome(), larLibraryHome(), memorySensoriumDir(), meshSensoriumDir(), memeticWikitextSensoriumDir()];
    const under = (d: string, r: string) => d === r || d.startsWith(r.endsWith("/") ? r : r + "/");
    for (const t of targets) for (const a of abiding) {
      expect(under(a, t)).toBe(false);
      expect(under(t, a)).toBe(false);
    }
  });

  test("identity NEVER rides the wipe-list (keys survive every reset)", () => {
    const identity = larIdentityDir();
    for (const t of clearTargets()) {
      expect(t.path).not.toBe(identity);
      expect(t.path.startsWith(identity + "/")).toBe(false);
    }
  });
});
