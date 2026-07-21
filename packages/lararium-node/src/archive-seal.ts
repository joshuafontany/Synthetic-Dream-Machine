/**
 * archive-seal (node atom) — seal / unseal the keyhive secret archive at rest (G1).
 *
 * The archive carries RAW prekey secret material. This wraps it in an AES-256-GCM envelope
 * (`@lararium/mesh` frames the layout) so a stolen disk yields ciphertext, not the sovereign
 * identity's secrets. AEAD = authenticated: a flipped byte or a wrong key fails `final()` —
 * a tamper reads as a hard error, never silent plaintext.
 *
 * KEK POLICY (operator ruling 2026-07-16 — passphrase-primary, keychain-conditional): the
 * key-encryption-key derives from an operator PASSPHRASE via scrypt (pure node:crypto,
 * survives a reboot — the WSL2-safe default, since an OS keychain there can land the KEK in
 * the kernel's in-memory keyutils cache and brick the identity on reboot). The OS-keychain
 * leg rides a named, detection-gated seam (`detectSecretService`) that stays inert until the
 * `@napi-rs/keyring` binding lands — it NEVER silently degrades to weak key handling.
 *
 * HONEST FALLBACK: with no passphrase configured, the archive stays CLEARTEXT (bare bytes,
 * unchanged behaviour) with a one-time warning — a random key stored beside the ciphertext
 * would be obfuscation posing as isolation, so the seam refuses it rather than fake safety.
 *
 * The RECOVERY keel is device RE-ADMISSION (mint a fresh device key, re-admit through the
 * mesh/group — the Ink&Switch/Fission model), not this at-rest seal. Sealing is hygiene.
 */

import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "node:crypto";
import {
  encodeEnvelope, decodeEnvelope, isSealedEnvelope,
  type ArchiveSealMode, type SealedEnvelope,
} from "@lararium/mesh";

/** The env var carrying the operator passphrase for the scrypt KEK (WSL2-safe default path). */
export const ARCHIVE_PASSPHRASE_ENV = "LARES_ARCHIVE_PASSPHRASE";

// scrypt work factor — N=2^17 seats the derivation at ~100ms/derive (the scout's pick). maxmem
// lifts the default 32 MiB ceiling (128·N·r bytes = 128 MiB at these params) so the derive runs.
const SCRYPT = { N: 1 << 17, r: 8, p: 1, keylen: 32, maxmem: 256 * 1024 * 1024 } as const;
const IV_LEN = 12;   // GCM-recommended nonce width
const SALT_LEN = 16;

/** Derive a 32-byte KEK from a passphrase + salt (scrypt). Deterministic for a (pass, salt) pair. */
export function scryptKek(passphrase: string, salt: Uint8Array): Buffer {
  return scryptSync(passphrase, Buffer.from(salt), SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: SCRYPT.maxmem });
}

/** AES-256-GCM seal: fresh IV per call (GCM IV-reuse under one key is catastrophic). */
export function sealBytes(plaintext: Uint8Array, kek: Buffer, mode: Exclude<ArchiveSealMode, "cleartext">, salt: Uint8Array): Uint8Array {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", kek, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return encodeEnvelope({ mode, salt, iv, tag, ciphertext });
}

/** AES-256-GCM unseal: verifies the auth tag — a wrong KEK or a tampered byte throws. */
export function unsealBytes(env: SealedEnvelope, kek: Buffer): Uint8Array {
  const decipher = createDecipheriv("aes-256-gcm", kek, Buffer.from(env.iv));
  decipher.setAuthTag(Buffer.from(env.tag));
  return Buffer.concat([decipher.update(Buffer.from(env.ciphertext)), decipher.final()]);
}

/**
 * The seal policy this vessel resolves at write time. `mode:"cleartext"` names the honest
 * unconfigured path (no KEK source — write bare bytes). `seal`/`unseal` carry the passphrase
 * path when configured.
 */
export interface SealPolicy {
  readonly mode: ArchiveSealMode;
  /** Seal plaintext into an envelope (absent for cleartext). */
  readonly seal?: (plaintext: Uint8Array) => Uint8Array;
  /** Unseal an envelope back to plaintext (absent for cleartext). */
  readonly unseal?: (env: SealedEnvelope) => Uint8Array;
}

