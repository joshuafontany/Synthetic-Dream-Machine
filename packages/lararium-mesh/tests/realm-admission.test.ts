/**
 * realm-admission.test.ts — the shore admits on BOTH signals, and refuses at the first gate that fails.
 *
 * Four claims, four groups: the structural gate refuses BEFORE any price is walked (invite-only, no invite);
 * a valid invite CROSSES and names the voucher (the co-pay stands); a cluster AT THE CEILING refuses on the
 * wall's own verticality; and `open` policy skips the invite but still PRICES — open is not free.
 *
 * THE APPLICANT BRINGS NOTHING. No budget rides here: the cost falls on the voucher by dilution, and the
 * convex wall refuses ITSELF by returning a non-finite price at r ≥ β. There is nothing to compare against.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  admitToRealm, signCabalInvite, DEFAULT_JOIN_POLICY,
  type AdmissionDials, type VouchEdge,
} from "../src/index.js";
import { hex, hexToBytes } from "../src/crypto.js";

const VOUCHER_SEED = new Uint8Array(32).fill(7);
const signer = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf  = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);

/** The caller owns which vouchers count — here, a real ed25519 check against the DID in the clear. */
const verify = (bytes: Uint8Array, sigHex: string, voucherDid: string) =>
  ed.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(voucherDid)).catch(() => false);

const REALM = "a".repeat(64);
const JOINER = "b".repeat(64);
const NOW = new Date("2026-07-14T00:00:00Z");
const LATER = "2026-08-01T00:00:00Z";

/** Dials loose enough that a well-rooted applicant prices cheap — β sits far above any cluster here. */
const DIALS: AdmissionDials = { epsilon: 0.15, beta: 0.9, rho: 1, supply: 1, alpha: 0.5 };

/** The SAME dials with the capture ceiling pulled UNDER a lone voucher's share — the wall goes vertical.
 *  Only β moves: the refusal must come from the operator's ceiling, never from a different lineage. */
const TIGHT: AdmissionDials = { ...DIALS, beta: 0.2 };

async function invite(over: Partial<{ realm: string; joiner: string; expiresAt: string }> = {}) {
  return signCabalInvite({
    realmDocIdHex:     over.realm ?? REALM,
    joinerIdentityHex: over.joiner ?? JOINER,
    voucherDid:        await pubOf(VOUCHER_SEED),
    expiresAt:         over.expiresAt ?? LATER,
  }, signer(VOUCHER_SEED));
}

describe("the shore runs BOTH signals, structural first", () => {
  test("invite-only with no invite refuses at the structural gate — no price is walked", async () => {
    const v = await admitToRealm({
      policy: DEFAULT_JOIN_POLICY, realmDocIdHex: REALM, joinerIdentityHex: JOINER,
      invite: null, now: NOW, verify,
      edges: [], seed: "s", applicant: JOINER, dials: DIALS,
    });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("no-invite");
    expect(v.price).toBeUndefined();   // the price wall never ran — the invite gate spoke first
  });

  test("a valid invite CROSSES on a real lineage, and names the voucher for the co-pay", async () => {
    const voucherDid = await pubOf(VOUCHER_SEED);
    // a two-edge lineage: seed → voucher → joiner, so the joiner carries a real rank and prices cheap
    const edges: VouchEdge[] = [
      { voucher: "s", joiner: voucherDid },
      { voucher: voucherDid, joiner: JOINER },
    ];
    const v = await admitToRealm({
      policy: DEFAULT_JOIN_POLICY, realmDocIdHex: REALM, joinerIdentityHex: JOINER,
      invite: await invite(), now: NOW, verify,
      edges, seed: "s", applicant: JOINER, dials: DIALS,
    });
    expect(v.admitted).toBe(true);
    expect(v.voucherDid).toBe(voucherDid);
    expect(v.price?.rank).toBeGreaterThan(0);
    expect(Number.isFinite(v.price!.price)).toBe(true);   // below the ceiling the wall stays passable
  });

  test("a cluster AT THE CEILING refuses on the wall's own verticality — the voucher still stands", async () => {
    const voucherDid = await pubOf(VOUCHER_SEED);
    // The SAME lineage that crossed above, priced against a ceiling pulled under the voucher's share. The
    // refusal must arrive as a non-finite price — an actual wall — not as a large number losing a comparison.
    const edges: VouchEdge[] = [
      { voucher: "s", joiner: voucherDid },
      { voucher: voucherDid, joiner: JOINER },
    ];
    const v = await admitToRealm({
      policy: DEFAULT_JOIN_POLICY, realmDocIdHex: REALM, joinerIdentityHex: JOINER,
      invite: await invite(), now: NOW, verify,
      edges, seed: "s", applicant: JOINER, dials: TIGHT,
    });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("at-the-ceiling");
    expect(v.voucherDid).toBe(voucherDid);                 // the co-pay is still attributable
    expect(v.price!.concentration).toBeGreaterThanOrEqual(TIGHT.beta);
    expect(Number.isFinite(v.price!.price)).toBe(false);   // the wall itself, not a threshold anyone set
  });
});

describe("open policy skips the invite but STILL prices", () => {
  test("no invite, open policy — the crossing prices with an empty (dispersed) cluster", async () => {
    const v = await admitToRealm({
      policy: { kind: "open" }, realmDocIdHex: REALM, joinerIdentityHex: JOINER,
      invite: null, now: NOW, verify,
      edges: [], seed: "s", applicant: JOINER, dials: DIALS,
    });
    expect(v.admitted).toBe(true);
    expect(v.voucherDid).toBeUndefined();       // open — no vouch, so no co-pay
    expect(v.price?.concentration).toBe(0);     // empty cluster reads dispersed, never captured
  });

  // Open drops the INVITE requirement and nothing else. With no voucher the cluster reads empty, so
  // concentration is 0 and the wall stays passable — open cannot be walked into a capture, because there is
  // no cluster to concentrate. The pricing still RUNS, and that is what keeps open from meaning free.
  test("open policy prices every crossing — the wall runs even with no invite to gate it", async () => {
    const v = await admitToRealm({
      policy: { kind: "open" }, realmDocIdHex: REALM, joinerIdentityHex: JOINER,
      invite: null, now: NOW, verify,
      edges: [], seed: "s", applicant: JOINER, dials: TIGHT,
    });
    expect(v.price).toBeDefined();               // priced, always — never skipped under open
    expect(v.price!.concentration).toBe(0);      // no voucher → no cluster → dispersed, never captured
    expect(v.admitted).toBe(true);
  });
});
