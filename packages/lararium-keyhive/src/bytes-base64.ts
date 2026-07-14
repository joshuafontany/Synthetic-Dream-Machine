/**
 * bytes-base64 — the one base64 codec the keyhive event path shares.
 *
 * Cap events cross the daemon doc as base64 text (a tiddler holds no bytes). The founding ceremony writes
 * them and the daemon event-store reads them, so both need the SAME codec — one home keeps the encode and
 * decode from drifting apart. `btoa`/`atob` run in both node and the browser, so this stays platform-blind.
 */

/** Encode raw bytes as a base64 string (latin1 round-trip through btoa). */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

/** Decode a base64 string back to raw bytes. */
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
