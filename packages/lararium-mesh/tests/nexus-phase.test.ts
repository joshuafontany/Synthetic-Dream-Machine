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
    const p = nexusPhase({ seatedKeys: 1, contractedOperators: 1 });
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

describe("nexus-phase — the OTHER half of the relation, read from this vessel's own consent", () => {
  // ── WHY A JOINING OPERATOR READ `seed` FOREVER ────────────────────────────────────────────────
  // `contractedOperators` counts operators THIS vessel admitted onto its own members board, which is
  // an immune surface and rightly local. A joining operator admits nobody, so she counted zero and
  // read `seed` after a completed crossing — while the founder read `isNexus`.
  //
  // A relation has two sides and each holds its own evidence. The founder's is the admit on her board.
  // The joiner's is HER OWN SIGNED CONSENT: she bound a contract-in to a charter epoch, and that is a
  // fact about her vessel that no partner's document is needed to read. Canon: "a second OPERATOR is
  // the first relation, and a Nexus IS the relation"; a relation legible from one side only is not one.

  it("★ a vessel that CONTRACTED IN reads the Nexus, though it admitted nobody ★", () => {
    const p = nexusPhase({ seatedKeys: 1, contractedOperators: 0, contractedInto: true });
    expect(p.isNexus).toBe(true);
    expect(p.phase).toBe("multisig");
    expect(p.reading).toMatch(/contracted in|consent|joined/i);
  });

  it("★ and it never claims to know the roster — one side sees its own relation only ★", () => {
    const p = nexusPhase({ seatedKeys: 1, contractedOperators: 0, contractedInto: true });
    // Counting the Nexus's operators from here would fabricate: a joiner cannot see who else joined.
    expect(p.reading).toMatch(/cannot|only|its own|this vessel/i);
    expect(p.reading).not.toMatch(/\b2 contracted operators\b/);
  });

  it("★ the founder's reading is unchanged — she admitted one, and that is one relation ★", () => {
    const p = nexusPhase({ seatedKeys: 1, contractedOperators: 1, contractedInto: false });
    expect(p.phase).toBe("multisig");
    expect(p.isNexus).toBe(true);
  });

  it("★ relations ADD — a vessel that joined one Nexus and admitted another stands at quorum ★", () => {
    expect(nexusPhase({ seatedKeys: 3, contractedOperators: 1, contractedInto: true }).phase).toBe("quorum");
  });

  it("★ a lone seed is unmoved — no admit, no consent, no relation ★", () => {
    const p = nexusPhase({ seatedKeys: 3, contractedOperators: 0, contractedInto: false });
    expect(p.phase).toBe("seed");
    expect(p.isNexus).toBe(false);
  });

  it("★ the flag is OPTIONAL — an omitted consent reads exactly as it did ★", () => {
    expect(nexusPhase({ seatedKeys: 3, contractedOperators: 0 }).phase).toBe("seed");
    expect(nexusPhase({ seatedKeys: 1, contractedOperators: 1 }).phase).toBe("multisig");
  });
});

describe("nexus-phase — the quorum seed: two operators, four personas", () => {
  // ── THE SHAPE A QUORUM STARTS AT (operator ruling) ────────────────────────────────────────────
  // A quorum runs k-of-n over PERSONAS, and the ladder's middle rung asks a different question from
  // its top one. A second operator contracting in makes the GROUP root rather than the founding key —
  // that is multisig, and it arrives on the relation alone.
  //
  // A quorum wants enough chairs for k-of-n to mean something ACROSS operators: three personas seated
  // by the founder plus one carried in by the partner. Three chairs from one vault stay "three faces
  // of one operator"; the fourth arrives with a hand that can refuse, and only then does a threshold
  // describe a check rather than a formality.
  //
  // Both sides count the same four. The founder counts her seated chairs plus the partner she
  // admitted; the partner counts the roster she holds plus the consent she gave. Neither counts a
  // roster of the Nexus — each counts what it can see, and here the two happen to agree.

  it("★ THREE seated chairs plus ONE contracted partner reads QUORUM ★", () => {
    const p = nexusPhase({ seatedKeys: 3, contractedOperators: 1 });
    expect(p.phase).toBe("quorum");
    expect(p.isNexus).toBe(true);
  });

  it("★ the JOINER reads the same quorum from her own side ★", () => {
    // She holds the founder's three-chair roster and gave one consent: the same four personas.
    const p = nexusPhase({ seatedKeys: 3, contractedOperators: 0, contractedInto: true });
    expect(p.phase).toBe("quorum");
  });

  it("★ too FEW personas stays multisig — the group is root, the threshold is not yet a check ★", () => {
    // One chair and one partner make a relation and two personas: root has moved to the group, and a
    // k-of-n over two hands describes no meaningful threshold.
    expect(nexusPhase({ seatedKeys: 1, contractedOperators: 1 }).phase).toBe("multisig");
    expect(nexusPhase({ seatedKeys: 2, contractedOperators: 1 }).phase).toBe("multisig");
  });

  it("★ chairs alone never reach quorum, however many — one vault holds them all ★", () => {
    // The load-bearing refusal: four chairs from one identity home stay four faces of one operator,
    // and no number of them supplies a hand that can refuse.
    for (const seated of [3, 4, 9]) {
      const p = nexusPhase({ seatedKeys: seated, contractedOperators: 0 });
      expect(p.phase).toBe("seed");
      expect(p.isNexus).toBe(false);
    }
  });

  it("★ a further partner keeps the quorum — relations add above the floor ★", () => {
    expect(nexusPhase({ seatedKeys: 3, contractedOperators: 2 }).phase).toBe("quorum");
  });

  it("★ the quorum reading names the four and says whose they are ★", () => {
    const p = nexusPhase({ seatedKeys: 3, contractedOperators: 1 });
    expect(p.reading).toMatch(/persona|chair/i);
    expect(p.reading).toMatch(/refuse|independent|across/i);
  });
});
