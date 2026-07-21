/**
 * recovery-readmit.test — the recovery keel end to end (layer 1 → layer 3), pure: a lost citizen's
 * PersonaGroup root is SPLIT into a {device, recorded-code} quorum, RECONSTRUCTED, and re-admits a FRESH
 * device via runReadmitEdge (the admit ceremony, signer swapped). The fresh device's edge verifies
 * against the ORIGINAL pinned root — re-admission is byte-identical to admit (isomorphism). And a bare
 * seed cannot mint a re-admit: recovery MUST pass the quorum gate (the type wall).
 */
import { describe, test, expect } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import * as ed25519 from "@noble/ed25519";
import { splitToShares, assembleQuorum, reconstructFromQuorum, verifyDeviceDelegation, personaPrefixOf } from "@lararium/mesh";
import { runReadmitEdge } from "@lararium/keyhive";

/** The lost citizen's PersonaGroup root (the "become you" atom). */
const ROOT = Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 61 + 13) & 0xff));
const PLACE = "bafkreic7r3jrao44srh5bp47uryotaqp62bnmovzpqccbfy2kclf447bra";

function seededRng(seed: number) {
  let s = seed >>> 0;
  return {
    getRandomValues<T extends Uint8Array<ArrayBuffer>>(arr: T): T {
      for (let i = 0; i < arr.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; arr[i] = (s >>> 24) & 0xff; }
      return arr;
    },
    randomUUID(): string { return "00000000-0000-0000-0000-000000000000"; },
  };
}

/** A fresh device's Ed25519 verifying-key hex (the disposable key the drowned one is replaced by). */
function freshDeviceKey(): string {
  const { publicKey } = generateKeyPairSync("ed25519");
  return Buffer.from((publicKey.export({ format: "jwk" }) as { x: string }).x, "base64url").toString("hex");
}

describe("recovery keel — quorum → reconstruct → re-admit a fresh device", () => {
  test("the recovery happy path: the reconstructed root re-admits a fresh device, edge verifies against the pinned root", async () => {
    // Layer 1: the root was split {device, recorded-code}; the citizen reconstructs it from the quorum.
    const shares = splitToShares(ROOT, 2, ["device", "recorded-code"], 1, seededRng(7));
    const reconstructedRoot = reconstructFromQuorum(assembleQuorum(shares, 2));
    expect([...reconstructedRoot]).toEqual([...ROOT]);   // the recovered root === the original

    // Layer 3: the reconstructed root signs a FRESH device's re-admit edge (admit ceremony, signer swapped).
    // In Fork-A reconstruct the op-key does NOT rotate — the reconstructed root IS the KEL head — so the
    // re-admit carries the persona's stable inception prefix over (root op-key + unarmed recovery-commit).
    const freshVK = freshDeviceKey();
    const rootDidPin = `0x${Buffer.from(await ed25519.getPublicKeyAsync(ROOT)).toString("hex")}`;
    const payload = await runReadmitEdge({
      reconstructedRoot,
      joineeVerifyingKey: freshVK,
      personaKelPrefix: personaPrefixOf(rootDidPin, ""),
      hearthTrueName: PLACE,
      personaGroupDocIdHex: "aa".repeat(32),
      personaGroupAgentIdHex: "bb".repeat(32),
      meshCabalDocIdHex: "cc".repeat(32),
      syncUrl: null,
    });

    // The re-admit edge verifies against the ORIGINAL root's DID (independently derived) — the Handle's
    // pinned signer is unchanged, so the joinee accepts it at the same Binding Gate.
    const rootDid = `0x${Buffer.from(await ed25519.getPublicKeyAsync(ROOT)).toString("hex")}`;
    expect(payload.signerDid).toBe(rootDid);
    expect(payload.deviceEdge.deviceVerifyingKey).toBe(freshVK);
    expect((await verifyDeviceDelegation(payload.deviceEdge, rootDid)).ok).toBe(true);
    // A DIFFERENT root would NOT verify — the edge is bound to the recovered root, not any signer.
    expect((await verifyDeviceDelegation(payload.deviceEdge, `0x${"ff".repeat(32)}`)).ok).toBe(false);
  });

  test("a bare seed cannot mint a re-admit edge — recovery must pass the quorum gate (the type wall)", () => {
    const bareSeed = new Uint8Array(32).fill(9);
    // @ts-expect-error — runReadmitEdge accepts only a ReadmissionSecret (branded by reconstructFromQuorum).
    // A raw Uint8Array is rejected at COMPILE time: a re-admit cannot be signed from a bare seed, only
    // from a quorum-reconstructed root. If this line stops erroring, the recovery quorum gate is gone.
    void (() => runReadmitEdge({
      reconstructedRoot: bareSeed, joineeVerifyingKey: "aa".repeat(32), hearthTrueName: "",
      personaGroupDocIdHex: "", personaGroupAgentIdHex: "", meshCabalDocIdHex: "", syncUrl: null,
    }));
  });
});
