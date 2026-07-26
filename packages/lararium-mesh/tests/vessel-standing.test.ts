/**
 * vessel-standing — the Herm's facelessness is a LAW, and every other ceiling is an operator's dial.
 *
 * The load-bearing arm: no argument, however large or however well-formed, raises a Herm above zero. A clamp
 * would invite the reading that a big enough number wins; nothing wins, because the class exists precisely to
 * keep human keys off a crossroads. The mirror arm: a torn dial must NOT fall to zero on a hearth or leaf —
 * locking a human out of their own faces is a lockout, not a safety property.
 *
 * Canon: lar:///ha.ka.ba/lararium/mesh/identity-classes
 */
import { describe, test, expect } from "vitest";
import {
  personaSlotCeiling, permitsPersonaSlot, refuseSlot, requiredFoundingMode,
  DEFAULT_PERSONA_SLOT_CEILING,
} from "../src/vessel-standing.js";
import { HANDLE_INDEX_CEILING } from "../src/persona-vault.js";

describe("the Herm holds no face, and no argument changes that", () => {
  test("★ every declared ceiling — absent, small, huge, torn — still reads 0 for a herm ★", () => {
    for (const declared of [undefined, 1, 8, 1_000_000, HANDLE_INDEX_CEILING, 0, -5, 1.5, Number.NaN]) {
      expect(personaSlotCeiling("herm", declared as number | undefined)).toBe(0);
    }
    expect(permitsPersonaSlot("herm", 0, 1_000_000)).toBe(false);   // not even slot zero
  });

  test("its refusal names the CLASS, never the ceiling — so nobody goes looking for a bigger number", () => {
    expect(refuseSlot("herm", 0)).toBe("faceless-by-class");
    expect(refuseSlot("herm", 0, 1_000_000)).toBe("faceless-by-class");
  });

  test("a herm MUST stand contracted — it cannot self-sign, having no root to sign with", () => {
    expect(requiredFoundingMode("herm")).toBe("contracted");
    // a hearth or leaf may do either: a fresh hearth self-stands, an admitted leaf stands contracted
    expect(requiredFoundingMode("hearth")).toBeNull();
    expect(requiredFoundingMode("leaf")).toBeNull();
  });
});

describe("every other class carries the operator's dial", () => {
  test("an undeclared vessel takes the operational default, not zero and not unbounded", () => {
    expect(personaSlotCeiling("hearth")).toBe(DEFAULT_PERSONA_SLOT_CEILING);
    expect(personaSlotCeiling("leaf")).toBe(DEFAULT_PERSONA_SLOT_CEILING);
  });

  test("the operator's turn is honoured, up to the derivation's own range", () => {
    expect(personaSlotCeiling("hearth", 64)).toBe(64);
    expect(personaSlotCeiling("leaf", 1)).toBe(1);
    expect(personaSlotCeiling("hearth", HANDLE_INDEX_CEILING * 4)).toBe(HANDLE_INDEX_CEILING);
  });

  // A mis-typed config must never lock a human out of their own multitude. Falling to the default is the
  // recoverable failure; falling to zero would read as safety while being a lockout.
  test("a TORN dial falls to the default, never to zero", () => {
    for (const torn of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(personaSlotCeiling("hearth", torn)).toBe(DEFAULT_PERSONA_SLOT_CEILING);
    }
  });

  test("slots below the ceiling stand, at and above it refuse — and the refusal is RAISABLE", () => {
    expect(permitsPersonaSlot("hearth", 0, 3)).toBe(true);
    expect(permitsPersonaSlot("hearth", 2, 3)).toBe(true);
    expect(permitsPersonaSlot("hearth", 3, 3)).toBe(false);
    expect(refuseSlot("hearth", 3, 3)).toBe("past-ceiling");
    expect(refuseSlot("hearth", 3, 4)).toBeNull();          // the operator raised it; the slot stands
  });

  test("a malformed index refuses on any class", () => {
    for (const idx of [-1, 1.5, Number.NaN]) {
      expect(permitsPersonaSlot("hearth", idx, 8)).toBe(false);
    }
  });
});
