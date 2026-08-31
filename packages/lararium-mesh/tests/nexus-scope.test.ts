/**
 * nexus-scope — the leaf a face presents to ONE Nexus.
 *
 * ── WHY A SECOND SCOPE, RATHER THAN REUSING THE CIRCLE'S ────────────────────────────────────────
 * Canon states the pattern: "the name DERIVES from the compartment's own material. Each plane answers
 * to a domain-separated MAC over that PersonaGroup's own doc id." Two levels already run that way, and
 * the persona tree keeps them apart on purpose — the circle domain sits "distinct from `circle-scope`,
 * so the two levels can never derive into each other".
 *
 * A circle names a human's own compartment. A Nexus names an island several operators share, and it
 * carries its own identifier — the genesis epoch AID, content-addressed over the seated key-set. Two
 * different compartments answering to one MAC domain would let a leaf derived for a circle collide
 * with a leaf derived for an island, which the separation exists to forbid.
 *
 * ── WHAT THE LEAF BUYS ──────────────────────────────────────────────────────────────────────────
 * A face presents a DIFFERENT key to each island it stamps into, so an observer reading two islands
 * finds no shared key. Rejoining one island returns the same leaf, so a stamp survives a re-stand.
 * Neither property reaches a bare Handle, which recognition keeps stable and which therefore links
 * every island it stands in.
 */
import { describe, it, expect } from "vitest";
import { nexusScopeIndex } from "../src/persona-identity.js";
import { circleScopeIndex } from "../src/persona-identity.js";

const AID_A = "epoch0-" + "a".repeat(64);
const AID_B = "epoch0-" + "b".repeat(64);

describe("nexus-scope — one leaf per island, and none of them meet", () => {
  it("★ one island yields one index, however often it gets asked ★", () => {
    expect(nexusScopeIndex(AID_A)).toBe(nexusScopeIndex(AID_A));
  });

  it("★ two islands yield different indices — an observer reads no shared key ★", () => {
    expect(nexusScopeIndex(AID_A)).not.toBe(nexusScopeIndex(AID_B));
  });

  it("★ the NEXUS domain never derives into the CIRCLE domain ★", () => {
    // The separation canon builds on purpose: a leaf for a compartment must not collide with a leaf
    // for an island, so the same material under two domains yields two indices.
    expect(nexusScopeIndex(AID_A)).not.toBe(circleScopeIndex(AID_A));
  });

  it("★ the index lands inside the raw hardened range ★", () => {
    for (const aid of [AID_A, AID_B, "epoch0-" + "9".repeat(64)]) {
      const i = nexusScopeIndex(aid);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(0x80000000);
    }
  });

  it("★ case in the AID never splits one island into two leaves ★", () => {
    expect(nexusScopeIndex(AID_A.toUpperCase())).toBe(nexusScopeIndex(AID_A));
  });
});
