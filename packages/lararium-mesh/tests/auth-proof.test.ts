/**
 * auth-wire — authProofBytes (V3 proof-of-possession, the canonical what-to-sign)
 * + verifyAuthProof (the Ed25519 verifier half). Locks the gate-bound challenge
 * blob and proves real keys round-trip + relay/replay/tamper get rejected.
 */

import { describe, test, expect, beforeAll } from "vitest";
import * as ed25519 from "@noble/ed25519";
import {
  authProofBytes, buildAuthResponse, verifyAuthProof, runPeerHandshake,
  ed25519SignerFromSeed, AUTH_PROOF_TTL_MS,
  mkLarChallenge, mkLarAuthOk, mkLarAuthDenied,
} from "../src/auth-wire.js";
import { hex } from "../src/crypto.js";
import type { LarAuthMsg } from "../src/auth-wire.js";

const base = {
  nonce:      "ab12cd",
  gatePubKey: "gate-pk-hex",
  peerPubKey: "peer-pk-hex",
  aud:        "lar:///ha.ka.ba/@daemon",
  ts:         "2026-06-07T00:00:00Z",
};

describe("authProofBytes (V3 proof-of-possession)", () => {
  test("deterministic over the same parts", () => {
    expect(authProofBytes(base)).toEqual(authProofBytes(base));
  });

  test("binds the gate pubkey — changing it changes the bytes (gate-binding / anti-relay)", () => {
    expect(authProofBytes(base)).not.toEqual(authProofBytes({ ...base, gatePubKey: "other-gate" }));
  });

  test("binds the nonce — changing it changes the bytes (anti-replay)", () => {
    expect(authProofBytes(base)).not.toEqual(authProofBytes({ ...base, nonce: "ff9900" }));
  });

  test("binds the peer pubkey — changing it changes the bytes", () => {
    expect(authProofBytes(base)).not.toEqual(authProofBytes({ ...base, peerPubKey: "imposter" }));
  });
});

describe("buildAuthResponse (V3 peer half)", () => {
  const parts = { ...base, contactCard: "card-json" };

  test("signs exactly authProofBytes and returns a lar:auth with sig + ts", async () => {
    let signed: Uint8Array | undefined;
    const msg = await buildAuthResponse({ ...parts, sign: (b) => { signed = b; return "deadbeef"; } });
    expect(signed).toEqual(authProofBytes(base));
    expect(msg.type).toBe("lar:auth");
    expect(msg.sig).toBe("deadbeef");
    expect(msg.ts).toBe(parts.ts);
    expect(msg.contactCard).toBe("card-json");
    expect(msg.nonce).toBe(parts.nonce);
  });

  test("gate-binding carries through — a different gate pubkey changes the signed bytes", async () => {
    const cap: Uint8Array[] = [];
    await buildAuthResponse({ ...parts, sign: (b) => { cap.push(b); return "x"; } });
    await buildAuthResponse({ ...parts, gatePubKey: "other-gate", sign: (b) => { cap.push(b); return "x"; } });
    expect(cap[0]).not.toEqual(cap[1]);
  });
});

describe("runPeerHandshake (platform-blind V3 peer half)", () => {
  function seam(incoming: unknown[]) {
    const queue = [...incoming];
    const sent: LarAuthMsg[] = [];
    return {
      recv:        async () => queue.shift(),
      send:        (m: LarAuthMsg) => { sent.push(m); },
      contactCard: "card", peerPubKey: "peer-pk", gatePubKey: "gate-pk",
      aud:         "lar:///ha.ka.ba/@daemon",
      sign:        () => "sig-hex",
      now:         () => "2026-06-07T00:00:00Z",
      sent,
    };
  }

  test("challenge → signed lar:auth → auth-ok ⇒ { ok: true }", async () => {
    const s = seam([mkLarChallenge("n1"), mkLarAuthOk()]);
    const r = await runPeerHandshake(s);
    expect(r.ok).toBe(true);
    expect(s.sent).toHaveLength(1);
    expect(s.sent[0]!.type).toBe("lar:auth");
    expect(s.sent[0]!.sig).toBe("sig-hex");
    expect(s.sent[0]!.nonce).toBe("n1");
  });

  test("auth-denied ⇒ { ok:false, reason }", async () => {
    const s = seam([mkLarChallenge("n1"), mkLarAuthDenied("insufficient cap")]);
    expect(await runPeerHandshake(s)).toEqual({ ok: false, reason: "insufficient cap" });
  });

  test("wrong first message ⇒ rejects before sending anything", async () => {
    const s = seam([mkLarAuthOk()]);
    const r = await runPeerHandshake(s);
    expect(r.ok).toBe(false);
    expect(s.sent).toHaveLength(0);
  });
});

