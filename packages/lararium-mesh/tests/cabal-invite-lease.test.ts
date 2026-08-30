/**
 * cabal-invite-lease — a vouch lapses by a CAUSAL fence, never by the reader's wall clock.
 *
 * ── WHY A TIMESTAMP CANNOT CARRY THIS ───────────────────────────────────────────────────────────
 * A causal island holds no global now. Two members reading one board at the same causal moment reach
 * different admission verdicts whenever their clocks differ — and the divergence is asymmetric in the
 * dangerous direction: a fast clock refuses a live vouch, while a SLOW one admits a dead vouch. The
 * lease can therefore be extended by the machine being gated, which is the whole property a lease
 * exists to deny. A red-team tester sets a clock; nothing detects it, because nothing was measured.
 *
 * ── THE FENCE THIS HOUSE ALREADY STANDS ─────────────────────────────────────────────────────────
 * `epoch-lease` is a coordinator-free MAX-REGISTER held as per-writer slots: two concurrent rolls
 * both land effective+1 in their own slot, and the maximum never decreases. `device-delegation`
 * already binds a grant to one with `boundEpoch`, so a grant goes stale when the resource's epoch
 * rolls past it. That is convergent, monotone, and holds no clock at all.
 *
 * An invite binds the same way. `expiresAt` remains on the wire as a HINT a voucher's own tools can
 * render — it never gates, so no reader's clock can move an admission.
 */
import { describe, it, expect } from "vitest";
import { inviteLeaseVerdict } from "../src/cabal-invite.js";

describe("a vouch lapses by fence, never by clock", () => {
  it("★ an invite bound BEHIND the realm's epoch has lapsed ★", () => {
    const v = inviteLeaseVerdict({ boundEpoch: "4", effectiveEpoch: 5 });
    expect(v.live).toBe(false);
    expect(v.why).toMatch(/rolled|lapsed|past/i);
  });

  it("★ an invite bound AT or ahead of the epoch still stands ★", () => {
    expect(inviteLeaseVerdict({ boundEpoch: "5", effectiveEpoch: 5 }).live).toBe(true);
    expect(inviteLeaseVerdict({ boundEpoch: "6", effectiveEpoch: 5 }).live).toBe(true);
  });

  it("★ NO CLOCK APPEARS IN THE VERDICT — the signature takes no instant at all ★", () => {
    // The load-bearing property. If this reading accepted a `now`, a reader could supply one, and
    // the lease would be extendable by the party it gates.
    expect(inviteLeaseVerdict.length).toBe(1);
    const src = inviteLeaseVerdict.toString();
    expect(src).not.toMatch(/Date|now|getTime|expiresAt/);
  });

  it("★ a malformed bound fails CLOSED — an unreadable fence is not an open gate ★", () => {
    for (const bad of ["", "x", "-1", "1.5", "1e3", "9999999999999999"]) {
      expect(inviteLeaseVerdict({ boundEpoch: bad, effectiveEpoch: 0 }).live).toBe(false);
    }
  });

  it("★ epoch 0 is a real fence, not an absent one ★", () => {
    // A genesis realm has rolled nothing yet. An invite bound at 0 stands until the first roll.
    expect(inviteLeaseVerdict({ boundEpoch: "0", effectiveEpoch: 0 }).live).toBe(true);
    expect(inviteLeaseVerdict({ boundEpoch: "0", effectiveEpoch: 1 }).live).toBe(false);
  });

  it("★ every verdict says why, so a refusal names its own cure ★", () => {
    expect(inviteLeaseVerdict({ boundEpoch: "1", effectiveEpoch: 9 }).why.length).toBeGreaterThan(25);
  });
});
