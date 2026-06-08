/**
 * auth-wire — authProofBytes (V3 proof-of-possession, the canonical what-to-sign).
 * Locks the server-bound challenge blob; the sign/verify plumbing is a later build.
 */

import { describe, test, expect } from "vitest";
import { authProofBytes } from "../src/auth-wire.js";

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

  test("binds the gate pubkey — changing it changes the bytes (server-binding / anti-relay)", () => {
    expect(authProofBytes(base)).not.toEqual(authProofBytes({ ...base, gatePubKey: "other-gate" }));
  });

  test("binds the nonce — changing it changes the bytes (anti-replay)", () => {
    expect(authProofBytes(base)).not.toEqual(authProofBytes({ ...base, nonce: "ff9900" }));
  });

  test("binds the peer pubkey — changing it changes the bytes", () => {
    expect(authProofBytes(base)).not.toEqual(authProofBytes({ ...base, peerPubKey: "imposter" }));
  });
});