/**
 * Detect a persistent OS Secret Service (the keychain leg's gate). Returns false until the
 * `@napi-rs/keyring` binding + a live sentinel round-trip land — fail-safe: unknown ⇒ absent,
 * so the resolver never trusts a keychain that might be the non-persistent keyutils cache.
 */
export function detectSecretService(): boolean {
  // Seam: a real probe checks `DBUS_SESSION_BUS_ADDRESS` owns `org.freedesktop.secrets` AND a
  // write→read→delete keychain sentinel returns. Inert until the binding is a dependency.
  return false;
}

/**
 * Resolve the seal policy. Keychain first WHEN a persistent Secret Service is detected (the
 * seam — inert today); else the passphrase path when `LARES_ARCHIVE_PASSPHRASE` is set; else
 * cleartext (honest, unchanged). A fresh scrypt salt rides every seal (stored in the envelope),
 * so re-derivation stays self-contained and no IV/salt ever repeats.
 */
export function resolveSealPolicy(env: NodeJS.ProcessEnv = process.env): SealPolicy {
  // Keychain leg (detection-gated, inert until @napi-rs/keyring lands) would slot here.
  if (detectSecretService()) { /* keychain KEK path — pending the binding */ }

  const passphrase = env[ARCHIVE_PASSPHRASE_ENV];
  if (passphrase && passphrase.length > 0) {
    return {
      mode: "passphrase",
      seal: (plaintext) => {
        const salt = randomBytes(SALT_LEN);
        return sealBytes(plaintext, scryptKek(passphrase, salt), "passphrase", salt);
      },
      unseal: (envlp) => unsealBytes(envlp, scryptKek(passphrase, envlp.salt)),
    };
  }
  return { mode: "cleartext" };
}

/**
 * SelfSovereignSecret — the Self-Only Secret Surface invariant, enforced by TYPE (civic Model 1).
 *
 * The node seals at rest ONLY its OWN sovereign identity's secret material — never a held
 * principal's (a citizen's) signing secret. A civic host that generalizes its secret-store from
 * 1 to N by omission IS the honeypot; this brand makes that omission impossible to write silently.
 * The sealer below accepts only a `SelfSovereignSecret`, and `asSelfSovereignSecret` — the single
 * brander — carries the vow in its name. A future per-principal path holding a citizen secret
 * cannot reach the sealer without an explicit, review-visible brand call that reads, on its face,
 * as wrong. Custody by TYPE, not by policy — a subpoenaed host breaks a policy promise, never a
 * compiler. For every non-self principal the node holds ciphertext + public edges, never a secret.
 */
export type SelfSovereignSecret = Uint8Array & { readonly __selfSovereign: unique symbol };

/**
 * Brand bytes as the daemon's OWN sovereign secret — the ONLY door into the at-rest sealer. CALL
 * ONLY for the self identity's own secret material; NEVER for a held/citizen principal's secret
 * (which never seals at rest — the Delivery-Service-not-Auth-Root line). A call to this from any
 * per-principal path names the honeypot out loud, where review catches it.
 */
export function asSelfSovereignSecret(bytes: Uint8Array): SelfSovereignSecret {
  return bytes as SelfSovereignSecret;
}

/**
 * Seal the daemon's OWN sovereign secret per the resolved policy, or return the bare bytes under
 * the cleartext policy. Accepts only a `SelfSovereignSecret` (self-only by type); a caller writes
 * whatever this returns and `openArchiveBytes` reads it back.
 */
export function sealArchiveBytes(plaintext: SelfSovereignSecret, policy: SealPolicy = resolveSealPolicy()): Uint8Array {
  return policy.seal ? policy.seal(plaintext) : plaintext;
}

/**
 * Open persisted archive bytes: unseal a sealed envelope, or pass BARE cleartext through
 * (unconfigured archives). A sealed envelope with no unseal policy (the passphrase
 * went missing) throws — better a loud failure than a silent empty identity.
 */
export function openArchiveBytes(stored: Uint8Array, policy: SealPolicy = resolveSealPolicy()): Uint8Array {
  if (!isSealedEnvelope(stored)) return stored; // bare cleartext — unconfigured
  const env = decodeEnvelope(stored);
  if (!policy.unseal) {
    throw new Error(
      `archive-seal: found a sealed archive (${env.mode}) but no key source is configured — ` +
      `set ${ARCHIVE_PASSPHRASE_ENV} to the passphrase that sealed it`,
    );
  }
  return policy.unseal(env);
}
