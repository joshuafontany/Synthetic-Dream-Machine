/**
 * sealed-box.test.ts — the seal-to-a-recipient primitive's SEPARATIONS, each one seen to fail before it landed.
 *
 * WHY THIS FILE EXISTS. `src/sealed-box.ts` states four laws in its own header and, until this file, carried ZERO
 * test references — `sealToRecipient` and `openFromSender` appeared in no suite in the repo. Four mutations were
 * run against the untouched package to prove that: fusing the two protocols' HKDF domains, deleting the empty-`info`
 * throw, and replacing the fresh AEAD nonce with 24 zero bytes each left the whole mesh suite GREEN. A law nothing
 * can catch is not a law the harness holds.
 *
 * THE LAWS, and the guard each one gets below:
 *   ① RANDOMIZED, on purpose — a fresh ephemeral and a fresh AEAD nonce every call (semantic security). This is the
 *     half of the deterministic/randomized pair that had no guard; `ciphertext-cas.test.ts` already holds the @cad
 *     seal's DETERMINISM. The two must never fuse behind one flag, so both ends now have a witness.
 *   ② The HKDF `info` carries the protocol domain and NEVER defaults — it alone keeps a grant-seal key and a
 *     keyring-seal key from deriving identically out of one ECDH between the same device pair at admission.
 *   ③ SEAL THROWS, OPEN WITHHOLDS — addressing nobody must never read as delivery; and every open failure draws the
 *     SAME `null`, so a caller learns nothing about which check refused.
 *   ④ The salt binds `senderPub ‖ recipientPub` ALWAYS, then the caller's session challenges — so a mismatched
 *     `extraSalt` cannot open a box.
 *
 * THE LIVE DOMAINS ARE PINNED BY LITERAL, deliberately. The two protocol constants sit module-private
 * (`persona-admit.ts:62`, `keyring-envelope.ts:35`), so the final describe seals through each protocol's PUBLIC
 * ceremony and then re-opens the raw box at a hard-coded `info` string. That pins each constant from OUTSIDE its
 * module: change either one and this file reds. A test that imported the constants would move with them and prove
 * only that a variable equals itself — which is the shape that let `kapae-antigen.test.ts` call a domain "ridden"
 * while never testing that it SEPARATES.
 *
 * THIS FILE RIDES `lararium-mesh` AND MUST STAY HERE. `packages/lararium-browser/vitest.config.ts` aliases
 * `node:crypto` to a stub; a randomness property written in the browser hull could go deterministic and pass
 * BECAUSE the property under test had been removed. The randomness guards below need the real platform RNG.
 */
import { KEYRING_ENVELOPE_SEAL_INFO, PERSONA_ADMIT_SEAL_INFO } from "../src/domains.js";
import { describe, test, expect } from "vitest";
import { x25519 } from "@noble/curves/ed25519.js";
import * as ed from "@noble/ed25519";
import {
  sealToRecipient, openFromSender, SEALED_BOX_AEAD_NONCE_LEN,
} from "../src/sealed-box.js";
import { hex, hexToBytes, utf8Bytes, base64UrlDecode } from "../src/crypto.js";
import { sealKeyringEnvelope, mintKeyringRecipient } from "../src/keyring-envelope.js";
import { mintEnrollmentOffer, sealPersonaGrant } from "../src/persona-admit.js";

const INFO_A = utf8Bytes("lar-test/protocol-a");
const INFO_B = utf8Bytes("lar-test/protocol-b");
const PLAINTEXT = utf8Bytes("the keyring rides the private lane, never the relay");

/** A fresh recipient — the secret stays here, the pubkey is what a sender addresses. */
function recipient(): { secret: Uint8Array; pub: Uint8Array } {
  const secret = x25519.utils.randomSecretKey();
  return { secret, pub: x25519.getPublicKey(secret) };
}

