/**
 * recovery-seat.test — non-transferability made a type. Recovery carries DECAYED positive rep and
 * INHERITS the retired key's anergy (non-optional, ledger-read, age/hold preserved) on one nullifier —
 * so "recover into a clean slate" is unrepresentable (the only clean slate is throwawayVeil, rep=0 = burn).
 */
import { describe, test, expect } from "vitest";
import { recoverSeat } from "../src/recovery-seat.js";
import type { ContinuityAssertion } from "../src/holder-continuity.js";
import type { CrossedVeil } from "../src/veil-crossing.js";
import type { AnergyLedger, AnergyMark } from "../src/anergy-ledger.js";

const RETIRED = "aa".repeat(32);
const FRESH   = "bb".repeat(32);
const held: CrossedVeil = { mode: "hold", verifyingKey: FRESH, path: {} as unknown as CrossedVeil["path"], linkedToAnon: false };
const assertion: ContinuityAssertion = { retiredKeyHex: RETIRED, freshKeyHex: FRESH, proofSig: "sig", epoch: 1 };
const okSig = (): boolean => true;
const badSig = (): boolean => false;

const emptyLedger: AnergyLedger = { marksFor: () => [] };
const markedLedger = (marks: AnergyMark[]): AnergyLedger => ({ marksFor: (k) => (k === RETIRED ? marks : []) });
const MARK: AnergyMark = { retiredKeyHex: RETIRED, originKeyHex: RETIRED, holdTicks: 10, ageTicks: 3, reason: "spam-pattern" };

describe("recovery-seat — non-transferability made a type", () => {
  test("carries DECAYED positive rep onto the fresh key + a non-optional (empty) anergy set", () => {
    const r = recoverSeat(assertion, { keyHex: RETIRED, rep: 20 }, held, emptyLedger, new Set(), { decayFactor: 0.5 }, okSig);
    expect(r.veil.rep).toBe(10);                 // 20 × 0.5 — never full (no free teleport)
    expect(r.veil.verifyingKey).toBe(FRESH);
    expect(r.veil.rung).toBe("lived");
    expect(r.inheritedAnergy).toEqual([]);       // present, empty — never omitted
  });

  test("a retired key's anergy FOLLOWS the subject — cannot be shed, decay clock NOT reset", () => {
    const r = recoverSeat(assertion, { keyHex: RETIRED, rep: 20 }, held, markedLedger([MARK]), new Set(), { decayFactor: 1 }, okSig);
    expect(r.inheritedAnergy).toHaveLength(1);
    expect(r.inheritedAnergy[0]!.retiredKeyHex).toBe(FRESH);    // rebound to the fresh key
    expect(r.inheritedAnergy[0]!.originKeyHex).toBe(RETIRED);   // origin preserved — never laundered
    expect(r.inheritedAnergy[0]!.ageTicks).toBe(3);             // carried, not reset
    expect(r.inheritedAnergy[0]!.holdTicks).toBe(10);
  });

  test("a forged/absent continuity proof cannot carry rep", () => {
    expect(() => recoverSeat(assertion, { keyHex: RETIRED, rep: 20 }, held, emptyLedger, new Set(), { decayFactor: 0.5 }, badSig))
      .toThrow(/continuity unproven/);
  });

  test("a spent continuity slot blocks recover-repeatedly-to-shed (one-time)", () => {
    const first = recoverSeat(assertion, { keyHex: RETIRED, rep: 20 }, held, emptyLedger, new Set(), { decayFactor: 0.5 }, okSig);
    const spent = new Set([first.nullifier]);
    expect(() => recoverSeat(assertion, { keyHex: RETIRED, rep: 20 }, held, emptyLedger, spent, { decayFactor: 0.5 }, okSig))
      .toThrow(/already spent/);
  });

  test("guards fire on a fresh-key mismatch + a wrong-retired-seat", () => {
    const wrongFresh: ContinuityAssertion = { ...assertion, freshKeyHex: "cc".repeat(32) };
    expect(() => recoverSeat(wrongFresh, { keyHex: RETIRED, rep: 20 }, held, emptyLedger, new Set(), { decayFactor: 0.5 }, okSig))
      .toThrow(/fresh key/);
    expect(() => recoverSeat(assertion, { keyHex: "dd".repeat(32), rep: 20 }, held, emptyLedger, new Set(), { decayFactor: 0.5 }, okSig))
      .toThrow(/named retired seat/);
  });
});
