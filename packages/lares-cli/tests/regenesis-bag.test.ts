/**
 * regenesis --bag — the L4 single-bag scalpel's guard + preview paths.
 *
 * These vectors exercise the routes that resolve BEFORE any daemon gesture: the
 * holding lookup (unknown → exit 3), the protected-plane refusal (@daemon &c → exit 2),
 * and the preview (no --force → the scoped plan, nothing enacted). The enact path
 * (CLEAR → watermark → re-seed) rides a live vessel and is proven by the ephemeral
 * end-to-end run, not here.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdRegenesisBag } from "../src/commands/regenesis.js";
import type { ParsedArgs } from "../src/parse-args.js";

let root: string;
const priorRoot = process.env["LAR_ROOT"];

function args(bag: string, flags: Record<string, boolean> = {}): ParsedArgs {
  return { command: "regenesis", positional: [], options: { bag }, flags };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "lr-regen-bag-"));
  process.env["LAR_ROOT"] = root;
  mkdirSync(join(root, "bags", "@sdm"), { recursive: true });
  mkdirSync(join(root, "bags", "@elyncia"), { recursive: true });
  writeFileSync(join(root, "bags", "@sdm", "note.md"), "# a note\n");
});

afterEach(() => {
  if (priorRoot === undefined) delete process.env["LAR_ROOT"]; else process.env["LAR_ROOT"] = priorRoot;
  rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("regenesis --bag — guards resolve before any daemon gesture", () => {
  test("an unknown bag exits 3 and lists the known holdings", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = await cmdRegenesisBag(args("@nope"), "@nope");
    expect(code).toBe(3);
    expect(err.mock.calls.flat().join(" ")).toMatch(/@elyncia.*@sdm|@sdm.*@elyncia/);
  });

  test("a protected social/registry bag is REFUSED (exit 2) — the boot-contract fence", async () => {
    // @daemon is not even under bags/, so name-lookup alone would 404 it; assert the
    // explicit refusal fires when the name IS forced past discovery.
    mkdirSync(join(root, "bags", "@daemon"), { recursive: true });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = await cmdRegenesisBag(args("@daemon"), "@daemon");
    expect(code).toBe(2);
    expect(err.mock.calls.flat().join(" ")).toMatch(/social\/registry plane|boot contract/i);
  });

  test("preview (no --force) prints the 3 scoped steps + the UNTOUCHED set, enacts nothing", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await cmdRegenesisBag(args("@sdm"), "@sdm");
    expect(code).toBe(0);
    const out = log.mock.calls.flat().join("\n");
    expect(out).toMatch(/L4 1\/3.*CLEAR/);
    expect(out).toMatch(/L4 2\/3.*watermark/);
    expect(out).toMatch(/L4 3\/3.*re-seed @sdm/);
    // the sibling is named as UNTOUCHED, @daemon + genesis + mempalace preserved
    expect(out).toMatch(/UNTOUCHED:.*@daemon/);
    expect(out).toMatch(/@elyncia/);
  });

  test("a full bags/@slug URI resolves the same holding as the bare @slug", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await cmdRegenesisBag(args("lar:///ha.ka.ba/bags/@sdm"), "lar:///ha.ka.ba/bags/@sdm");
    expect(code).toBe(0);
    expect(log.mock.calls.flat().join("\n")).toMatch(/re-seed @sdm/);
  });
});
