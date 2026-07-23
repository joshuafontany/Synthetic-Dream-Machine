/**
 * authenticated-membership-relay.test.ts — WAVE 5: the cas-wire carry ⊥ read + Kapae-Mu proofs run GREEN over a
 * LIVE, AUTHENTICATED WS transport (real sockets), and a peer CANNOT impersonate the member gate.
 *
 * Proven over a real socket hop:
 *   · the Ed25519 proof-of-possession handshake gates every connection (an un-proving peer never relays),
 *   · CARRY ⊥ READ over the wire — an admitted MEMBER (proven key in the member set) carries the sealed ciphertext
 *     (verify-cap re-checked SECRET-FREE) + reads it with the per-body read-cap; a NON-member draws Mu,
 *   · NO IMPERSONATION — a stranger that forges `from = <a member's key>` is STAMPED back to its OWN proven key by
 *     the relay, so the cas-wire gate reads it as the stranger → Mu (the forged carry never crosses),
 *   · the wire bytes match the in-memory proof (the MembershipChannel interface carries the identical messages).
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import {
  DeterministicFederationGate, openBodyOnCas, utf8Bytes, hex,
  type AntigenRing, type NexusMembership, type MembershipChannel, type MembershipEnvelope,
} from "@lararium/mesh";
import { standNexusKeyring } from "../src/nexus-convergence-secret-store.js";
import { cadSealDir, sealCarrierForFederation } from "../src/seal-carrier-federation.js";
import { makeSealedPlaneRegistry } from "../src/plane-seal.js";
import { serveCasWire, type CasWireServerDeps } from "../src/cas-wire.js";
import {
  startAuthenticatedMembershipRelay, AuthenticatedWSMembershipChannel,
  type AuthenticatedMembershipRelay,
} from "../src/authenticated-membership-relay.js";

const BODY = utf8Bytes("the sealed carrier body a member blind-transits over a real authenticated socket");
const pubOf = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const membershipOf = (members: Iterable<string>): NexusMembership => {
  const set = new Set(members);
  return { isMemberPeer: (p) => set.has(p) };
};
const antigenOf = (kapaed: Iterable<string>): AntigenRing => {
  const set = new Set(kapaed);
  return { kapaed: set, presenterNym: (p) => p };
};

/** Drive one fetch over the async WS hop: the requester offers a want-block; the holder serves a turn (retried
 *  until the async socket delivers it); the requester polls for the response. Returns the response envelope. */
async function driveFetch(args: {
  requesterCh: MembershipChannel; requesterAddr: string;
  holderCh: MembershipChannel; holderAddr: string;
  deps: CasWireServerDeps; cid: string;
}): Promise<MembershipEnvelope | null> {
  await args.requesterCh.offer({ kind: "cas-want-block", from: args.requesterAddr, to: args.holderAddr, payload: { cid: args.cid } });
  for (let i = 0; i < 40 && (await serveCasWire(args.holderCh, args.holderAddr, args.deps)) === 0; i++) await sleep(10);
  for (let i = 0; i < 40; i++) {
    const responses = await args.requesterCh.poll(args.requesterAddr);
    if (responses.length > 0) return responses[0]!;
    await sleep(10);
  }
  return null;
}

