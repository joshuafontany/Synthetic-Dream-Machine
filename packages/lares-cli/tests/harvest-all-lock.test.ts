import { afterEach, describe, expect, test } from "vitest";
import { rmSync } from "node:fs";

import { acquireHarvestAllLock } from "../src/commands/harvest.js";

const priorRoot = process.env["LAR_ROOT"];
let testRoot: string | undefined;
afterEach(() => {
  if (priorRoot === undefined) delete process.env["LAR_ROOT"];
  else process.env["LAR_ROOT"] = priorRoot;
  if (testRoot) rmSync(testRoot, { recursive: true, force: true });
  testRoot = undefined;
});

describe("harvest --all lease", () => {
  test("refuses a concurrent owner and releases its bulk lane lease", () => {
    testRoot = `/tmp/lares-harvest-lock-${process.pid}-${Date.now()}`;
    process.env["LAR_ROOT"] = testRoot;
    const release = acquireHarvestAllLock();
    try {
      expect(acquireHarvestAllLock).toThrow(/another `lares harvest --all` owns/);
    } finally {
      release();
    }
    const releaseAgain = acquireHarvestAllLock();
    releaseAgain();
  });
});
