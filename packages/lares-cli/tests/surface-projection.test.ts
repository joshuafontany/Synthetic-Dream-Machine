/**
 * surface-projection — one command table, many faces, and the signing hand that stays human.
 *
 * A second surface keeping a second catalogue drifts from the plane it claims to expose, and the drift stays
 * invisible until it bites: a verb an agent reaches and a human cannot, or the reverse. So every face reads
 * ONE declaration, held beside the handler.
 *
 * The arms that carry weight: every key-holding command drops from the EXECUTABLE view (an agent surface
 * built the ordinary way cannot reach a signing act) · the agent surface stays EMPTY until a hand declares
 * a verb onto it (a surface exposes what asked to be exposed) · and the whole CLI still projects, so the
 * declaration added no gate a human has to pass.
 */
import { describe, test, expect } from "vitest";
import { projectCommands } from "../src/bin/lares.js";

describe("the table projects onto surfaces it declares", () => {
  test("the CLI surface carries the whole command set — no human lost a verb to this", () => {
    const cli = projectCommands("cli");
    expect(cli.length).toBeGreaterThan(35);
    expect(cli.map((e) => e.name)).toContain("wake");
    expect(cli.map((e) => e.name)).toContain("surface");
  });

  // The default carries a RULE rather than a convenience: nothing reaches an agent until a hand declares it.
  test("★ a surface nobody declared projects EMPTY, never everything ★", () => {
    expect(projectCommands("agent")).toEqual([]);
    expect(projectCommands("wiki")).toEqual([]);
  });

  test("entries arrive sorted and shaped, so a consuming face renders without re-deriving", () => {
    const cli = projectCommands("cli");
    const names = cli.map((e) => e.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    for (const e of cli) {
      expect(typeof e.summary).toBe("string");
      expect(typeof e.signs).toBe("boolean");   // never undefined — a reader never infers the flag
    }
  });
});

describe("the signing hand stays the human's", () => {
  test("★ EVERY key-holding command drops from the executable view ★", () => {
    const all  = projectCommands("cli");
    const exec = projectCommands("cli", true);

    const signing = all.filter((e) => e.signs).map((e) => e.name);
    expect(signing.length).toBeGreaterThan(0);
    for (const name of signing) expect(exec.map((e) => e.name)).not.toContain(name);
    expect(exec.every((e) => e.signs === false)).toBe(true);
  });

  test("the acts that mint, sign, seal or stake are the ones marked", () => {
    const signing = new Set(projectCommands("cli").filter((e) => e.signs).map((e) => e.name));
    // each of these runs a key: founding, minting a face, staking standing, sealing an invite, quorum acts
    for (const name of ["init", "vault", "persona", "cabal", "edge", "nexus", "device-admit"]) {
      expect(signing.has(name)).toBe(true);
    }
    // and a read-only verb never claims to hold one
    for (const name of ["status", "act", "bag"]) {
      expect(signing.has(name)).toBe(false);
    }
  });

  test("the executable view stays a strict subset — filtering removes, never adds", () => {
    const all  = new Set(projectCommands("cli").map((e) => e.name));
    for (const e of projectCommands("cli", true)) expect(all.has(e.name)).toBe(true);
  });
});
