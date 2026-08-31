/**
 * crossing-direction — which way a transfer runs, and what that costs.
 *
 * ── THE TWO DIRECTIONS COST DIFFERENTLY, AND ONLY ONE IS RESTRICTED ─────────────────────────────
 * A tiddler copied from a public bag into a more private one raises its confinement: the copy reaches
 * fewer readers than the original did. TW5's recipe stack runs on exactly this — a user takes a public
 * tiddler and keeps a shadowed copy they may alter — and federation gives every user a public shelf to
 * take from. That path stays cheap, because nothing leaves.
 *
 * A tiddler copied the other way RELAXES confinement: material held for few becomes material held for
 * many, and publication admits no return. Information-flow work calls the outward act declassification
 * and restricts it alone; the inward direction it permits freely.
 *
 * ── SO THE RESTRICTION SITS ON THE OUTWARD CROSSING ─────────────────────────────────────────────
 * Operator ruling: a user may copy and alter a public tiddler into a more private bag. Moving anything
 * from a private bag to a public one belongs to the kahu-cabal signers.
 *
 * This reads the DIRECTION from the two tiers and says what each side must answer. It holds no keys,
 * checks no quorum and reaches no bag — it names the cost, and the gate collects it.
 */
import { describe, it, expect } from "vitest";
import { crossingDirection } from "../src/crossing-direction.js";

describe("crossing-direction — inward runs free, outward answers to the cabal", () => {
  it("★ public → veil reads INWARD: the shadow copy every recipe stack depends on ★", () => {
    const d = crossingDirection({ from: "public", to: "veil" });
    expect(d.direction).toBe("inward");
    expect(d.needsCabal).toBe(false);
    expect(d.sourceGrade).toBe("read");
    expect(d.reading).toMatch(/shadow|fewer readers|raises/i);
  });

  it("★ veil → public reads OUTWARD and answers to the kahu cabal ★", () => {
    const d = crossingDirection({ from: "veil", to: "public" });
    expect(d.direction).toBe("outward");
    expect(d.needsCabal).toBe(true);
    expect(d.sourceGrade).toBe("admin");
    expect(d.reading).toMatch(/cabal|declassif|no return/i);
  });

  it("★ one tier to itself reads LATERAL and stays cheap ★", () => {
    const d = crossingDirection({ from: "personagroup", to: "personagroup" });
    expect(d.direction).toBe("lateral");
    expect(d.needsCabal).toBe(false);
    expect(d.sourceGrade).toBe("read");
  });

  it("★ EVERY step up the ladder reads outward, not the extremes alone ★", () => {
    // contract sits below public, and a grant from it still relaxes confinement.
    for (const [from, to] of [["veil", "personagroup"], ["personagroup", "contract"], ["contract", "public"]] as const) {
      expect(crossingDirection({ from, to }).needsCabal).toBe(true);
    }
  });

  it("★ EVERY step down the ladder runs free ★", () => {
    for (const [from, to] of [["public", "contract"], ["contract", "personagroup"], ["personagroup", "veil"]] as const) {
      const d = crossingDirection({ from, to });
      expect(d.needsCabal).toBe(false);
      expect(d.sourceGrade).toBe("read");
    }
  });

  it("★ an inward crossing still answers for the SOURCE — read, never nothing ★", () => {
    // Cheap differs from ungated: a caller reaching a bag it may not read stays a confused deputy
    // whichever way the copy runs.
    expect(crossingDirection({ from: "public", to: "veil" }).sourceGrade).toBe("read");
  });

  it("★ every reading names the direction and why it costs what it costs ★", () => {
    for (const [from, to] of [["public", "veil"], ["veil", "public"], ["veil", "veil"]] as const) {
      expect(crossingDirection({ from, to }).reading.length).toBeGreaterThan(50);
    }
  });
});
