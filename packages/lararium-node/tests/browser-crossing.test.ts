/**
 * browser-crossing.test.ts — the browser↔node auth crossing, end to end at the wire.
 *
 * The two halves each had a test; the WIRING BETWEEN them did not. daemon-auth-gate.test proves the
 * real DaemonAuthGate against a STUB seam; lar-ws-client-adapter.test proves the real browser-shaped
 * LarWSClientAdapter + real verifyAuthProof against a MOCK gate. This composes all the real pieces:
 *
 *   real DaemonAuthGate  ←ws←  real LarWSClientAdapter (light Ed25519 leaf, the browser's shape)
 *          │
 *   a real AuthVerifierSeam that runs verifyAuthProof (V3 Ed25519 proof-of-possession) AND the
 *   CAPABILITY decision — is this leaf ADMITTED to the @daemon bag? — the real barrier a browser hits.
 *
 * It proves the crossing the scout found unproven: an ADMITTED leaf crosses the armed gate (the gate
 * emits its `connection` to the Automerge layer — the breath); a leaf with a valid proof but NO admit
 * (the freshly-FOUNDED anon vessel) is denied "insufficient capability" and never becomes a peer. The
 * capability is modeled as an admitted-key set — the faithful stand-in for the keyhive worker's grant
 * check (receiveContactCard + accessForDoc); the crypto (Ed25519 proof) is REAL, not stubbed.
 *
 * Gate: lar:///ha.ka.ba/lararium/node/browser-crossing
 */

