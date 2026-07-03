/**
 * purple-minter + commit-dial — witness the mint of a receiver-boundary sink at the cross-plane closure,
 * gated by the crucible-before-binding floor. Proves: only a purple candidate mints (cymatic/none get
 * detected); a metameric match collapses to one pet-name; the crucible floor RULES a born-standing-fed
 * candidate bound and holds a born-but-not-standing one PROPOSED.
 */
import { describe, expect, test } from "vitest";

import { mintPurpleSink, makeMintRegistry } from "../src/purple-minter.js";
import { commitDial } from "../src/commit-dial.js";
import type { SinkVerdict } from "../src/sink.js";
import type { SinkClassVerdict, SinkClass } from "../src/sink-class.js";

const mkVerdict = (over: Partial<SinkVerdict> = {}): SinkVerdict => ({
  support: 10,
  supersaturation: 1.5,
  recentWindow: 8,
  planeSignals: [
    { plane: "content", agreement: 0.8 },
    { plane: "structure", agreement: 0.6 },
  ],
  birth: { born: true, criticalRadius: 2, barrier: 1, drive: 1, effectivePlanes: 2, condensation: 0.5, invalid: false },
  standing: { period: 8, lockQuality: 0.7, recovery: 0.7, standing: 0.49, rigid: true, invalid: false },
  clock: { beat: 8, lockQuality: 0.7, locked: true, holdover: false, bands: [] },
  freeRunBeat: 8,
  provisional: false,
  standsAsSink: true,
  atemporal: false,
  ...over,
});

const mkClass = (sinkClass: SinkClass): SinkClassVerdict => ({
  sinkClass,
  signalPlanes: sinkClass === "signal-boundary" ? ["content"] : [],
  bornCrossPlane: sinkClass === "receiver-boundary",
  observerDependence: sinkClass === "receiver-boundary" ? 1 : 0,
  invalid: false,
});

const counter = () => {
  let n = 0;
  return () => `sink-${n++}`;
};

describe("mintPurpleSink — the crucible-gated purple mint", () => {
  test("mints a receiver-boundary sink with a pet-name, the purple invariant, and a commit verdict", () => {
    const m = mintPurpleSink(mkVerdict(), mkClass("receiver-boundary"), makeMintRegistry(), counter());
    expect(m).not.toBeNull();
    expect(m!.petName).toBe("sink-0");
    expect(m!.presentInNoPlane).toBe(true);
    expect(m!.planes).toEqual(["content", "structure"]);
    expect(m!.commit.bound).toBe(true); // born + standing + supersaturation ≥ 1 → RULED
  });

  test("REFUSES a cymatic or none candidate (those get DETECTED, never minted)", () => {
    const reg = makeMintRegistry();
    expect(mintPurpleSink(mkVerdict(), mkClass("signal-boundary"), reg, counter())).toBeNull();
    expect(mintPurpleSink(mkVerdict(), mkClass("none"), reg, counter())).toBeNull();
  });

  test("metameric collapse — two logs in the same closure-cell mint the SAME pet-name", () => {
    const reg = makeMintRegistry();
    const id = counter();
    const a = mintPurpleSink(mkVerdict({ planeSignals: [{ plane: "content", agreement: 0.82 }, { plane: "structure", agreement: 0.63 }] }), mkClass("receiver-boundary"), reg, id);
    const b = mintPurpleSink(mkVerdict({ planeSignals: [{ plane: "content", agreement: 0.79 }, { plane: "structure", agreement: 0.58 }] }), mkClass("receiver-boundary"), reg, id);
    // 0.82→cell 8, 0.79→cell 8 (quantum 0.1); 0.63→cell 6, 0.58→cell 6 — same closure key → one pet-name.
    expect(a!.petName).toBe(b!.petName);
  });

  test("the crucible floor holds a born-but-not-standing candidate PROPOSED (anti-rubber-stamp)", () => {
    const notStanding = mkVerdict({ standing: { period: 0, lockQuality: 0, recovery: 0, standing: 0, rigid: false, invalid: false } });
    const m = mintPurpleSink(notStanding, mkClass("receiver-boundary"), makeMintRegistry(), counter());
    expect(m).not.toBeNull(); // still minted (crucible marks PROPOSED, never seals-out)
    expect(m!.commit.state).toBe("PROPOSED");
    expect(m!.commit.bound).toBe(false);
  });

  test("an ATEMPORAL purple BINDS — the minter waives standing from verdict.atemporal (the corpus fix)", () => {
    const corpus = mkVerdict({
      atemporal: true,
      standing: { period: 0, lockQuality: 0, recovery: 0, standing: 0, rigid: false, invalid: false },
    });
    const m = mintPurpleSink(corpus, mkClass("receiver-boundary"), makeMintRegistry(), counter());
    expect(m).not.toBeNull();
    expect(m!.commit.bound).toBe(true); // atemporal → requireStanding waived → RULED despite no re-lock
  });
});

describe("commitDial — the crucible-before-binding floor", () => {
  test("sub-critical holds PROPOSED", () => {
    expect(commitDial({ born: false, rigid: false, supersaturation: 2 }).bound).toBe(false);
  });
  test("born + standing + fed RULES bound", () => {
    const v = commitDial({ born: true, rigid: true, supersaturation: 1.2 });
    expect(v.state).toBe("RULED");
    expect(v.bound).toBe(true);
  });
  test("an atemporal feed waives standing (born-not-standing binds at requireStanding:false)", () => {
    const v = commitDial({ born: true, rigid: false, supersaturation: 1.1 }, { requireStanding: false });
    expect(v.bound).toBe(true);
  });
  test("supersaturation below the floor holds PROPOSED", () => {
    expect(commitDial({ born: true, rigid: true, supersaturation: 0.5 }, { minSupersaturation: 1 }).bound).toBe(false);
  });
});