describe("① RANDOMIZED on purpose — the half of the seal pair that @cad is NOT", () => {
  test("two seals of the SAME plaintext to the SAME recipient under the SAME info differ in EVERY field", () => {
    const r = recipient();
    const one = sealToRecipient({ recipientPub: r.pub, plaintext: PLAINTEXT, info: INFO_A });
    const two = sealToRecipient({ recipientPub: r.pub, plaintext: PLAINTEXT, info: INFO_A });

    // A fresh AEAD nonce every call. A fixed nonce under one derived key reuses the XChaCha20 keystream, and two
    // messages sealed under it leak their plaintext XOR — the failure a round-trip test cannot see.
    expect(hex(two.aeadNonce)).not.toBe(hex(one.aeadNonce));
    // A fresh sender ephemeral every call — a repeated ephemeral would re-derive one key for both messages.
    expect(hex(two.senderEphemeralPub)).not.toBe(hex(one.senderEphemeralPub));
    // Consequence of the two above: no two seals of one body ever agree on the wire.
    expect(hex(two.ciphertext)).not.toBe(hex(one.ciphertext));
  });

  test("the nonce rides XChaCha20's full 24-byte width and is not all-zero", () => {
    const r = recipient();
    const box = sealToRecipient({ recipientPub: r.pub, plaintext: PLAINTEXT, info: INFO_A });
    expect(box.aeadNonce.length).toBe(SEALED_BOX_AEAD_NONCE_LEN);
    expect(box.aeadNonce.every((b) => b === 0)).toBe(false);
  });

  test("randomization never costs correctness — every fresh seal still round-trips", () => {
    const r = recipient();
    for (let i = 0; i < 8; i++) {
      const box = sealToRecipient({ recipientPub: r.pub, plaintext: PLAINTEXT, info: INFO_A });
      const out = openFromSender({ recipientSecret: r.secret, ...box, info: INFO_A });
      expect(out).not.toBeNull();
      expect(new TextDecoder().decode(out!)).toBe("the keyring rides the private lane, never the relay");
    }
  });
});

describe("② the HKDF info IS the cross-protocol separation", () => {
  test("an EMPTY info throws — a caller cannot omit the domain and fuse two protocols in silence", () => {
    const r = recipient();
    expect(() => sealToRecipient({ recipientPub: r.pub, plaintext: PLAINTEXT, info: new Uint8Array(0) }))
      .toThrow(/empty HKDF info/i);
  });

  test("a box sealed under info A does NOT open under info B — different domain, different key", () => {
    const r = recipient();
    const box = sealToRecipient({ recipientPub: r.pub, plaintext: PLAINTEXT, info: INFO_A });
    expect(openFromSender({ recipientSecret: r.secret, ...box, info: INFO_A })).not.toBeNull();  // positive control
    expect(openFromSender({ recipientSecret: r.secret, ...box, info: INFO_B })).toBeNull();
  });

  test("a one-BYTE difference in the domain already separates the derivation", () => {
    const r = recipient();
    const box = sealToRecipient({ recipientPub: r.pub, plaintext: PLAINTEXT, info: utf8Bytes("lar-test/x") });
    expect(openFromSender({ recipientSecret: r.secret, ...box, info: utf8Bytes("lar-test/y") })).toBeNull();
  });
});

describe("③ seal THROWS, open WITHHOLDS", () => {
  test("sealing to a malformed recipient THROWS — addressing nobody must never read as delivery", () => {
    expect(() => sealToRecipient({ recipientPub: new Uint8Array(31), plaintext: PLAINTEXT, info: INFO_A }))
      .toThrow(/32 bytes/);
    expect(() => sealToRecipient({ recipientPub: new Uint8Array(0), plaintext: PLAINTEXT, info: INFO_A }))
      .toThrow(/32 bytes/);
  });

  test("EVERY open failure draws the SAME null — the caller never learns which gate refused", () => {
    const r = recipient();
    const other = recipient();
    const box = sealToRecipient({ recipientPub: r.pub, plaintext: PLAINTEXT, info: INFO_A });

    const wrongKey   = openFromSender({ recipientSecret: other.secret, ...box, info: INFO_A });
    const wrongInfo  = openFromSender({ recipientSecret: r.secret, ...box, info: INFO_B });
    const tampered   = openFromSender({
      recipientSecret: r.secret, ...box, info: INFO_A,
      ciphertext: (() => { const c = Uint8Array.from(box.ciphertext); c[0] ^= 0xff; return c; })(),
    });
    const badEphem   = openFromSender({ ...box, recipientSecret: r.secret, senderEphemeralPub: new Uint8Array(31), info: INFO_A });
    const badNonce   = openFromSender({ ...box, recipientSecret: r.secret, aeadNonce: new Uint8Array(SEALED_BOX_AEAD_NONCE_LEN), info: INFO_A });

    // One verdict for every cause — withhold, never forge, and never name the refusing gate.
    expect([wrongKey, wrongInfo, tampered, badEphem, badNonce]).toEqual([null, null, null, null, null]);
  });

  test("a truncated ciphertext withholds rather than throwing out of the caller's hands", () => {
    const r = recipient();
    const box = sealToRecipient({ recipientPub: r.pub, plaintext: PLAINTEXT, info: INFO_A });
    expect(openFromSender({ ...box, recipientSecret: r.secret, ciphertext: box.ciphertext.slice(0, 4), info: INFO_A })).toBeNull();
  });
});

