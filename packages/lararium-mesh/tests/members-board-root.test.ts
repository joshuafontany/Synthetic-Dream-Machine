/**
 * members-board-root — WHOSE members board a vessel reads, and why the default is not the answer.
 *
 * ── THE DEFECT THIS CLOSES, MEASURED ────────────────────────────────────────────────────────────
 * Walked in docker (`mesh-scenarios.sh realm-crossing`): after a completed crossing, A reads
 * `isNexus:true` while B still reads `{"phase":"seed"}`. Canon holds that "a second OPERATOR is the
 * first relation, and a Nexus IS the relation" — and a relation with one side is not one.
 *
 * The cause is an address. The members board is a SHARED doc at `carriageDocUrl(<key>)`, and the
 * reader took that key from `loadVesselVerifyingKey` — this vessel's OWN key — under a variable
 * named `nexusPubkey`. So A's board and B's board are different documents, and B never reads the
 * board she was admitted onto.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────────────────────────
 * A charter names the board it governs. A vessel reading a charter it FOUNDED reads its own board,
 * and that is the same address as before. A vessel reading a charter it IMPORTED reads the founder's
 * board, because that is where the relation it consented to is written.
 *
 * The absence stays honest rather than defaulting: a charter with no root recorded reads the vessel's
 * own board AND says so, so a caller can tell "my board" from "the Nexus's board" instead of reading
 * a local fact under a Nexus-scoped name.
 */
import { describe, it, expect } from "vitest";
import { membersBoardRoot } from "../src/members-board-root.js";

const OWN = "a".repeat(64);
const FOUNDER = "b".repeat(64);

describe("members-board-root — a charter names the board it governs", () => {
  it("★ a charter carrying a root reads THAT board — the founder's, not this vessel's ★", () => {
    const r = membersBoardRoot({ charterRoot: FOUNDER, ownVesselKey: OWN });
    expect(r.root).toBe(FOUNDER);
    expect(r.own).toBe(false);
    expect(r.reading).toMatch(/founder|charter|contracted into/i);
  });

  it("★ a founder reading her OWN charter reads her own board, unchanged ★", () => {
    const r = membersBoardRoot({ charterRoot: OWN, ownVesselKey: OWN });
    expect(r.root).toBe(OWN);
    expect(r.own).toBe(true);
  });

  it("★ no root recorded falls back to this vessel AND says so ★", () => {
    // Backward compatibility with charters seated before the root was carried: the address is exactly
    // what it was, and the reading names the gap rather than presenting a local fact as the Nexus's.
    for (const absent of [undefined, null, ""]) {
      const r = membersBoardRoot({ charterRoot: absent, ownVesselKey: OWN });
      expect(r.root).toBe(OWN);
      expect(r.own).toBe(true);
      expect(r.reading).toMatch(/no root|this vessel|own board/i);
    }
  });

  it("★ key comparison ignores case — hex from two sources need not agree on it ★", () => {
    expect(membersBoardRoot({ charterRoot: OWN.toUpperCase(), ownVesselKey: OWN }).own).toBe(true);
  });

  it("★ the root is returned lowercased, so one address never reads as two ★", () => {
    expect(membersBoardRoot({ charterRoot: FOUNDER.toUpperCase(), ownVesselKey: OWN }).root).toBe(FOUNDER);
  });

  it("★ a malformed root is REFUSED rather than addressed — a bad key is not a board ★", () => {
    // Addressing a doc by garbage mints an empty board, which would read as "nobody contracted".
    for (const bad of ["zz", "b".repeat(63), "not-hex-at-all"]) {
      const r = membersBoardRoot({ charterRoot: bad, ownVesselKey: OWN });
      expect(r.root).toBe(OWN);
      expect(r.own).toBe(true);
      expect(r.reading).toMatch(/unreadable|malformed|not a key/i);
    }
  });

  it("★ every reading says whose board it is ★", () => {
    for (const c of [FOUNDER, OWN, null]) {
      expect(membersBoardRoot({ charterRoot: c, ownVesselKey: OWN }).reading.length).toBeGreaterThan(40);
    }
  });
});
