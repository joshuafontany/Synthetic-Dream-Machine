/**
 * archive-envelope — the platform-blind, self-describing frame for a SEALED secret archive
 * at rest (G1). Pure `Uint8Array` codec, no crypto: it names WHERE the salt / IV / auth-tag /
 * ciphertext sit so any vessel (node daemon today; a browser sealer later) reads the same
 * layout. The AEAD itself is the platform atom (node:crypto AES-256-GCM); this only frames it.
 *
 * A cleartext archive is written BARE (no envelope) — legacy archives and the unconfigured
 * path stay byte-identical to an unsealed write, and `isSealedEnvelope` (magic probe) tells a
 * reader whether to unseal or pass bytes through. The magic + version guard against reading a
 * raw archive as an envelope.
 *
 * Layout (all lengths single-byte, values ≤ 255):
 *   magic    4   0x4c 0x41 0x52 0x4b  ("LARK")
 *   version  1   0x01
 *   mode     1   1 = passphrase (scrypt KEK) · 2 = keychain (KEK from OS secret store)
 *   saltLen  1 · salt saltLen      (KDF salt — passphrase mode; 0 for keychain)
 *   ivLen    1 · iv   ivLen        (AEAD nonce — 12 bytes for GCM)
 *   tagLen   1 · tag  tagLen       (AEAD auth tag — 16 bytes for GCM)
 *   cipher   …rest                 (the AEAD ciphertext)
 */

export const ARCHIVE_MAGIC = Uint8Array.from([0x4c, 0x41, 0x52, 0x4b]); // "LARK"
export const ARCHIVE_VERSION = 0x01;

/** How a sealed archive's KEK was sourced. `cleartext` never rides an envelope (bare bytes). */
export type ArchiveSealMode = "cleartext" | "passphrase" | "keychain";

const MODE_CODE: Record<Exclude<ArchiveSealMode, "cleartext">, number> = { passphrase: 1, keychain: 2 };
const CODE_MODE: Record<number, ArchiveSealMode> = { 1: "passphrase", 2: "keychain" };

export interface SealedEnvelope {
  readonly mode: Exclude<ArchiveSealMode, "cleartext">;
  readonly salt: Uint8Array;
  readonly iv: Uint8Array;
  readonly tag: Uint8Array;
  readonly ciphertext: Uint8Array;
}

/** True when `bytes` carries the sealed-archive magic + a known version. */
export function isSealedEnvelope(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === ARCHIVE_MAGIC[0] && bytes[1] === ARCHIVE_MAGIC[1] &&
    bytes[2] === ARCHIVE_MAGIC[2] && bytes[3] === ARCHIVE_MAGIC[3] &&
    bytes[4] === ARCHIVE_VERSION
  );
}

/** Frame the sealed parts into the self-describing envelope. Each length field caps at 255. */
export function encodeEnvelope(env: SealedEnvelope): Uint8Array {
  for (const [name, part] of [["salt", env.salt], ["iv", env.iv], ["tag", env.tag]] as const) {
    if (part.length > 255) throw new RangeError(`archive-envelope: ${name} length ${part.length} > 255`);
  }
  const head = [
    ...ARCHIVE_MAGIC, ARCHIVE_VERSION, MODE_CODE[env.mode],
    env.salt.length, ...env.salt,
    env.iv.length, ...env.iv,
    env.tag.length, ...env.tag,
  ];
  const out = new Uint8Array(head.length + env.ciphertext.length);
  out.set(head, 0);
  out.set(env.ciphertext, head.length);
  return out;
}

/** Parse a sealed envelope. Throws on bad magic / version / truncation — never a silent tear. */
export function decodeEnvelope(bytes: Uint8Array): SealedEnvelope {
  if (!isSealedEnvelope(bytes)) throw new Error("archive-envelope: bad magic / version — not a sealed archive");
  let off = 5; // past magic(4) + version(1)
  const mode = CODE_MODE[bytes[off++]!];
  if (mode === undefined || mode === "cleartext") throw new Error("archive-envelope: unknown seal mode");
  const take = (label: string): Uint8Array => {
    if (off >= bytes.length) throw new Error(`archive-envelope: truncated before ${label} length`);
    const len = bytes[off++]!;
    if (off + len > bytes.length) throw new Error(`archive-envelope: ${label} length ${len} overruns`);
    const slice = bytes.subarray(off, off + len);
    off += len;
    return slice;
  };
  const salt = take("salt");
  const iv = take("iv");
  const tag = take("tag");
  const ciphertext = bytes.subarray(off);
  return { mode, salt, iv, tag, ciphertext };
}