describe("verifyAuthProof (V3 verifier half — real Ed25519 keys)", () => {
  // A real peer keypair; peerPubKey = the raw 32-byte verifying-key hex.
  let peerPub: string;
  let sign: (bytes: Uint8Array) => Promise<string>;

  const challenge = {
    nonce:      "ab12cd",
    gatePubKey: "00".repeat(32),                 // stands for the verifier's own key
    aud:        "lar:///ha.ka.ba/@daemon",
    ts:         "2026-06-07T00:00:00.000Z",
  };

  // Build a signed lar:auth the way a real peer would, then verify it.
  async function signedProof(over = challenge, peer = peerPub) {
    const msg = await buildAuthResponse({
      ...over, peerPubKey: peer, contactCard: "card-json", sign,
    });
    return { sig: msg.sig, ts: msg.ts! };
  }

  beforeAll(async () => {
    const priv = ed25519.utils.randomSecretKey();
    peerPub = hex(await ed25519.getPublicKeyAsync(priv));
    sign = async (bytes) => hex(await ed25519.signAsync(bytes, priv));
  });

  test("a genuine signature over the gate-bound proof clears", async () => {
    const { sig, ts } = await signedProof();
    expect(await verifyAuthProof({ ...challenge, peerPubKey: peerPub, sig, ts }))
      .toEqual({ ok: true });
  });

  test("anti-relay: a proof signed for a DIFFERENT gate fails against this gate", async () => {
    const { sig, ts } = await signedProof({ ...challenge, gatePubKey: "11".repeat(32) });
    const r = await verifyAuthProof({ ...challenge, peerPubKey: peerPub, sig, ts });
    expect(r.ok).toBe(false);
  });

  test("anti-replay: a proof signed for a different nonce fails", async () => {
    const { sig, ts } = await signedProof({ ...challenge, nonce: "ff9900" });
    expect((await verifyAuthProof({ ...challenge, peerPubKey: peerPub, sig, ts })).ok).toBe(false);
  });

  test("imposter: a signature checked against a different peer key fails", async () => {
    const { sig, ts } = await signedProof();
    const otherPub = hex(await ed25519.getPublicKeyAsync(ed25519.utils.randomSecretKey()));
    expect((await verifyAuthProof({ ...challenge, peerPubKey: otherPub, sig, ts })).ok).toBe(false);
  });

  test("freshness window: a stale ts past the TTL is rejected when `now` is supplied", async () => {
    const { sig, ts } = await signedProof();
    const stale = Date.parse(challenge.ts) + AUTH_PROOF_TTL_MS + 1_000;
    const r = await verifyAuthProof({ ...challenge, peerPubKey: peerPub, sig, ts, now: stale });
    expect(r).toEqual({ ok: false, reason: "proof outside freshness window" });
  });

  test("freshness window: a ts within the TTL passes", async () => {
    const { sig, ts } = await signedProof();
    const fresh = Date.parse(challenge.ts) + 1_000;
    expect(await verifyAuthProof({ ...challenge, peerPubKey: peerPub, sig, ts, now: fresh }))
      .toEqual({ ok: true });
  });

  test("malformed material is rejected before crypto", async () => {
    const { sig, ts } = await signedProof();
    expect((await verifyAuthProof({ ...challenge, peerPubKey: "xyz", sig, ts })).reason)
      .toMatch(/peerPubKey/);
    expect((await verifyAuthProof({ ...challenge, peerPubKey: peerPub, sig: "ab", ts })).reason)
      .toMatch(/sig/);
  });
});

describe("ed25519SignerFromSeed (the LIGHT leaf-identity signer)", () => {
  // Proves the leaf-identity signing path end-to-end: a bare-Ed25519 signer over
  // the operator seed (what LeafIdentity.sign + LarWSClientAdapter use) produces a
  // proof the gate's verifier accepts — and the relay-binding still holds.
  test("a leaf seed-signer's proof clears the gate verifier", async () => {
    const seed   = ed25519.utils.randomSecretKey();
    const pub    = hex(await ed25519.getPublicKeyAsync(seed));
    const sign   = ed25519SignerFromSeed(seed);               // the leaf signer
    const parts  = {
      nonce: "cafe".repeat(16), gatePubKey: "00".repeat(32),
      peerPubKey: pub, aud: "lar:///ha.ka.ba/@daemon", ts: "2026-06-07T12:00:00.000Z",
    };
    const msg    = await buildAuthResponse({ ...parts, contactCard: "card", sign });
    // The gate recomputes with its OWN key (= gatePubKey here) and the card-derived
    // peer key (= pub); a genuine leaf proof clears.
    expect(await verifyAuthProof({ ...parts, sig: msg.sig, ts: msg.ts! }))
      .toEqual({ ok: true });
    // Anti-relay: a gate holding a DIFFERENT key rejects the same proof.
    expect((await verifyAuthProof({ ...parts, gatePubKey: "11".repeat(32), sig: msg.sig, ts: msg.ts! })).ok)
      .toBe(false);
  });
});
