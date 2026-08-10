/**
 * fleet-proof — a published face PROVES which fleet it speaks for, in two Ed25519 verifies.
 *
 * The research question split three ways, and only the narrow one needs answering here: "this Handle speaks
 * for fleet F", F named openly. Device-unlinkability and member-set-hiding then fall out FOR FREE, because
 * no device key and no member list ever reach the card. The privacy rests on what stays unpublished rather
 * than on a proof system — which keeps the whole instrument two signature-verifies wide, with no pairing,
 * no trusted setup, no clock, and no lookup.
 *
 * The arms that carry weight: a FORGED claim on someone else's fleet refuses; an edge cannot be LIFTED from
 * one card onto another; an unbound card reads unbound rather than refuted; and the lease now sits INSIDE
 * the signature while staying OUTSIDE the identity.
 *
 * Canon: lar:///ha.ka.ba/lararium/mesh/attestation-plane
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  signHandleCard, signFleetProof, verifyFleetProof, verifyHandleCard,
  handleCardId, handleCardBytes, fleetProofSubject, delegationBytes, DELEGATION_DOMAIN, type HandleCard,
} from "../src/index.js";
import { hex, hexToBytes } from "../src/crypto.js";

const ROOT_SEED  = new Uint8Array(32).fill(3);   // the persona ROOT — lives where the human is
const OTHER_ROOT = new Uint8Array(32).fill(4);   // somebody else's fleet
const FACE_SEED  = new Uint8Array(32).fill(5);   // the published face
const EPOCH = "epoch0-abc123";

const signer = (seed: Uint8Array) => (b: Uint8Array) => ed.signAsync(b, seed).then(hex);
const pubOf  = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
const verify = (b: Uint8Array, sig: string, did: string) =>
  ed.verifyAsync(hexToBytes(sig), b, hexToBytes(did)).catch(() => false);

async function card(over: Partial<HandleCard> = {}): Promise<HandleCard> {
  const nym = await pubOf(FACE_SEED);
  const base = {
    nym, glamour: "FastJack", version: 1, prev: null,
    expiry: 4_000_000_000_000, standing: null, fleetProof: null,
    ...over,
  };
  return signHandleCard(base as Omit<HandleCard, "kind" | "sig">, signer(FACE_SEED));
}

describe("the edge turns a convention into a proof", () => {
  test("★ a face bound by its OWN root verifies ★", async () => {
    const nym  = await pubOf(FACE_SEED);
    const root = await pubOf(ROOT_SEED);
    const c = await card({ fleetProof: await signFleetProof({ nym, rootDid: root, epochCid: EPOCH }, signer(ROOT_SEED)) });

    expect(await verifyFleetProof(c, verify)).toBe(true);
    expect((await verifyHandleCard(c, verify)).ok).toBe(true);   // and the card still certifies itself
  });

  test("★ a FORGED claim on someone else's fleet REFUSES ★", async () => {
    const nym = await pubOf(FACE_SEED);
    // the forger names a root it does not hold, and signs with its own key
    const forged = await signFleetProof({ nym, rootDid: await pubOf(OTHER_ROOT), epochCid: EPOCH }, signer(FACE_SEED));
    expect(await verifyFleetProof(await card({ fleetProof: forged }), verify)).toBe(false);
  });

  test("an edge cannot be LIFTED from one card onto another — it covers the nym it speaks for", async () => {
    const nym  = await pubOf(FACE_SEED);
    const root = await pubOf(ROOT_SEED);
    const honest = await signFleetProof({ nym, rootDid: root, epochCid: EPOCH }, signer(ROOT_SEED));

    // paste that edge onto a DIFFERENT face
    const otherFace = new Uint8Array(32).fill(9);
    const stolen = await signHandleCard({
      nym: await pubOf(otherFace), glamour: "FastJack", version: 1, prev: null,
      expiry: 4_000_000_000_000, standing: null, fleetProof: honest,
    } as Omit<HandleCard, "kind" | "sig">, signer(otherFace));

    expect(await verifyFleetProof(stolen, verify)).toBe(false);
  });

  test("an edge bound at a DIFFERENT epochCid refuses — the epochCid orders the binding", async () => {
    const nym  = await pubOf(FACE_SEED);
    const root = await pubOf(ROOT_SEED);
    const p = await signFleetProof({ nym, rootDid: root, epochCid: EPOCH }, signer(ROOT_SEED));
    const moved = await card({ fleetProof: { ...p, epochCid: "epoch1-deadbeef" } });
    expect(await verifyFleetProof(moved, verify)).toBe(false);
  });

  // An unbound face claims no fleet, so it fails no claim. A caller separates the two by reading the field.
  test("an UNBOUND card reads unbound, never refuted", async () => {
    const c = await card();
    expect(c.fleetProof).toBeNull();
    expect(await verifyFleetProof(c, verify)).toBe(false);
    expect((await verifyHandleCard(c, verify)).ok).toBe(true);   // still a wholly valid card
  });

  test("the card never carries a device key or a member list — the privacy rests on absence", async () => {
    const nym  = await pubOf(FACE_SEED);
    const root = await pubOf(ROOT_SEED);
    const c = await card({ fleetProof: await signFleetProof({ nym, rootDid: root, epochCid: EPOCH }, signer(ROOT_SEED)) });
    const fields = new Set(Object.keys(c).concat(Object.keys(c.fleetProof!)));
    for (const leak of ["deviceDid", "vesselDid", "members", "dyads", "veilDid"]) {
      expect(fields.has(leak)).toBe(false);
    }
  });
});

describe("identity and signature answer different questions, so they cover different bytes", () => {
  test("★ the lease now sits INSIDE the signature — extending an expiry breaks the card ★", async () => {
    const c = await card();
    expect((await verifyHandleCard(c, verify)).ok).toBe(true);
    const extended: HandleCard = { ...c, expiry: c.expiry + 10_000_000 };
    expect((await verifyHandleCard(extended, verify)).ok).toBe(false);
  });

  test("…and OUTSIDE the identity — a renewal keeps the SAME card id, so a lineage never forks on a beat", async () => {
    const c = await card();
    const renewed = { ...c, expiry: c.expiry + 10_000_000 };
    expect(await handleCardId(renewed)).toBe(await handleCardId(c));
    // the two cover different bytes, which is the whole point
    expect(hex(handleCardBytes(renewed))).not.toBe(hex(handleCardBytes(c)));
  });

  test("BINDING a face changes its identity — a recogniser sees a version, never a silent mutation", async () => {
    const nym  = await pubOf(FACE_SEED);
    const root = await pubOf(ROOT_SEED);
    const unbound = await card();
    const bound = await card({ fleetProof: await signFleetProof({ nym, rootDid: root, epochCid: EPOCH }, signer(ROOT_SEED)) });
    expect(await handleCardId(bound)).not.toBe(await handleCardId(unbound));
  });

  // One primitive now signs this AND the dyad binding, so the DOMAIN carries the separation: an edge
  // minted to bind a FACE must never verify as one binding a RELATIONSHIP.
  test("the proof bytes bind nym, root, epochCid AND the domain", () => {
    const D = DELEGATION_DOMAIN.fleetProof;
    const a = hex(delegationBytes(D, fleetProofSubject("nym1"), "root1", "e1"));
    expect(a).not.toBe(hex(delegationBytes(D, fleetProofSubject("nym2"), "root1", "e1")));
    expect(a).not.toBe(hex(delegationBytes(D, fleetProofSubject("nym1"), "root2", "e1")));
    expect(a).not.toBe(hex(delegationBytes(D, fleetProofSubject("nym1"), "root1", "e2")));
    expect(a).not.toBe(hex(delegationBytes(DELEGATION_DOMAIN.dyadBinding, fleetProofSubject("nym1"), "root1", "e1")));
  });
});
