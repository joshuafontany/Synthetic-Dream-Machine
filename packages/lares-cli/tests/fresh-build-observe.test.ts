/**
 * A READING NEVER TRIGGERS A BUILD — and the reason runs deeper than tidiness.
 *
 * The fresh-build gate exists because founding or booting from a stale dist runs superseded logic against
 * real identity. A caller holding the observe cap alone founds nothing and boots nothing, so that danger
 * cannot arise — and the rebuild is far from free to attempt anyway: `pnpm -r build` CLEANS dist first,
 * so a probe that triggered one deletes the modules out from under any daemon already running.
 *
 * Measured, when a rehearsal's liveness check reached for `wake`: the gate fired, the build cleaned dist,
 * and the running node lost `node-host.js` mid-flight. The probe killed what it was measuring, then
 * reported it dead. A reading that disturbs what it reads measures its own footprint.
 */
import { describe, test, expect } from "vitest";
import { freshBuildGate, FRESH_BUILD_COMMANDS } from "../src/build-freshness.js";
import type { ParsedArgs } from "../src/parse-args.js";

const args = (flags: Record<string, boolean>): ParsedArgs =>
  ({ positional: [], flags, options: {} } as unknown as ParsedArgs);

describe("★ the observe cap never triggers a rebuild ★", () => {
  test("an observing wake passes the gate untouched, however stale the tree", () => {
    // null = "run the handler in-process": no build, no re-exec, nothing on disk disturbed.
    expect(freshBuildGate(["wake", "--json"], args({ observe: true }))).toBeNull();
  });

  test("the re-exec sentinel still ends the recursion", () => {
    expect(freshBuildGate(["wake"], args({ "skip-build": true }))).toBeNull();
  });

  test("wake REMAINS a fresh-build command — the cap withholds the build, never the gate", () => {
    // The gate stays armed for the standing half. Dropping `wake` from the set would let a real founding
    // run from stale dist, which is the failure the gate was built for.
    expect(FRESH_BUILD_COMMANDS.has("wake")).toBe(true);
    expect(FRESH_BUILD_COMMANDS.has("init")).toBe(true);
  });
});
