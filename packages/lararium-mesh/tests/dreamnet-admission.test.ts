/**
 * dreamnet-admission.test.ts — the seam admits on BOTH signals, and refuses at the first gate that fails.
 *
 * Four claims, four groups: the structural gate refuses BEFORE any price is walked (invite-only, no invite);
 * a valid invite that prices within budget CROSSES; a valid invite priced ABOVE budget refuses as
 * unaffordable while still naming the voucher (the co-pay stands); and `open` policy skips the invite but
 * still PRICES — open is not free.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  admitToDreamnet, signCabalInvite, DREAMNET_JOIN_POLICY,
  type AdmissionDials, type VouchEdge,
} from "../src/index.js";
import { hex, hexToBytes } from "../src/crypto.js";

const VOUCHER_SEED = new Uint8Array(32).fill(7);
const signer = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf  = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);

/** The caller owns which vouchers count — here, a real ed25519 check against the DID in the clear. */
const verify = (bytes: Uint8Array, sigHex: string, voucherDid: string) =>
  ed.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(voucherDid)).catch(() => false);

const PLACE = "a".repeat(64);
const JOINER = "b".repeat(64);
const NOW = new Date("2026-07-14T00:00:00Z");
const LATER = "2026-08-01T00:00:00Z";

/** Dials loose enough that a well-rooted applicant prices cheap; the tests move budget, not dials. */
const DIALS: AdmissionDials = { epsilon: 0.15, beta: 0.9, rho: 1, supply: 1, alpha: 0.5 };

async function invite(over: Partial<{ place: string; joiner: string; expiresAt: string }> = {}) {
  return signCabalInvite({
    placeDocIdHex:     over.place ?? PLACE,
    joinerIdentityHex: over.joiner ?? JOINER,
    voucherDid:        await pubOf(VOUCHER_SEED),
    expiresAt:         over.expiresAt ?? LATER,
  }, signer(VOUCHER_SEED));
}

describe("the seam runs BOTH signals, structural first", () => {
  test("invite-only with no invite refuses at the structural gate — no price is walked", async () => {
    const v = await admitToDreamnet({
      policy: DREAMNET_JOIN_POLICY, placeDocIdHex: PLACE, joinerIdentityHex: JOINER,
      invite: null, now: NOW, verify,
      edges: [], seed: "s", applicant: JOINER, dials: DIALS, budget: Infinity,
    });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("no-invite");
    expect(v.price).toBeUndefined();   // the price wall never ran — the invite gate spoke first
  });

  test("a valid invite priced within budget CROSSES, and names the voucher for the co-pay", async () => {
    const voucherDid = await pubOf(VOUCHER_SEED);
    // a two-edge lineage: seed → voucher → joiner, so the joiner carries a real rank and prices cheap
    const edges: VouchEdge[] = [
      { voucher: "s", joiner: voucherDid },
      { voucher: voucherDid, joiner: JOINER },
    ];
    const v = await admitToDreamnet({
      policy: DREAMNET_JOIN_POLICY, placeDocIdHex: PLACE, joinerIdentityHex: JOINER,
      invite: await invite(), now: NOW, verify,
      edges, seed: "s", applicant: JOINER, dials: DIALS, budget: Infinity,
    });
    expect(v.admitted).toBe(true);
    expect(v.voucherDid).toBe(voucherDid);
    expect(v.price?.rank).toBeGreaterThan(0);
  });

  test("a valid invite priced ABOVE budget refuses as unaffordable — the voucher still stands", async () => {
    const voucherDid = await pubOf(VOUCHER_SEED);
    const v = await admitToDreamnet({
      policy: DREAMNET_JOIN_POLICY, placeDocIdHex: PLACE, joinerIdentityHex: JOINER,
      invite: await invite(), now: NOW, verify,
      // unranked applicant → prices at the bar itself; a zero budget cannot clear it
      edges: [], seed: "s", applicant: JOINER, dials: DIALS, budget: 0,
    });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("unaffordable");
    expect(v.voucherDid).toBe(voucherDid);   // the co-pay is still attributable
    expect(v.price).toBeDefined();
  });
});

describe("open policy skips the invite but STILL prices", () => {
  test("no invite, open policy — the crossing prices with an empty (dispersed) cluster", async () => {
    const v = await admitToDreamnet({
      policy: { kind: "open" }, placeDocIdHex: PLACE, joinerIdentityHex: JOINER,
      invite: null, now: NOW, verify,
      edges: [], seed: "s", applicant: JOINER, dials: DIALS, budget: Infinity,
    });
    expect(v.admitted).toBe(true);
    expect(v.voucherDid).toBeUndefined();       // open — no vouch, so no co-pay
    expect(v.price?.concentration).toBe(0);     // empty cluster reads dispersed, never captured
  });

  test("open policy still refuses a crossing priced above budget — open is not free", async () => {
    const v = await admitToDreamnet({
      policy: { kind: "open" }, placeDocIdHex: PLACE, joinerIdentityHex: JOINER,
      invite: null, now: NOW, verify,
      edges: [], seed: "s", applicant: JOINER, dials: DIALS, budget: 0,
    });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("unaffordable");
  });
});
