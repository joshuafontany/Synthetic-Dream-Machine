/**
 * persona-kel.test — the Reading-B continuity anchor: a stable identifier PREFIX the operational key
 * rotates BENEATH, and a threshold-attest rotation that reconstructs NOTHING.
 *
 * Proven:
 *   · inception → rotate → verify round-trips; the prefix stays FIXED, the LATEST head carries the op-key,
 *   · a broken hash-link / tampered event REFUSES (structural verify fails closed),
 *   · THRESHOLD-ATTEST: k distinct guardian sigs ACCEPT a rotation; k-1 REFUSE; a non-roster signer and a
 *     duplicated signer never pad the quorum; a revealed roster off the pre-commit REFUSES,
 *   · NOTHING RECONSTRUCTS — the rotation seats a fresh op-key from guardian SIGNATURES over public keys
 *     alone; no seed, share, or reconstruct is ever assembled,
 *   · THE GATE-WALK: an edge signed by the CURRENT head verifies; a rotated (fresh) op-key still verifies
 *     under a re-issued edge; an edge signed by the SUPERSEDED op-key rejects (kapae-shadowed).
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { hex, hexToBytes } from "../src/crypto.js";
import { charterKeySetHash } from "../src/wax-stamp.js";
import { buildDeviceDelegation } from "../src/device-delegation.js";
import {
  mintPersonaInception, mintPersonaRotation, personaRotationSigningBytes,
  personaPrefixOf, verifyPersonaKel, verifyPersonaKelFull, verifyRotationQuorum,
  headOpKey, verifyEdgeAgainstPersonaKel, personaEventBytes,
  type PersonaKelEvent,
} from "../src/persona-kel.js";
import { provisionThresholdRecoveryAtFounding, attestAndRotate } from "../src/recovery-keel-core.js";

// Fixed seeds → deterministic run. Op-key seeds (A = founding, B = post-rotation) + three guardian
// recovery seeds + one stranger who holds no recovery authority.
const SEEDS = {
  opA:      new Uint8Array(32).fill(11),
  opB:      new Uint8Array(32).fill(22),
  vesselX:  new Uint8Array(32).fill(33),
  vesselY:  new Uint8Array(32).fill(44),
  g1:       new Uint8Array(32).fill(1),
  g2:       new Uint8Array(32).fill(2),
  g3:       new Uint8Array(32).fill(3),
  stranger: new Uint8Array(32).fill(9),
};
const pubOf    = (s: Uint8Array) => ed.getPublicKeyAsync(s).then(hex);
const didOf    = async (s: Uint8Array) => `0x${await pubOf(s)}`;
const signerOf = (s: Uint8Array) => async (bytes: Uint8Array) => hex(await ed.signAsync(bytes, s));
const guardianSigner = async (s: Uint8Array) => ({ signer: await pubOf(s), sign: signerOf(s) });

async function foundedInception(threshold = 2) {
  const foundingOpKeyDid = await didOf(SEEDS.opA);
  const guardianRecoveryKeys = await Promise.all([pubOf(SEEDS.g1), pubOf(SEEDS.g2), pubOf(SEEDS.g3)]);
  const prov = provisionThresholdRecoveryAtFounding({ foundingOpKeyDid, guardianRecoveryKeys, recoveryThreshold: threshold });
  return { foundingOpKeyDid, guardianRecoveryKeys, ...prov };
}

describe("persona-kel — inception + structural verify", () => {
  test("inception binds the prefix to (op-key + recovery-set digest); verifyPersonaKel accepts", async () => {
    const { inception, foundingOpKeyDid, recoverySetHash } = await foundedInception();
    expect(inception.seq).toBe(0);
    expect(inception.prevEventCid).toBeNull();
    expect(inception.prefix).toBe(personaPrefixOf(foundingOpKeyDid, recoverySetHash));
    expect(inception.recoveryRoster).toEqual([]);           // inception reveals no roster — only the digest
    expect(verifyPersonaKel([inception])).toBe(true);
    expect(await headOpKey([inception])).toBe(foundingOpKeyDid);
  });

  test("a tampered inception cid or swapped recovery-set REFUSES (fail-closed)", async () => {
    const { inception } = await foundedInception();
    expect(verifyPersonaKel([{ ...inception, eventCid: "pkel0-forged" }])).toBe(false);
    // A different recovery digest no longer derives the pinned prefix → structural verify fails.
    expect(verifyPersonaKel([{ ...inception, recoverySetHash: "beef".repeat(16) }])).toBe(false);
  });
});

describe("persona-kel — threshold-attest rotation (Fork B, NOTHING reconstructs)", () => {
  test("k distinct guardian sigs seat a FRESH op-key; the prefix stays fixed, the head advances", async () => {
    const { inception, guardianRecoveryKeys, recoveryThreshold } = await foundedInception();
    const freshOpKeyDid = await didOf(SEEDS.opB);
    const guardianSigners = await Promise.all([guardianSigner(SEEDS.g1), guardianSigner(SEEDS.g2)]);

    const res = await attestAndRotate({ head: inception, freshOpKeyDid, guardianRecoveryKeys, recoveryThreshold, guardianSigners });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const rotation = res.event;

    expect(rotation.seq).toBe(1);
    expect(rotation.prefix).toBe(inception.prefix);                 // the identifier survives the rotation
    expect(rotation.opKeyDid).toBe(freshOpKeyDid);                  // a FRESH op-key seats
    expect(rotation.opKeyDid).not.toBe(inception.opKeyDid);         // the old key turned over
    expect(rotation.prevEventCid).toBe(inception.eventCid);         // hash-linked

    const chain: PersonaKelEvent[] = [inception, rotation];
    expect(verifyPersonaKel(chain)).toBe(true);
    expect((await verifyPersonaKelFull(chain)).ok).toBe(true);
    expect(await headOpKey(chain, { verifyQuorums: true })).toBe(freshOpKeyDid);   // LATEST head wins
  });

  test("NOTHING reconstructs — the rotation carries only PUBLIC keys + signatures, never a secret", async () => {
    const { inception, guardianRecoveryKeys, recoveryThreshold } = await foundedInception();
    const freshOpKeyDid = await didOf(SEEDS.opB);
    const guardianSigners = await Promise.all([guardianSigner(SEEDS.g1), guardianSigner(SEEDS.g3)]);
    const res = await attestAndRotate({ head: inception, freshOpKeyDid, guardianRecoveryKeys, recoveryThreshold, guardianSigners });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // The event's whole recovery surface is PUBLIC: the revealed pubkey roster + detached signatures. No
    // field carries share/seed material, and every signer value is a known guardian PUBLIC key.
    for (const s of res.event.rotationSigs) expect(guardianRecoveryKeys).toContain(s.signer);
    expect(res.event.recoveryRoster).toEqual(guardianRecoveryKeys);
    // The guardians signed the SAME bytes the event binds — an independent recompute matches, proving the
    // attestation rode signatures alone (no reconstruction seam exists to assemble a secret).
    const bytes = personaRotationSigningBytes(inception, freshOpKeyDid);
    for (const s of res.event.rotationSigs) {
      expect(await ed.verifyAsync(hexToBytes(s.sig), bytes, hexToBytes(s.signer))).toBe(true);
    }
    expect(bytes).toEqual(personaEventBytes({
      seq: 1, prefix: inception.prefix, opKeyDid: freshOpKeyDid,
      recoverySetHash: inception.recoverySetHash, prevEventCid: inception.eventCid,
    }));
  });

  test("k-1 signatures REFUSE (below threshold, fail-closed)", async () => {
    const { inception, guardianRecoveryKeys, recoveryThreshold } = await foundedInception(2);
    const freshOpKeyDid = await didOf(SEEDS.opB);
    const guardianSigners = await Promise.all([guardianSigner(SEEDS.g1)]);   // only 1 of a 2-of-3
    const res = await attestAndRotate({ head: inception, freshOpKeyDid, guardianRecoveryKeys, recoveryThreshold, guardianSigners });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/below-threshold|quorum/i);
  });

  test("a non-roster signer never pads the quorum; a duplicated signer counts once", async () => {
    const { inception, guardianRecoveryKeys, recoveryThreshold } = await foundedInception(2);
    const freshOpKeyDid = await didOf(SEEDS.opB);

    // g1 (real) + stranger (not in the pre-committed set): only ONE valid distinct roster signer → REFUSE.
    const withStranger = await Promise.all([guardianSigner(SEEDS.g1), guardianSigner(SEEDS.stranger)]);
    const r1 = await attestAndRotate({ head: inception, freshOpKeyDid, guardianRecoveryKeys, recoveryThreshold, guardianSigners: withStranger });
    expect(r1.ok).toBe(false);

    // g1 signing TWICE — a duplicate counts once, so still below a 2 threshold → REFUSE.
    const g1 = await guardianSigner(SEEDS.g1);
    const r2 = await attestAndRotate({ head: inception, freshOpKeyDid, guardianRecoveryKeys, recoveryThreshold, guardianSigners: [g1, g1] });
    expect(r2.ok).toBe(false);
  });

  test("a revealed roster that misses the pre-commit REFUSES (reveal mismatch)", async () => {
    const { inception, recoveryThreshold } = await foundedInception(2);
    const freshOpKeyDid = await didOf(SEEDS.opB);
    // Swap g3 for the stranger — the revealed roster's digest no longer matches recoverySetHash.
    const forgedRoster = await Promise.all([pubOf(SEEDS.g1), pubOf(SEEDS.g2), pubOf(SEEDS.stranger)]);
    const guardianSigners = await Promise.all([guardianSigner(SEEDS.g1), guardianSigner(SEEDS.g2)]);
    const res = await attestAndRotate({ head: inception, freshOpKeyDid, guardianRecoveryKeys: forgedRoster, recoveryThreshold, guardianSigners });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/reveal mismatch|does not match/i);
  });

  test("verifyRotationQuorum rejects a signature over the WRONG bytes (tamper-evident)", async () => {
    const { inception, guardianRecoveryKeys, recoveryThreshold } = await foundedInception(2);
    const freshOpKeyDid = await didOf(SEEDS.opB);
    const guardianSigners = await Promise.all([guardianSigner(SEEDS.g1), guardianSigner(SEEDS.g2)]);
    const res = await attestAndRotate({ head: inception, freshOpKeyDid, guardianRecoveryKeys, recoveryThreshold, guardianSigners });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // Re-verify the SAME sigs against a DIFFERENT seated op-key (opA) — the core bytes change → quorum fails.
    const wrongCore = {
      seq: 1, prefix: inception.prefix, opKeyDid: inception.opKeyDid,
      recoverySetHash: inception.recoverySetHash, prevEventCid: inception.eventCid,
    };
    const q = await verifyRotationQuorum(wrongCore, guardianRecoveryKeys, recoveryThreshold, res.event.rotationSigs);
    expect(q.ok).toBe(false);
  });
});

describe("persona-kel — structural break across a rotation", () => {
  test("a broken hash-link REFUSES", async () => {
    const { inception, guardianRecoveryKeys, recoveryThreshold } = await foundedInception();
    const freshOpKeyDid = await didOf(SEEDS.opB);
    const guardianSigners = await Promise.all([guardianSigner(SEEDS.g1), guardianSigner(SEEDS.g2)]);
    const res = await attestAndRotate({ head: inception, freshOpKeyDid, guardianRecoveryKeys, recoveryThreshold, guardianSigners });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const broken = { ...res.event, prevEventCid: "pkel0-wrong" };
    expect(verifyPersonaKel([inception, broken])).toBe(false);
    expect(await headOpKey([inception, broken])).toBeNull();
  });
});

describe("persona-kel — the gate-walk (pin-move mechanism, pure)", () => {
  test("an edge under the CURRENT head verifies; a rotated key still verifies; a SUPERSEDED key rejects", async () => {
    const { inception, guardianRecoveryKeys, recoveryThreshold, foundingOpKeyDid } = await foundedInception();
    const now = Date.now();
    const issuedAt  = new Date(now - 1000).toISOString();
    const expiresAt = new Date(now + 3600_000).toISOString();

    // Founding edge: opA delegates to vesselX. It chains to the inception head (opA).
    const foundingEdge = await buildDeviceDelegation({
      operatorSeed: SEEDS.opA, deviceVerifyingKey: await pubOf(SEEDS.vesselX),
      hearthTrueName: "", issuedAt, expiresAt, boundEpoch: 0,
    });
    expect(foundingEdge.operatorDid).toBe(foundingOpKeyDid);
    const g1 = await verifyEdgeAgainstPersonaKel(foundingEdge, [inception], { now });
    expect(g1.ok).toBe(true);
    expect(g1.headOpKey).toBe(foundingOpKeyDid);

    // Rotate the op-key to opB via a guardian quorum.
    const freshOpKeyDid = await didOf(SEEDS.opB);
    const guardianSigners = await Promise.all([guardianSigner(SEEDS.g1), guardianSigner(SEEDS.g2)]);
    const rot = await attestAndRotate({ head: inception, freshOpKeyDid, guardianRecoveryKeys, recoveryThreshold, guardianSigners });
    expect(rot.ok).toBe(true);
    if (!rot.ok) return;
    const chain = [inception, rot.event];

    // The recovering vessel re-issues its device edge under the FRESH op-key opB → still verifies.
    const rotatedEdge = await buildDeviceDelegation({
      operatorSeed: SEEDS.opB, deviceVerifyingKey: await pubOf(SEEDS.vesselY),
      hearthTrueName: "", issuedAt, expiresAt, boundEpoch: 0,
    });
    const g2v = await verifyEdgeAgainstPersonaKel(rotatedEdge, chain, { now });
    expect(g2v.ok).toBe(true);
    expect(g2v.headOpKey).toBe(freshOpKeyDid);

    // The OLD founding edge (signed by the SUPERSEDED opA) no longer chains to the head → REJECT.
    const stale = await verifyEdgeAgainstPersonaKel(foundingEdge, chain, { now });
    expect(stale.ok).toBe(false);
    expect(stale.headOpKey).toBe(freshOpKeyDid);
  });
});
