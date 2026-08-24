/**
 * ciphertext-cas.test.ts — the cad ENCRYPT-ON-CAS primitive (fork-② = A, per-Nexus convergence secret).
 *
 * Proves the load-bearing crypto invariants, secret-free where the relay stands:
 *   · cid = BLAKE3(ciphertext), algorithm-tagged (fork-①) — round-trips through parseDigest,
 *   · BLIND VERIFY — a relay recomputes BLAKE3(bytes)==cid with NO secret and NO read-cap,
 *   · per-Nexus DEDUP — same (content, secret) ⇒ same cid; DIFFERENT secret ⇒ different cid (no cross-Nexus dedup),
 *   · READ round-trip — open(seal(pt)) == pt, using the READ-CAP ALONE (never the per-Nexus secret),
 *   · the read-cap ⊥ the verify-cap — the cid reveals nothing that opens the body.
 */
import { describe, test, expect } from "vitest";
import { randomBytes } from "node:crypto";
import {
  ciphertextCid, verifyCiphertextCid, deriveMessageKey, sealBodyOnCas, openBodyOnCas,
  parseDigest, CONVERGENCE_SECRET_LEN,
} from "../src/index.js";

const secretA = new Uint8Array(randomBytes(CONVERGENCE_SECRET_LEN));
const secretB = new Uint8Array(randomBytes(CONVERGENCE_SECRET_LEN));
const body = new TextEncoder().encode("the Twain body that leaves the CRDT — a cad ciphertext shard");

describe("cid = BLAKE3(ciphertext) — the self-proving verify-cap", () => {
  test("the cid is a canonical blake3: multihash (fork-①, migration in-band)", () => {
    const { ciphertext, cid } = sealBodyOnCas(body, secretA);
    expect(parseDigest(cid)).toEqual({ algo: "blake3", hex: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(ciphertextCid(ciphertext)).toBe(cid);
  });

  test("BLIND VERIFY is secret-free — the relay proves integrity holding neither secret nor read-cap", () => {
    const { ciphertext, cid } = sealBodyOnCas(body, secretA);
    // No secret, no read-cap in scope — only the ciphertext bytes + the claimed cid.
    expect(verifyCiphertextCid(ciphertext, cid)).toBe(true);
    const tampered = ciphertext.slice(); tampered[0]! ^= 0xff;
    expect(verifyCiphertextCid(tampered, cid)).toBe(false);   // a flipped byte fails the blind verify
  });
});

describe("per-Nexus dedup (fork-② = A) — the secret partitions the address space", () => {
  test("same content + same secret ⇒ SAME cid (per-Nexus dedup)", () => {
    expect(sealBodyOnCas(body, secretA).cid).toBe(sealBodyOnCas(body, secretA).cid);
  });
  test("same content + DIFFERENT secret ⇒ DIFFERENT cid (NO cross-Nexus dedup, no confirmation-of-file leak)", () => {
    expect(sealBodyOnCas(body, secretA).cid).not.toBe(sealBodyOnCas(body, secretB).cid);
  });
  test("the read-cap is message-locked — same (content, secret) ⇒ same read-cap; different secret ⇒ different", () => {
    expect(deriveMessageKey(body, secretA)).toEqual(deriveMessageKey(body, secretA));
    expect(deriveMessageKey(body, secretA)).not.toEqual(deriveMessageKey(body, secretB));
  });
});

describe("read round-trip — the READ-CAP opens the body, the per-Nexus secret is NOT needed to read", () => {
  test("open(seal(pt)) == pt, using the read-cap alone", () => {
    const { ciphertext, readCap } = sealBodyOnCas(body, secretA);
    expect(openBodyOnCas(ciphertext, readCap)).toEqual(body);
  });
  test("a WRONG read-cap yields garbage, never the plaintext (read-cap ⊥ verify-cap)", () => {
    const { ciphertext } = sealBodyOnCas(body, secretA);
    const wrong = new Uint8Array(randomBytes(CONVERGENCE_SECRET_LEN));
    expect(openBodyOnCas(ciphertext, wrong)).not.toEqual(body);
  });
  test("an empty body seals + opens cleanly (boundary)", () => {
    const empty = new Uint8Array(0);
    const { ciphertext, cid, readCap } = sealBodyOnCas(empty, secretA);
    expect(verifyCiphertextCid(ciphertext, cid)).toBe(true);
    expect(openBodyOnCas(ciphertext, readCap)).toEqual(empty);
  });
});

describe("fail-closed — a mis-sized secret never seals", () => {
  test("a wrong-width per-Nexus secret throws (no weak seal)", () => {
    expect(() => sealBodyOnCas(body, new Uint8Array(16))).toThrow(/32 bytes/);
  });
});
