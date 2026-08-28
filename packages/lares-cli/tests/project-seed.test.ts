/**
 * project-seed — the boot seed's markdown twin is a projection, and one implementation both writes
 * and reads it.
 *
 * THE DRIFT NO OTHER INSTRUMENT SEES. The seed stands in two files and two dialects. Both parse,
 * both round-trip, both read correct while disagreeing, because every other witness here compares a
 * file against its own reflection. Only a transpose across the pair can tell.
 *
 * WHY THE RENDER AND THE READING SHARE A DOOR. A checker carrying its own transposer drifts from the
 * renderer, and the pair then gets held to a projection nothing produces. `--check` and the write
 * path run the same `transposeSeed`, so a green reading means the twin on disk is the twin this
 * command would write.
 */
import { describe, test, expect, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(new URL("../../..", import.meta.url).pathname);
const BIN  = path.join(REPO, "packages/lares-cli/dist/src/bin/lares.js");
const MD   = path.join(REPO, "noosphere-boot.md");
const ORIGINAL = readFileSync(MD, "utf8");

function seed(...flags: string[]): { out: string; code: number } {
  try {
    return { out: execFileSync("node", [BIN, "carrier", "project-seed", ...flags], { encoding: "utf8", cwd: REPO }), code: 0 };
  } catch (e) {
    const err = e as { stdout?: string; status?: number };
    return { out: err.stdout ?? "", code: err.status ?? 1 };
  }
}

// The twin is a tracked file, so every test that moves it puts it back — a failing run must not
// leave the seed drifted for the next reader.
afterAll(() => writeFileSync(MD, ORIGINAL));

describe("carrier project-seed — the twin renders from the carrier", () => {
  test("the twin on disk reads as the carrier transposed", () => {
    const { out, code } = seed("--check");
    expect(out).toMatch(/reads the carrier, transposed/);
    expect(code).toBe(0);
  });

  test("a hand edit to the twin reads as drift and fails the gate", () => {
    writeFileSync(MD, ORIGINAL.replace("**Glyph game rules:**", "**Glyph game rules:** DRIFT"));
    const { out, code } = seed("--check");
    expect(code).toBe(1);
    expect(out).toMatch(/left the carrier/);
    // The reading names the line and both sides, so the repair needs no second command to locate.
    expect(out).toMatch(/carrier -> /);
    expect(out).toMatch(/md      -> /);
  });

  test("--check writes nothing", () => {
    const drifted = ORIGINAL.replace("**Glyph game rules:**", "**Glyph game rules:** DRIFT");
    writeFileSync(MD, drifted);
    seed("--check");
    expect(readFileSync(MD, "utf8")).toBe(drifted);
  });

  test("rendering restores the twin to the bytes the carrier projects", () => {
    writeFileSync(MD, ORIGINAL.replace("**Glyph game rules:**", "**Glyph game rules:** DRIFT"));
    expect(seed().code).toBe(0);
    expect(readFileSync(MD, "utf8")).toBe(ORIGINAL);
  });

  test("rendering an undrifted twin changes nothing — the projection is idempotent", () => {
    writeFileSync(MD, ORIGINAL);
    seed();
    expect(readFileSync(MD, "utf8")).toBe(ORIGINAL);
  });
});