import { describe, test, expect, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { WebSocketServer } from "ws";
import { verifyAuthProof, ed25519SignerFromSeed, LarWSClientAdapter } from "@lararium/mesh";
import type { AuthVerifierSeam } from "@lararium/mesh";
import type { PeerId } from "@automerge/automerge-repo";
import { DaemonAuthGate } from "../src/daemon-auth-gate.js";
import type { LeafIdentity } from "../src/leaf-identity.js";

const AUD = "lar:///ha.ka.ba/bags/@daemon";

/** An Ed25519 keypair (the node-vessel-identity pattern): raw 32-byte seed + verifying-key hex. */
function genKey(): { seed: Uint8Array; pub: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pub  = Buffer.from((publicKey.export({ format: "jwk" }) as { x: string }).x, "base64url").toString("hex");
  const seed = new Uint8Array(Buffer.from((privateKey.export({ format: "jwk" }) as { d: string }).d, "base64url"));
  return { seed, pub };
}

/** A browser-shaped leaf: a real Ed25519 signer + a ContactCard that carries its own verifying key
 *  (the faithful stand-in for keyhive.receiveContactCard deriving the peer key from the card). */
function makeLeaf(): { identity: LeafIdentity; pub: string } {
  const { seed, pub } = genKey();
  return {
    pub,
    identity: { contactCard: JSON.stringify({ peerPubKey: pub }), peerPubKey: pub, sign: ed25519SignerFromSeed(seed) },
  };
}

/**
 * The real seam the gate arms with: it runs the REAL V3 Ed25519 proof check, then the CAPABILITY
 * decision — a leaf crosses only if its key sits in the admitted set (the daemon-bag grant). A valid
 * proof is necessary but NOT sufficient; the un-admitted anon leaf is turned away here.
 */
function makeCapabilitySeam(opts: { gatePubKey: string; admitted: ReadonlySet<string> }): AuthVerifierSeam {
  return {
    async verify(cardBytes, bagUrl, _access, proof) {
      if (!proof) return { ok: false, reason: "V3 proof required" };
      const card = JSON.parse(new TextDecoder().decode(cardBytes)) as { peerPubKey?: string };
      const peerPubKey = card.peerPubKey;
      if (!peerPubKey) return { ok: false, reason: "no peer key in card" };
      const v = await verifyAuthProof({
        nonce: proof.nonce, gatePubKey: opts.gatePubKey, peerPubKey, aud: bagUrl, ts: proof.ts, sig: proof.sig,
      });
      if (!v.ok) return { ok: false, reason: v.reason ?? "proof failed" };
      // The real barrier: a valid proof proves WHO, never WHETHER-GRANTED. A founded anon leaf holds
      // a valid key but no delegation into @daemon → denied, exactly as a fresh browser vessel is.
      if (!opts.admitted.has(peerPubKey)) return { ok: false, reason: "insufficient capability (not admitted to @daemon)" };
      return { ok: true, identifier: peerPubKey };
    },
  };
}

interface GateHarness {
  gate: DaemonAuthGate;
  port: number;
  close: () => Promise<void>;
}

function standGate(): Promise<GateHarness> {
  return new Promise((resolve, reject) => {
    const http: Server = createServer();
    const wss  = new WebSocketServer({ server: http });
    const gate = new DaemonAuthGate(wss);
    http.listen(0, "127.0.0.1", () => {
      const addr = http.address();
      if (!addr || typeof addr === "string") { reject(new Error("bad address")); return; }
      resolve({
        gate, port: addr.port,
        close: () => new Promise<void>((res) => { wss.close(() => http.close(() => res())); }),
      });
    });
  });
}

describe("browser↔node crossing — real gate · real Ed25519 · real capability · real adapter", () => {
  let harness: GateHarness | null = null;
  let adapter: LarWSClientAdapter | null = null;

  afterEach(async () => {
    try { adapter?.disconnect(); } catch { /* never connected */ }
    adapter = null;
    await harness?.close();
    harness = null;
  });

  test("an ADMITTED leaf crosses the armed gate and becomes a sync peer (the breath)", async () => {
    harness = await standGate();
    const gatePub = genKey().pub;
    const { identity, pub } = makeLeaf();

    const connectionSeen = new Promise<void>((resolve) => harness!.gate.once("connection", () => resolve()));
    harness.gate.arm(makeCapabilitySeam({ gatePubKey: gatePub, admitted: new Set([pub]) }), AUD, gatePub);

    adapter = new LarWSClientAdapter({ url: `ws://127.0.0.1:${harness.port}`, identity, aud: AUD, gatePubKey: gatePub });
    adapter.connect("browser-leaf" as PeerId);

    await connectionSeen;                       // the gate handed the authed socket to Automerge
    expect(harness.gate.clients.size).toBe(1);  // the leaf is a live peer
  });

  test("a FOUNDED anon leaf (valid proof, NO admit) is denied — insufficient capability", async () => {
    harness = await standGate();
    const gatePub = genKey().pub;
    const { identity } = makeLeaf();

    let crossed = false;
    harness.gate.once("connection", () => { crossed = true; });
    // admitted set is EMPTY — the leaf's proof will verify, but it holds no @daemon grant.
    harness.gate.arm(makeCapabilitySeam({ gatePubKey: gatePub, admitted: new Set() }), AUD, gatePub);

    adapter = new LarWSClientAdapter({ url: `ws://127.0.0.1:${harness.port}`, identity, aud: AUD, gatePubKey: gatePub });
    adapter.connect("anon-leaf" as PeerId);

    // Give the handshake room to complete and be refused.
    await new Promise<void>((r) => setTimeout(r, 300));
    expect(crossed).toBe(false);                // never handed to Automerge
    expect(harness.gate.clients.size).toBe(0);  // never a peer — the real barrier held
  });

  test("a leaf that CLAIMS an admitted key but signs with the wrong seed is denied (real Ed25519)", async () => {
    harness = await standGate();
    const gatePub = genKey().pub;
    const claimed = genKey();        // the key the leaf claims + gets admitted
    const impostor = genKey();       // a DIFFERENT seed actually signs the proof

    let crossed = false;
    harness.gate.once("connection", () => { crossed = true; });
    // The claimed key IS admitted — so only the signature check can turn this leaf away.
    harness.gate.arm(makeCapabilitySeam({ gatePubKey: gatePub, admitted: new Set([claimed.pub]) }), AUD, gatePub);

    const identity: LeafIdentity = {
      contactCard: JSON.stringify({ peerPubKey: claimed.pub }),
      peerPubKey: claimed.pub,
      sign: ed25519SignerFromSeed(impostor.seed),   // signs with the WRONG seed
    };
    adapter = new LarWSClientAdapter({ url: `ws://127.0.0.1:${harness.port}`, identity, aud: AUD, gatePubKey: gatePub });
    adapter.connect("impostor-leaf" as PeerId);

    await new Promise<void>((r) => setTimeout(r, 300));
    expect(crossed).toBe(false);                // the forged proof failed verifyAuthProof
    expect(harness.gate.clients.size).toBe(0);
  });
});
