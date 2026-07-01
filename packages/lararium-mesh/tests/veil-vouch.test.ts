/**
 * veil-vouch — the siege-cost: a voucher carries DECAYED rep across a HOLD (refound),
 * guarded by a one-time nullifier that blocks sever-and-refound rep-farming. Dial numbers
 * stay parameters (the operator's fork); this tests the mechanism.
 */
import { describe, test, expect } from "vitest";
import {
  carryRepAcrossHold, nullifierForHold, isNullifierSpent,
  crossVeil,
  type Voucher, type PersonaPath,
} from "../src/index.js";

const SEED = new Uint8Array(32).fill(0x07);
const ANON: PersonaPath = { handleIndex: 0, contextIndex: 0 };
const VOUCHER: Voucher = { voucherKeyHex: "0xvoucher_alice", stakedRep: 100 };

describe("veil-vouch — price the HOLD at the stake, one-time", () => {
  test("carries DECAYED rep onto a fresh HOLD veil (never full — no free teleport)", async () => {
    const held = await crossVeil(SEED, ANON, "hold");
    const carry = carryRepAcrossHold(VOUCHER, held, 0.5);
    expect(carry.carriedRep).toBe(50);                  // 100 × 0.5 — decayed
    expect(carry.carriedRep).toBeLessThan(VOUCHER.stakedRep);
    expect(carry.voucherKeyHex).toBe("0xvoucher_alice");
  });

  test("REFUSES to ride a LIFT — a lift already keeps the linkable key + its rep", async () => {
    const lifted = await crossVeil(SEED, ANON, "lift");
    expect(() => carryRepAcrossHold(VOUCHER, lifted, 0.5)).toThrow(/rides a HOLD/);
  });

  test("rejects a decayFactor outside [0,1] (the operator's dial, but bounded)", async () => {
    const held = await crossVeil(SEED, ANON, "hold");
    expect(() => carryRepAcrossHold(VOUCHER, held, 1.5)).toThrow(/decayFactor/);
    expect(() => carryRepAcrossHold(VOUCHER, held, -0.1)).toThrow(/decayFactor/);
    // the boundaries are legal: 0 (carry nothing) and 1 (carry all — a permissive dial)
    expect(carryRepAcrossHold(VOUCHER, held, 0).carriedRep).toBe(0);
    expect(carryRepAcrossHold(VOUCHER, held, 1).carriedRep).toBe(100);
  });

  test("the nullifier is one-time — a spent one blocks sever-and-refound rep-farming", async () => {
    const held = await crossVeil(SEED, ANON, "hold");
    const carry = carryRepAcrossHold(VOUCHER, held, 0.5);
    const spent = new Set<string>();
    expect(isNullifierSpent(carry.nullifier, spent)).toBe(false);   // first carry — fresh
    spent.add(carry.nullifier);                                      // consume it
    expect(isNullifierSpent(carry.nullifier, spent)).toBe(true);    // a replay is blocked
  });

  test("distinct fresh veils get distinct nullifiers; the same (voucher,veil) is stable", async () => {
    const h5 = await crossVeil(SEED, ANON, "hold", { newHandleIndex: 5 });
    const h6 = await crossVeil(SEED, ANON, "hold", { newHandleIndex: 6 });
    const n5 = nullifierForHold(VOUCHER.voucherKeyHex, h5.verifyingKey);
    const n6 = nullifierForHold(VOUCHER.voucherKeyHex, h6.verifyingKey);
    expect(n5).not.toBe(n6);                                          // a different refound → a different slot
    expect(n5).toBe(nullifierForHold(VOUCHER.voucherKeyHex, h5.verifyingKey));  // deterministic
  });
});
