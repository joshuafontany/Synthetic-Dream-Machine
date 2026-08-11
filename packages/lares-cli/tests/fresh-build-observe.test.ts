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
import { freshBuildGate, needsFreshBuild } from "../src/build-freshness.js";
import type { ParsedArgs } from "../src/parse-args.js";

const args = (flags: Record<string, boolean>, positional: string[] = []): ParsedArgs =>
  ({ command: "vessel", positional, flags, options: {} } as unknown as ParsedArgs);

describe("★ the observe cap never triggers a rebuild ★", () => {
  test("an observing wake passes the gate untouched, however stale the tree", () => {
    // null = "run the handler in-process": no build, no re-exec, nothing on disk disturbed.
    expect(freshBuildGate(["vessel", "stand", "--json"], args({ observe: true }, ["stand"]))).toBeNull();
  });

  test("the re-exec sentinel still ends the recursion", () => {
    expect(freshBuildGate(["vessel", "stand"], args({ "skip-build": true }, ["stand"]))).toBeNull();
  });

  test("standing REMAINS gated — the cap withholds the build, never the gate", () => {
    // The gate stays armed for the standing half. Exempting it would let a real founding run from stale
    // dist, which is the failure the gate was built for.
    expect(needsFreshBuild(args({}, ["stand"]))).toBe(true);
    expect(needsFreshBuild(args({}, ["found"]))).toBe(true);
  });

  test("★ membership is DERIVED, so a sub-door nobody thought about is gated by default ★", () => {
    // The roster this replaced had to be remembered on every surface change, and it drifted the moment
    // one arrived. Stating the EXCEPTIONS instead means the unsafe direction needs an argument.
    expect(needsFreshBuild(args({}, ["a-sub-door-invented-tomorrow"]))).toBe(true);
    expect(needsFreshBuild(args({}, ["read"]))).toBe(false);   // inspects, starts nothing
    expect(needsFreshBuild(args({}, ["stop"]))).toBe(false);   // port-control, loads no vessel logic
  });

  test("a verb outside the vessel door never reaches the gate at all", () => {
    const other = { command: "bag", positional: ["stats"], flags: {}, options: {} } as unknown as ParsedArgs;
    expect(needsFreshBuild(other)).toBe(false);
  });
});
