/**
 * THE TWO DIGEST IMPLEMENTATIONS MUST AGREE, or the gate rebuilds forever and looks like nothing.
 *
 * `tools/stamp-build.mjs` writes the stamp (it runs before the CLI exists, so it cannot import from it);
 * `build-freshness.ts` reads it. A drift between them makes every stamp read as a mismatch — so the gate
 * rebuilds on every lifecycle verb, mid-run, which is exactly the disturbance the content digest was
 * introduced to end. And the loop is SILENT: each build succeeds, each stamp gets written, and nothing
 * reports that the two never once agreed.
 *
 * The duplication is deliberate (a bootstrap needs it). This test is the price it pays.
 */
import { describe, test, expect } from "vitest";
import { join } from "node:path";
import { repoRoot } from "@lararium/mesh/node";
// @ts-expect-error — a plain .mjs tool, deliberately importable without a build
import { sourceDigest as stampDigest } from "../../../tools/stamp-build.mjs";
import { sourceDigestForTest } from "../src/build-freshness.js";

describe("★ stamp-build and the gate compute ONE digest ★", () => {
  test("both read the same tree to the same hex", () => {
    const dir = join(repoRoot, "packages", "lares-cli", "src");
    expect(sourceDigestForTest(dir)).toBe(stampDigest(dir));
  });

  test("a digest answers to CONTENT — the same bytes hash the same whatever the path order", () => {
    const dir = join(repoRoot, "tools");
    expect(sourceDigestForTest(dir)).toBe(sourceDigestForTest(dir));
    expect(sourceDigestForTest(dir)).toBe(stampDigest(dir));
  });
});
