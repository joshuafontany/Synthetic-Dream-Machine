/**
 * lar-ws-client-adapter.test.ts — V3 peer transport integration.
 *
 * Stands a raw WebSocket "gate" (no full daemon): it issues lar:challenge,
 * verifies the relayed proof with the REAL verifyAuthProof, answers lar:auth-ok,
 * then watches for the Automerge join frame. The LarWSClientAdapter drives the
 * peer half with a light leaf identity (real Ed25519 keypair + ed25519SignerFromSeed).
 *
 * This exercises V3 C end to end at the wire: open socket → runPeerHandshake (JSON)
 * → gate verifies the gate-bound proof → auth-ok → hand the SAME socket to Automerge
 * (the binary join frame proves the handoff). No TW5/keyhive daemon required.
 *
 * The wire LarAuthMsg carries no peerPubKey (a real gate derives it from the
 * ContactCard via keyhive.receiveContactCard); the mock gate has no keyhive, so the
 * test passes the leaf's known verifying key to the gate out of band — standing in
 * for that derivation.
 */

import { describe, test, expect, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import { randomBytes, generateKeyPairSync } from "node:crypto";
import { WebSocketServer, type WebSocket as WsSocket } from "ws";
import {
  verifyAuthProof, ed25519SignerFromSeed,
  mkLarChallenge, mkLarAuthOk, mkLarAuthDenied, isLarAuthMsg,
} from "@lararium/mesh";
import type { PeerId } from "@automerge/automerge-repo";
import { LarWSClientAdapter } from "../src/lar-ws-client-adapter.js";
import type { LeafIdentity } from "../src/leaf-identity.js";

const AUD = "lar:///ha.ka.ba/@daemon";

// Generate an Ed25519 keypair via node:crypto (the node-vessel-identity pattern): returns
// the raw 32-byte seed (for ed25519SignerFromSeed) + the verifying-key hex.
function genKey(): { seed: Uint8Array; pub: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pub  = Buffer.from((publicKey.export({ format: "jwk" }) as { x: string }).x, "base64url").toString("hex");
  const seed = new Uint8Array(Buffer.from((privateKey.export({ format: "jwk" }) as { d: string }).d, "base64url"));
  return { seed, pub };
}

interface GateProbe {
  port:        number;
  authVerdict: Promise<{ ok: boolean; reason?: string }>;
  handoffSeen: Promise<boolean>;
  close:       () => Promise<void>;
}

// A raw WS gate: challenge → verify the relayed proof against the gate's OWN key
// and the leaf's known key → auth-ok|denied, then await the Automerge join (binary).
function makeGate(opts: { gatePubKey: string; peerPubKey: string; accept?: boolean }): Promise<GateProbe> {
  const accept = opts.accept ?? true;
  return new Promise((resolve) => {
    const http: Server = createServer();
    const wss = new WebSocketServer({ server: http });
    let resolveAuth!: (v: { ok: boolean; reason?: string }) => void;
    let resolveHandoff!: (v: boolean) => void;
    const authVerdict = new Promise<{ ok: boolean; reason?: string }>((r) => { resolveAuth = r; });
    const handoffSeen = new Promise<boolean>((r) => { resolveHandoff = r; });

    wss.on("connection", (ws: WsSocket) => {
      const nonce = randomBytes(32).toString("hex");
      ws.send(JSON.stringify(mkLarChallenge(nonce, opts.gatePubKey)));
      ws.on("message", (data: Buffer, isBinary: boolean) => {
        if (isBinary) { resolveHandoff(true); return; } // the Automerge join — handoff happened
        let parsed: unknown;
        try { parsed = JSON.parse(data.toString("utf8")); } catch { return; }
        if (!isLarAuthMsg(parsed)) return;
        void verifyAuthProof({
          nonce, gatePubKey: opts.gatePubKey, peerPubKey: opts.peerPubKey,
          aud: AUD, ts: parsed.ts ?? "", sig: parsed.sig,
        }).then((v) => {
          resolveAuth(v);
          ws.send(JSON.stringify(accept && v.ok ? mkLarAuthOk() : mkLarAuthDenied(v.reason ?? "denied")));
        });
      });
    });

    http.listen(0, "127.0.0.1", () => {
      const addr = http.address();
      if (!addr || typeof addr === "string") throw new Error("bad address");
      resolve({
        port: addr.port, authVerdict, handoffSeen,
        close: () => new Promise<void>((res) => wss.close(() => http.close(() => res()))),
      });
    });
  });
}

function makeLeaf(): { identity: LeafIdentity; pub: string } {
  const { seed, pub } = genKey();
  return {
    pub,
    identity: { contactCard: JSON.stringify({ dummy: true }), peerPubKey: pub, sign: ed25519SignerFromSeed(seed) },
  };
}

describe("LarWSClientAdapter — V3 peer transport handshake", () => {
  let gate: GateProbe | null = null;
  let adapter: LarWSClientAdapter | null = null;

  afterEach(async () => {
    try { adapter?.disconnect(); } catch { /* not connected */ }
    adapter = null;
    await gate?.close();
    gate = null;
  });

  test("opens socket → signs gate-bound proof → auth-ok → hands off to Automerge", async () => {
    const gatePub = genKey().pub;
    const { identity, pub } = makeLeaf();
    gate = await makeGate({ gatePubKey: gatePub, peerPubKey: pub, accept: true });

    adapter = new LarWSClientAdapter({
      url: `ws://127.0.0.1:${gate.port}`, identity, aud: AUD, gatePubKey: gatePub,
    });
    adapter.connect("smoke-peer" as PeerId);

    expect((await gate.authVerdict).ok).toBe(true);
    expect(await gate.handoffSeen).toBe(true); // the Automerge join arrived post-auth
  });

  test("a denied auth never reaches the Automerge handoff", async () => {
    const gatePub = genKey().pub;
    const { identity, pub } = makeLeaf();
    gate = await makeGate({ gatePubKey: gatePub, peerPubKey: pub, accept: false });

    adapter = new LarWSClientAdapter({
      url: `ws://127.0.0.1:${gate.port}`, identity, aud: AUD, gatePubKey: gatePub,
    });
    adapter.connect("smoke-peer" as PeerId);

    await gate.authVerdict; // a genuine proof verified ok, but the gate replies denied
    const handoff = await Promise.race([
      gate.handoffSeen,
      new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 300)),
    ]);
    expect(handoff).toBe("timeout"); // no Automerge join after a denial
  });
});
