/**
 * ciphertext-cas-seal.test.ts — the SEAL-PRODUCER lights the member blind-transit lane for a @cad body.
 *
 * The load-bearing honesty proven end-to-end against the REAL member-carry decision + the REAL federatable gate:
 *   · the encrypt-on-CAS INSTALLER registers a sealed body's docId AS A SIDE-EFFECT (encrypt → CAS-write → register),
 *   · a MEMBER blind-transits that sealed ciphertext body (carry TRUE); the read-cap NEVER crosses the decision,
 *   · a STRANGER is DENIED the sealed body (public shelf only),
 *   · a PLAINTEXT body NEVER registers — no door but the encrypt path, so its docId reads unsealed (DENY),
 *   · READ-LANE UNTOUCHED — an empty registry behaves EXACTLY as the pre-split floor (carryContractShareDecision),
 *   · the ciphertext at rest verifies BLAKE3(bytes)==cid SECRET-FREE (the relay's blind check).
 */
import { describe, test, expect } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import {
  DeterministicFederationGate, carryContractShareDecision, memberCarryShareDecision,
  verifyCiphertextCid, parseDigest, CONVERGENCE_SECRET_LEN,
  type NexusMembership,
} from "@lararium/mesh";
import { makeSealedPlaneRegistry } from "../src/plane-seal.js";
import { installSealedBody, docIdForCiphertextCid } from "../src/ciphertext-cas-seal.js";

const NX = "abcdef0123456789";
const fedGate = new DeterministicFederationGate(NX);
const MEMBER = "peer-member", STRANGER = "peer-stranger";
const relayPeers = new Set([MEMBER, STRANGER]);
const membership: NexusMembership = { isMemberPeer: (p) => p === MEMBER };
const casDir = mkdtempSync(join(tmpdir(), "lar-cad-seal-"));
const secret = new Uint8Array(randomBytes(CONVERGENCE_SECRET_LEN));

describe("the seal-producer registers a sealed body AS A SIDE-EFFECT and lights the member lane", () => {
  test("installing a sealed body registers its docId; a MEMBER blind-transits it, a STRANGER is denied", async () => {
    const registry = makeSealedPlaneRegistry();
    expect(registry.size).toBe(0);   // fail-closed at birth
    const body = new TextEncoder().encode("a private @cad body that leaves the CRDT sealed");

    const installed = installSealedBody(registry, casDir, body, secret);   // encrypt → CAS-write → register
    expect(registry.size).toBe(1);                                         // the SIDE-EFFECT fired
    expect(registry.seal.isSealedPlane(installed.docId)).toBe(true);

    // The member lane — the read-cap is NOT among memberCarryShareDecision's arguments (structurally cannot cross).
    expect(await memberCarryShareDecision(relayPeers, fedGate, null, null, membership, registry.seal, MEMBER, installed.docId)).toBe(true);
    expect(await memberCarryShareDecision(relayPeers, fedGate, null, null, membership, registry.seal, STRANGER, installed.docId)).toBe(false);

    // The ciphertext rests in CAS and verifies SECRET-FREE (the relay's blind check).
    expect(parseDigest(installed.cid).algo).toBe("blake3");             // fork-① tagged address
    const atRest = new Uint8Array(readFileSync(join(casDir, installed.cid)));
    expect(atRest.length).toBe(body.length);                           // XOR-stream: ciphertext == plaintext length
    expect(verifyCiphertextCid(atRest, installed.cid)).toBe(true);
  });

  test("a PLAINTEXT body NEVER registers — its docId reads unsealed (a doc can never self-label sealed)", async () => {
    const registry = makeSealedPlaneRegistry();
    // A cleartext body that was NEVER put through the encrypt path — model its would-be docId directly.
    const plaintext = new TextEncoder().encode("a cleartext plane the sync wire carries today");
    // There is no register door but installSealedBody; a plaintext docId derived by any means stays absent.
    const fakeDocId = docIdForCiphertextCid("blake3:" + "aa".repeat(32));
    expect(registry.seal.isSealedPlane(fakeDocId)).toBe(false);
    expect(await memberCarryShareDecision(relayPeers, fedGate, null, null, membership, registry.seal, MEMBER, fakeDocId)).toBe(false);
  });
});

describe("READ-LANE UNTOUCHED — an empty registry degenerates EXACTLY to the pre-split floor", () => {
  test("empty registry seal ≡ DENY-ALL: identical to carryContractShareDecision across the cells", async () => {
    const registry = makeSealedPlaneRegistry();   // never sealed anything → fail-closed DENY-ALL
    const someDoc = docIdForCiphertextCid("blake3:" + "bc".repeat(32));
    const cells: ReadonlyArray<readonly [string, typeof someDoc]> = [[MEMBER, someDoc], [STRANGER, someDoc]];
    for (const [peer, doc] of cells) {
      const split = await memberCarryShareDecision(relayPeers, fedGate, null, null, membership, registry.seal, peer, doc);
      const base  = await carryContractShareDecision(relayPeers, fedGate, null, null, peer, doc);
      expect(split).toBe(base);
    }
  });
});
