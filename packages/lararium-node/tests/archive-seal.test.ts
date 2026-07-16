/**
 * G1 — the keyhive archive seals at rest. AES-256-GCM round-trips through the envelope; a
 * tampered byte or a wrong passphrase FAILS the auth tag (never silent plaintext); an
 * unconfigured vessel leaves bytes bare (cleartext pass-through); a sealed archive with no
 * key source throws LOUD rather than reading a silent-empty identity.
 */
import { describe, expect, test } from "vitest";

import { isSealedEnvelope, decodeEnvelope } from "@lararium/mesh";
import {
  scryptKek, sealBytes, unsealBytes,
  resolveSealPolicy, sealArchiveBytes, openArchiveBytes,
  ARCHIVE_PASSPHRASE_ENV,
} from "../src/archive-seal.js";

const SECRET = Uint8Array.from([0x85, 0x6f, 0x4a, 0x83, 1, 2, 3, 4, 5, 6, 7, 8]);
const PASS = "correct horse battery staple";

describe("AES-256-GCM seal round-trip", () => {
  test("seal then unseal recovers the exact plaintext", () => {
    const salt = Uint8Array.from(Array(16).fill(7));
    const kek = scryptKek(PASS, salt);
    const env = decodeEnvelope(sealBytes(SECRET, kek, "passphrase", salt));
    expect([...unsealBytes(env, kek)]).toEqual([...SECRET]);
  });

  test("a wrong passphrase fails the auth tag (throws, no plaintext)", () => {
    const salt = Uint8Array.from(Array(16).fill(7));
    const sealed = sealBytes(SECRET, scryptKek(PASS, salt), "passphrase", salt);
    const env = decodeEnvelope(sealed);
    expect(() => unsealBytes(env, scryptKek("wrong pass", salt))).toThrow();
  });

  test("a tampered ciphertext byte fails the auth tag", () => {
    const salt = Uint8Array.from(Array(16).fill(3));
    const kek = scryptKek(PASS, salt);
    const env = decodeEnvelope(sealBytes(SECRET, kek, "passphrase", salt));
    const bad = { ...env, ciphertext: Uint8Array.from(env.ciphertext) };
    bad.ciphertext[0] ^= 0xff;
    expect(() => unsealBytes(bad, kek)).toThrow();
  });

  test("each seal uses a fresh IV (no nonce reuse under one key)", () => {
    const salt = Uint8Array.from(Array(16).fill(1));
    const kek = scryptKek(PASS, salt);
    const a = decodeEnvelope(sealBytes(SECRET, kek, "passphrase", salt));
    const b = decodeEnvelope(sealBytes(SECRET, kek, "passphrase", salt));
    expect([...a.iv]).not.toEqual([...b.iv]);
  });
});

describe("seal policy + archive open", () => {
  test("passphrase env → sealed envelope; open recovers plaintext", () => {
    const policy = resolveSealPolicy({ [ARCHIVE_PASSPHRASE_ENV]: PASS } as NodeJS.ProcessEnv);
    expect(policy.mode).toBe("passphrase");
    const stored = sealArchiveBytes(SECRET, policy);
    expect(isSealedEnvelope(stored)).toBe(true);
    expect([...openArchiveBytes(stored, policy)]).toEqual([...SECRET]);
  });

  test("no passphrase → cleartext bare bytes (unchanged behaviour, pass-through)", () => {
    const policy = resolveSealPolicy({} as NodeJS.ProcessEnv);
    expect(policy.mode).toBe("cleartext");
    const stored = sealArchiveBytes(SECRET, policy);
    expect(isSealedEnvelope(stored)).toBe(false);
    expect([...stored]).toEqual([...SECRET]);          // bare
    expect([...openArchiveBytes(stored, policy)]).toEqual([...SECRET]);
  });

  test("a legacy cleartext archive opens under a passphrase policy (bare pass-through)", () => {
    const passPolicy = resolveSealPolicy({ [ARCHIVE_PASSPHRASE_ENV]: PASS } as NodeJS.ProcessEnv);
    expect([...openArchiveBytes(SECRET, passPolicy)]).toEqual([...SECRET]); // no magic → bare
  });

  test("a sealed archive with NO key source throws loud (never silent-empty)", () => {
    const sealed = sealArchiveBytes(SECRET, resolveSealPolicy({ [ARCHIVE_PASSPHRASE_ENV]: PASS } as NodeJS.ProcessEnv));
    const cleartextPolicy = resolveSealPolicy({} as NodeJS.ProcessEnv);
    expect(() => openArchiveBytes(sealed, cleartextPolicy)).toThrow(new RegExp(ARCHIVE_PASSPHRASE_ENV));
  });
});
