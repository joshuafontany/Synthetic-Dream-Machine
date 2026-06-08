/**
 * auth-wire — authProofBytes (V3 proof-of-possession, the canonical what-to-sign).
 * Locks the gate-bound challenge blob; the sign/verify plumbing is a later build.
 */

import { describe, test, expect } from "vitest";
import {
  authProofBytes, buildAuthResponse, runPeerHandshake,
  mkLarChallenge, mkLarAuthOk, mkLarAuthDenied,
} from "../src/auth-wire.js";
import type { LarAuthMsg } from "../src/auth-wire.js";

const base = {
  nonce:      "ab12cd",
  gatePubKey: "gate-pk-hex",
  peerPubKey: "peer-pk-hex",
  aud:        "lar:///ha.ka.ba/@admin",
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
      aud:         "lar:///ha.ka.ba/@admin",
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
