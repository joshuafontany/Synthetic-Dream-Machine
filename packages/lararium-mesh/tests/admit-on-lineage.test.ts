/**
 * admit-on-lineage — the crossing folded from the ISSUED INVITES, so the per-voucher cap cannot be skipped.
 *
 * `admitToPlace` takes pre-folded edges; a caller assembling them by hand silently loses the choke that
 * bounds any one hand's injection into the lineage. This shore takes the invites themselves. What matters:
 * the cap BITES here, what it turned away comes back VISIBLE, and with nothing capped the shore agrees
 * exactly with the manual path — so folding here costs no behaviour, it only removes a way to get it wrong.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/admission-on-a-lineage#the-standing
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  admitOnLineage, admitToPlace, signCabalInvite, vouchDagFromInvites, DEFAULT_JOIN_POLICY,
  type AdmissionDials, type CabalInvite,
} from "../src/index.js";
import { hex, hexToBytes } from "../src/crypto.js";

const signer = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf  = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
const verify = (bytes: Uint8Array, sigHex: string, voucherDid: string) =>
  ed.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(voucherDid)).catch(() => false);

const VOUCHER_SEED = new Uint8Array(32).fill(7);
const PLACE  = "a".repeat(64);
const JOINER = "b".repeat(64);
const NOW    = new Date("2026-07-14T00:00:00Z");
const LATER  = "2026-08-01T00:00:00Z";
const DIALS: AdmissionDials = { epsilon: 0.15, beta: 0.9, rho: 1, supply: 1, alpha: 0.5 };

/** An invite from the one voucher to whoever — the raw material the lineage folds from. */
async function inviteTo(joiner: string): Promise<CabalInvite> {
  return signCabalInvite({
    placeDocIdHex: PLACE, joinerIdentityHex: joiner,
    voucherDid: await pubOf(VOUCHER_SEED), expiresAt: LATER,
  }, signer(VOUCHER_SEED));
}

describe("admitOnLineage — the cap rides INSIDE the gate", () => {
  test("the cap BITES, and what it turned away comes back visible", async () => {
    const voucherDid = await pubOf(VOUCHER_SEED);
    // one hand issues five invites; the operator's choke allows two
    const issued = [await inviteTo(JOINER), ...await Promise.all(
      ["c", "d", "e", "f"].map((c) => inviteTo(c.repeat(64))),
    )];

    const v = await admitOnLineage({
      policy: DEFAULT_JOIN_POLICY, placeDocIdHex: PLACE, joinerIdentityHex: JOINER,
      invite: issued[0]!, now: NOW, verify,
      issued, seed: voucherDid, applicant: JOINER, dials: DIALS,
      maxVouchesPerVoucher: 2,
    });

    expect(v.capped).toHaveLength(3);                       // five issued, two kept — three refused
    expect(v.capped.every((c) => c.voucher === voucherDid)).toBe(true);
    expect(v.admitted).toBe(true);                          // the applicant rode one of the KEPT edges
  });

  test("uncapped, the shore agrees EXACTLY with folding by hand then admitting", async () => {
    const voucherDid = await pubOf(VOUCHER_SEED);
    const issued = [await inviteTo(JOINER), await inviteTo("c".repeat(64))];

    const viaShore = await admitOnLineage({
      policy: DEFAULT_JOIN_POLICY, placeDocIdHex: PLACE, joinerIdentityHex: JOINER,
      invite: issued[0]!, now: NOW, verify,
      issued, seed: voucherDid, applicant: JOINER, dials: DIALS,
    });
    const byHand = await admitToPlace({
      policy: DEFAULT_JOIN_POLICY, placeDocIdHex: PLACE, joinerIdentityHex: JOINER,
      invite: issued[0]!, now: NOW, verify,
      edges: vouchDagFromInvites(issued).edges,
      seed: voucherDid, applicant: JOINER, dials: DIALS,
    });

    expect(viaShore.admitted).toBe(byHand.admitted);
    expect(viaShore.voucherDid).toBe(byHand.voucherDid);
    expect(viaShore.price?.rank).toBe(byHand.price?.rank);
    expect(viaShore.price?.concentration).toBe(byHand.price?.concentration);
    expect(viaShore.capped).toHaveLength(0);                 // nothing choked → nothing hidden
  });

  test("a capped-away applicant is UNRANKED, never refused — the choke prices, it does not ban", async () => {
    const voucherDid = await pubOf(VOUCHER_SEED);
    // the applicant's own invite arrives LAST, past a cap of one — its edge never enters the lineage
    const issued = [await inviteTo("c".repeat(64)), await inviteTo(JOINER)];

    const v = await admitOnLineage({
      policy: DEFAULT_JOIN_POLICY, placeDocIdHex: PLACE, joinerIdentityHex: JOINER,
      invite: issued[1]!, now: NOW, verify,
      issued, seed: voucherDid, applicant: JOINER, dials: DIALS,
      maxVouchesPerVoucher: 1,
    });

    // The structural invite still verifies, so the gate does not BAN — it prices an applicant the lineage
    // never received. Anergy, not refusal: they may return when the voucher's budget frees up.
    expect(v.capped.map((c) => c.joiner)).toContain(JOINER);
    expect(v.price?.rank).toBe(0);                          // absent from the lineage reads UNRANKED
  });
});