describe("④ the salt binds the pubkey pair ALWAYS, then the session challenges", () => {
  test("a mismatched extraSalt does not open — the seal pins to THIS session, not just this pairing", () => {
    const r = recipient();
    const salt = [utf8Bytes("nonce-b"), utf8Bytes("nonce-a")];
    const box = sealToRecipient({ recipientPub: r.pub, plaintext: PLAINTEXT, info: INFO_A, extraSalt: salt });

    expect(openFromSender({ recipientSecret: r.secret, ...box, info: INFO_A, extraSalt: salt })).not.toBeNull();
    expect(openFromSender({ recipientSecret: r.secret, ...box, info: INFO_A, extraSalt: [utf8Bytes("nonce-b"), utf8Bytes("other")] })).toBeNull();
    expect(openFromSender({ recipientSecret: r.secret, ...box, info: INFO_A })).toBeNull();   // salt dropped entirely
  });

  test("extraSalt ORDER is part of the binding — the same parts transposed do not open", () => {
    const r = recipient();
    const a = utf8Bytes("aaaa"), b = utf8Bytes("bbbb");
    const box = sealToRecipient({ recipientPub: r.pub, plaintext: PLAINTEXT, info: INFO_A, extraSalt: [a, b] });
    expect(openFromSender({ recipientSecret: r.secret, ...box, info: INFO_A, extraSalt: [b, a] })).toBeNull();
  });
});

describe("THE LIVE DOMAINS — each protocol's constant pinned by LITERAL, from outside its module", () => {
  // Hard-coded on purpose. Importing the constants would let a fused pair pass, because both sides of the
  // assertion would move together. These strings are the contract; changing one must red this file.
  const PERSONA_GRANT_SEAL_INFO = utf8Bytes(PERSONA_ADMIT_SEAL_INFO);
  const KEYRING_ENVELOPE_INFO   = utf8Bytes(KEYRING_ENVELOPE_SEAL_INFO);

  test("the keyring envelope derives under `lar-keyring-envelope/v2` and NOT under the grant-seal domain", () => {
    const { recipientSecret, recipientPubkey } = mintKeyringRecipient();
    const env = sealKeyringEnvelope([{ epoch: 0, secretHex: "ab".repeat(32) }], recipientPubkey);
    const box = {
      senderEphemeralPub: hexToBytes(env.senderEphemeralPubkey),
      aeadNonce:          hexToBytes(env.aeadNonce),
      ciphertext:         base64UrlDecode(env.ciphertext),
    };
    expect(openFromSender({ recipientSecret, ...box, info: KEYRING_ENVELOPE_INFO })).not.toBeNull();
    expect(openFromSender({ recipientSecret, ...box, info: PERSONA_GRANT_SEAL_INFO })).toBeNull();
  });

  test("the persona grant derives under `lar-persona-admit/v2/grant-seal` and NOT under the keyring domain", async () => {
    const deviceSeed = new Uint8Array(32).fill(9);
    const targetVesselId = hex(await ed.getPublicKeyAsync(deviceSeed));
    const { offer, secret } = mintEnrollmentOffer({ targetVesselId });

    const personaSeed = new Uint8Array(32).fill(5);
    const personaKey  = hex(await ed.getPublicKeyAsync(personaSeed));
    const { sealed } = await sealPersonaGrant({
      offer,
      personaRef:    { prefix: "lar:///ha.ka.ba/persona/test", verifyingKey: personaKey },
      personaSigner: (bytes) => ed.signAsync(bytes, personaSeed).then(hex),
    });

    const box = {
      senderEphemeralPub: hexToBytes(sealed.senderEphemeralPubkey),
      aeadNonce:          hexToBytes(sealed.aeadNonce),
      ciphertext:         base64UrlDecode(sealed.ciphertext),
    };
    // The grant additionally salts with the session challenges. This replicates the private `grantSaltParts`
    // (persona-admit.ts:175) ON PURPOSE — a change to the salt SHAPE must be mirrored here consciously, not
    // absorbed silently, which is exactly the drift an imported helper would hide.
    const salt = [hexToBytes(secret.nonceB), hexToBytes(sealed.nonceA)];

    expect(openFromSender({ recipientSecret: secret.ephemeralSecret, ...box, info: PERSONA_GRANT_SEAL_INFO, extraSalt: salt })).not.toBeNull();
    expect(openFromSender({ recipientSecret: secret.ephemeralSecret, ...box, info: KEYRING_ENVELOPE_INFO,   extraSalt: salt })).toBeNull();
  });

  test("the two live domains are not the same string", () => {
    // The blunt statement of the law, so a reader sees it without reconstructing it from the two tests above.
    expect(hex(KEYRING_ENVELOPE_INFO)).not.toBe(hex(PERSONA_GRANT_SEAL_INFO));
  });
});
