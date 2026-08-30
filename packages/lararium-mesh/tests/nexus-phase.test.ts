/**
 * nexus-phase — a Nexus begins at a RELATION, and says so before one exists.
 *
 * ── THE KEEPER LADDER, AS CANON WRITES IT ───────────────────────────────────────────────────────
 * `genesis-doc`: "founder (n=1, genesis) -> founder-multisig (a 2nd keeper contracts in -> write
 * delegates to a GROUP; the group, not the original key, becomes root) -> k-of-n quorum". Phase 2 is
 * reached by a SECOND KEEPER CONTRACTING IN, never by the founder seating more of their own faces.
 *
 * ── WHY THE COUNT CANNOT DECIDE THE PHASE ───────────────────────────────────────────────────────
 * A founding seat draws its keys from ONE vault — `listPersonaRoots` reads this vessel's own identity
 * home and can read nothing else. So three seated chairs at genesis are three faces of one operator:
 * "cryptographically real and not real as a check — no independent hand can refuse" (first-realm-arc),
 * and the same meme instructs that this be RECORDED as the honest founding state rather than allowed
 * to read as a distributed quorum.
 *
 * Under relationship-as-identity the reason is sharper than a warning about optics: with one operator
 * there is one relationship — the operator with themselves — however many keys they hold. The second
 * OPERATOR is the first relation, and the relation is what a Nexus is.
 *
 * So this reads foreign contracts, and treats seat count as saying nothing about phase at all.
 */
import { describe, it, expect } from "vitest";
import { nexusPhase } from "../src/nexus-phase.js";

describe("nexus-phase — the ladder, read from relations", () => {
  it("★ one founder, one chair — a SEED, and not yet a Nexus ★", () => {
    const p = nexusPhase({ seatedKeys: 1, contractedOperators: 0 });
    expect(p.phase).toBe("seed");
    expect(p.isNexus).toBe(false);
    expect(p.reading).toMatch(/seed|not yet/i);
  });

  it("★ THREE chairs and no second operator is STILL a seed — the count decides nothing ★", () => {
    // The correction that matters. Every seated key at genesis comes from one vault, so a roster of
    // three is one operator wearing three faces, and no independent hand can refuse anything.
    const p = nexusPhase({ seatedKeys: 3, contractedOperators: 0 });
    expect(p.phase).toBe("seed");
    expect(p.isNexus).toBe(false);
    expect(p.reading).toMatch(/one operator|own vault|no second/i);
  });

  it("★ a second operator contracts in — THE NEXUS BEGINS ★", () => {
    const p = nexusPhase({ seatedKeys: 3, contractedOperators: 1 });
    expect(p.phase).toBe("multisig");
    expect(p.isNexus).toBe(true);
    // Canon: the GROUP becomes root, not the original key.
    expect(p.reading).toMatch(/group|relation/i);
  });

  it("★ a Nexus can begin with a single seated chair — the relation is the threshold ★", () => {
    // Phase 2 is reached by a keeper contracting in. Nothing in the ladder requires the founder to
    // have seated three of anything first, and requiring it would forbid the ladder's own first step.
    expect(nexusPhase({ seatedKeys: 1, contractedOperators: 1 }).isNexus).toBe(true);
  });

  it("several contracted operators read as the quorum phase", () => {
    expect(nexusPhase({ seatedKeys: 3, contractedOperators: 3 }).phase).toBe("quorum");
  });

  it("★ a seed with NO chair at all is still honestly a seed, never an error ★", () => {
    const p = nexusPhase({ seatedKeys: 0, contractedOperators: 0 });
    expect(p.phase).toBe("seed");
    expect(p.isNexus).toBe(false);
  });

  it("★ every phase says what it is, so nobody reads a seed as a Nexus ★", () => {
    for (const a of [{ seatedKeys: 0, contractedOperators: 0 }, { seatedKeys: 3, contractedOperators: 0 },
                     { seatedKeys: 3, contractedOperators: 1 }, { seatedKeys: 3, contractedOperators: 4 }]) {
      expect(nexusPhase(a).reading.length).toBeGreaterThan(30);
    }
  });
});