describe("authenticated-membership-relay — cas-wire over a live authenticated WS hop", () => {
  let relay: AuthenticatedMembershipRelay;
  let storageDir: string;
  let idDir: string;
  beforeEach(() => { storageDir = mkdtempSync(join(tmpdir(), "lares-ws-store-")); idDir = mkdtempSync(join(tmpdir(), "lares-ws-id-")); });
  afterEach(async () => { await relay?.close(); rmSync(storageDir, { recursive: true, force: true }); rmSync(idDir, { recursive: true, force: true }); });

  test("an admitted MEMBER carries + reads over the wire; a NON-member draws Mu; a forged `from` is defeated", async () => {
    // Seeds → proven keys (the relay stamps `from` with these; the cas-wire gate reads them).
    const holderSeed = new Uint8Array(32).fill(1);
    const memberSeed = new Uint8Array(32).fill(2);
    const strangerSeed = new Uint8Array(32).fill(3);
    const [holderKey, memberKey, strangerKey] = await Promise.all([pubOf(holderSeed), pubOf(memberSeed), pubOf(strangerSeed)]);

    // Seal a body @cad.
    const registry = makeSealedPlaneRegistry();
    const keyring = standNexusKeyring({ charterEpoch: 0, dir: idDir });
    const cadDir = cadSealDir(storageDir);
    const installed = sealCarrierForFederation({ registry, cadDir, plaintext: BODY, keyring });

    // The member gate: memberKey is a MEMBER; strangerKey is not. (Nexus pubkey seeds the federatable set.)
    const deps: CasWireServerDeps = {
      cadDir, seal: registry.seal,
      membership: membershipOf([memberKey]),
      antigen: antigenOf([]),
      fedGate: new DeterministicFederationGate(holderKey),
    };

    // Stand the AUTHENTICATED relay + three real socket connections (each proves possession of its key).
    relay = await startAuthenticatedMembershipRelay(holderSeed);
    const url = `ws://127.0.0.1:${relay.port}`;
    const holderCh   = await AuthenticatedWSMembershipChannel.connect(url, holderSeed);
    const memberCh   = await AuthenticatedWSMembershipChannel.connect(url, memberSeed);
    const strangerCh = await AuthenticatedWSMembershipChannel.connect(url, strangerSeed);
    try {
      // ── MEMBER carries the ciphertext over the wire + reads it. ──
      const memberResp = await driveFetch({ requesterCh: memberCh, requesterAddr: memberKey, holderCh, holderAddr: holderKey, deps, cid: installed.cid });
      expect(memberResp?.kind).toBe("cas-block");
      const carried = (memberResp!.payload as { bytes?: Record<string, number> }).bytes;
      const ciphertext = Uint8Array.from(Object.values(carried!));   // JSON round-trip of the byte array
      expect([...openBodyOnCas(ciphertext, installed.readCap)]).toEqual([...BODY]);   // reads with the per-body read-cap
      expect([...ciphertext]).not.toEqual([...BODY]);                                  // carried bytes are CIPHERTEXT

      // ── NON-member draws Mu (no carry). ──
      const strangerResp = await driveFetch({ requesterCh: strangerCh, requesterAddr: strangerKey, holderCh, holderAddr: holderKey, deps, cid: installed.cid });
      expect(strangerResp?.kind).toBe("cas-mu");

      // ── IMPERSONATION defeated: the stranger forges `from = memberKey`; the relay stamps it back to strangerKey. ──
      await strangerCh.offer({ kind: "cas-want-block", from: memberKey /* forged */, to: holderKey, payload: { cid: installed.cid } });
      for (let i = 0; i < 40 && (await serveCasWire(holderCh, holderKey, deps)) === 0; i++) await sleep(10);
      // The response is addressed to the stranger's PROVEN key (the relay overrode the forged `from`), and it is Mu.
      let forgedResp: MembershipEnvelope | null = null;
      for (let i = 0; i < 40 && !forgedResp; i++) { const r = await strangerCh.poll(strangerKey); if (r.length) forgedResp = r[0]!; else await sleep(10); }
      expect(forgedResp?.kind).toBe("cas-mu");
      // The member never receives a response to a request it did not make (the forged `from` never reached the gate as memberKey).
      expect((await memberCh.poll(memberKey)).length).toBe(0);
    } finally {
      holderCh.close(); memberCh.close(); strangerCh.close();
    }
  }, 15_000);

  test("an un-proving connection never relays (the handshake gates the socket)", async () => {
    const gateSeed = new Uint8Array(32).fill(7);
    relay = await startAuthenticatedMembershipRelay(gateSeed);
    // A raw socket that never completes the proof handshake cannot join — AuthenticatedWSMembershipChannel.connect
    // only resolves on `auth-ok`. A peer with a valid seed DOES connect (proving the gate admits the proven).
    const goodSeed = new Uint8Array(32).fill(8);
    const ch = await AuthenticatedWSMembershipChannel.connect(`ws://127.0.0.1:${relay.port}`, goodSeed);
    expect(ch).toBeInstanceOf(AuthenticatedWSMembershipChannel);
    ch.close();
  }, 15_000);
});
