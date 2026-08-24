/**
 * mirror-paths — peer-neutral lar:/// URI → mirror-relative path projection law.
 *
 * TW5 filters, promotion ceremonies, Node disk projection, and future vessels all
 * need the same answer for "where would this canonical artifact surface in a
 * compatibility mirror?"  Mesh owns that shore; runtimes only ask.
 */

import { LARARIUM_DOC_URI, LARES_DOC_URI, LAR_PREFIX } from "./lar-uris.js";

export type MirrorPathStrategy = "lares" | "engine" | "wiki-shadow";

/**
 * The meme file extension. A meme carries memetic-wikitext, not CommonMark, so
 * `.mem` names the filetype on disk and the memetic-wikitext MIME
 * (`text/x-memetic-wikitext`) rides it.
 */
export const MEME_EXT = ".mem";

/** Strip a trailing `.mem`; pass anything else whole. */
export function stripMemeExt(value: string): string {
  return value.endsWith(MEME_EXT) ? value.slice(0, -MEME_EXT.length) : value;
}

/** True when a filename carries the meme extension. */
export function hasMemeExt(value: string): boolean {
  return value.endsWith(MEME_EXT);
}

function splitHash(value: string): [string, string | null] {
  const index = value.indexOf("#");
  return index >= 0 ? [value.slice(0, index), value.slice(index + 1)] : [value, null];
}

function withFrag(base: string, frag: string | null): string {
  return frag ? `${base}/${frag}${MEME_EXT}` : `${base}${MEME_EXT}`;
}

function larTail(uri: string): string | null {
  return uri.startsWith(LAR_PREFIX) ? uri.slice(LAR_PREFIX.length) : null;
}

/** Canonical lares-bag mirror path. */
export function laresMirrorRelPath(uri: string): string | null {
  const rest = larTail(uri);
  if (rest === null) return null;
  // THE TAIL ARRIVES KIND-SEGMENTED. `larTail` strips `lar:///ha.ka.ba/`, so what lands here reads
  // `bags/lares/…` — the segment names the plane and the slug carries no marker. A matcher testing the
  // marked form answers null for every URI the minters produce, which reads identically to "this URI
  // names no mirror" and so says nothing at all.
  const prefix = `bags/lares/`;
  if (!rest.startsWith(prefix)) return null;

  const [pathPart, frag] = splitHash(rest.slice(prefix.length));
  const base = stripMemeExt(pathPart ?? "");
  return base ? withFrag(base, frag) : null;
}

/** Canonical lararium-bag engine mirror path. */
export function engineMirrorRelPath(uri: string): string | null {
  const rest = larTail(uri);
  const prefix = `bags/lararium/`;
  if (rest === null || !rest.startsWith(prefix)) return null;

  const [pathPart, frag] = splitHash(rest.slice(prefix.length));
  const base = stripMemeExt(pathPart ?? "");
  return base ? withFrag(base, frag) : null;
}

/** Wiki-shadow path used when one mirror contains both lares and lararium bag views. */
export function wikiShadowMirrorRelPath(uri: string): string | null {
  let rest = larTail(uri);
  if (rest === null) return null;
  let dirPrefix: string;

  if (rest.startsWith(`lares/`)) {
    rest = rest.slice(`lares/`.length);
    dirPrefix = `lares/`;
  } else if (rest.startsWith(`lararium/`)) {
    rest = rest.slice(`lararium/`.length);
    dirPrefix = `lararium/`;
  } else {
    // Any other entity mirrors nowhere — one arm, because there was never a second outcome to reach.
    return null;
  }

  const [pathPart, frag] = splitHash(rest);
  const base = stripMemeExt(pathPart ?? "");
  return base ? (frag ? `${dirPrefix}${base}/${frag}${MEME_EXT}` : `${dirPrefix}${base}${MEME_EXT}`) : null;
}

export function mirrorRelPath(uri: string, strategy: MirrorPathStrategy): string | null {
  switch (strategy) {
    case "lares": return laresMirrorRelPath(uri);
    case "engine": return engineMirrorRelPath(uri);
    case "wiki-shadow": return wikiShadowMirrorRelPath(uri);
  }
}

export function mirrorStrategyForBag(targetBagId: string): MirrorPathStrategy | null {
  if (targetBagId === LARES_DOC_URI) return "lares";
  if (targetBagId === LARARIUM_DOC_URI) return "engine";
  return null;
}

export function canonicalMirrorRelPathForBag(uri: string, targetBagId: string): string | null {
  const strategy = mirrorStrategyForBag(targetBagId);
  return strategy ? mirrorRelPath(uri, strategy) : null;
}
