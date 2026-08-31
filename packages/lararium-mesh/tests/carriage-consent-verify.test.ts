/**
 * carriage-consent-verify — a kept consent proves itself, or it counts for nothing.
 *
 * ── WHY A FILE IS NOT EVIDENCE ──────────────────────────────────────────────────────────────────
 * A joining operator keeps the contract-in she signed so her vessel can read the relation it stands
 * in without a partner's document. That record sits on disk beside the charter, and disk is not a
 * trust boundary: `LAR_ROOT` names the whole seal home, so anything running as its owner may write
 * there. A reading that trusted the file's LOCATION would report a Nexus a vessel never joined.
 *
 * ── THE HOUSE ALREADY HOLDS THE RULE ────────────────────────────────────────────────────────────
 * The admit path verifies the same signature before it counts, on the reasoning that "a Nexus can
 * never manufacture this seal: only the operator holding the nym's seed can produce it". The kept
 * copy earns its reading the same way — trust rides the signature, never the location, exactly as a
 * handle-card is valid only if signed by its own nym.
 *
 * TWO THINGS MUST HOLD, and the second is easy to miss: the signature must verify, AND the nym must
 * be a root THIS VESSEL holds. A consent that verifies under someone else's nym is genuine evidence
 * that SOMEBODY joined — copying it here would let a vessel claim a relation another party entered.
 */
import { describe, it, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { signCarriageContract, verifyCarriageConsent } from "../src/carriage-registry.js";

const EPOCH = "epoch0-" + "a".repeat(64);

async function mint(seedByte: number, epoch = EPOCH) {
  const seed = new Uint8Array(32).fill(seedByte);
  const nym  = Buffer.from(await ed.getPublicKeyAsync(seed)).toString("hex");
  const q    = await signCarriageContract(nym, epoch,
    async (b) => Buffer.from(await ed.signAsync(b, seed)).toString("hex"));
  return { nym, contractSig: q.sig, sealEpochCid: epoch };
}

describe("carriage-consent-verify — trust rides the signature, never the location", () => {
  it("★ a consent this vessel signed VERIFIES ★", async () => {
    const c = await mint(7);
    expect(await verifyCarriageConsent(c)).toBe(true);
  });

  it("★ a consent whose signature does not verify counts for NOTHING ★", async () => {
    const c = await mint(7);
    expect(await verifyCarriageConsent({ ...c, contractSig: "00".repeat(64) })).toBe(false);
  });

  it("★ moving the EPOCH breaks it — the seal binds nym AND epoch together ★", async () => {
    // The load-bearing case: a consent lifted onto a later charter would carry a relation across
    // terms it never read, which is exactly what the epoch binding exists to prevent.
    const c = await mint(7);
    expect(await verifyCarriageConsent({ ...c, sealEpochCid: "epoch0-" + "b".repeat(64) })).toBe(false);
  });

  it("★ swapping the NYM breaks it — a seal names the hand that made it ★", async () => {
    const mine = await mint(7);
    const theirs = await mint(9);
    expect(await verifyCarriageConsent({ ...mine, nym: theirs.nym })).toBe(false);
  });

  it("★ another operator's GENUINE consent verifies as theirs — the caller must still own the nym ★", async () => {
    // This is why verification alone is not the whole gate. The signature is real; the question a
    // vessel must also ask is whether the nym is a root IT holds.
    const theirs = await mint(9);
    expect(await verifyCarriageConsent(theirs)).toBe(true);
  });

  it("★ malformed hex refuses rather than throwing — a torn record is not a crash ★", async () => {
    const c = await mint(7);
    for (const bad of ["", "zz", "abc"]) {
      expect(await verifyCarriageConsent({ ...c, contractSig: bad })).toBe(false);
      expect(await verifyCarriageConsent({ ...c, nym: bad })).toBe(false);
    }
  });
});
