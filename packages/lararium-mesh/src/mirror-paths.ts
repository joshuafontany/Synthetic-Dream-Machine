/**
 * mirror-paths — peer-neutral lar:/// URI → mirror-relative path projection law.
 *
 * TW5 filters, promotion ceremonies, Node disk projection, and future vessels all
 * need the same answer for "where would this canonical artifact surface in a
 * compatibility mirror?"  Mesh owns that seam; runtimes only ask.
 */

import { LARARIUM_DOC_URI, LARES_DOC_URI, LAR_PREFIX } from "./lar-uris.js";

export type MirrorPathStrategy = "lares" | "engine" | "wiki-shadow";

/**
 * Meme file extensions the disk layer reads. A meme carries memetic-wikitext,
 * not CommonMark, so `.mem` names the truth; `.md` reads as the legacy form
 * during the .mem migration (dual-accept). `MEME_WRITE_EXT` names the extension
 * the projector emits — it holds at `.md` until the corpus rename flips it.
 */
export const MEME_EXTS = [".mem", ".md"] as const;
export const MEME_WRITE_EXT = ".md";

/** Strip a trailing meme extension (`.mem` or `.md`); pass anything else whole. */
export function stripMemeExt(value: string): string {
  for (const ext of MEME_EXTS) if (value.endsWith(ext)) return value.slice(0, -ext.length);
  return value;
}

/** True when a filename carries a meme extension (`.mem` or `.md`). */
export function hasMemeExt(value: string): boolean {
  return MEME_EXTS.some((ext) => value.endsWith(ext));
}

function splitHash(value: string): [string, string | null] {
  const index = value.indexOf("#");
  return index >= 0 ? [value.slice(0, index), value.slice(index + 1)] : [value, null];
}

function withFrag(base: string, frag: string | null): string {
  return frag ? `${base}/${frag}${MEME_WRITE_EXT}` : `${base}${MEME_WRITE_EXT}`;
}

function larTail(uri: string): string | null {
  return uri.startsWith(LAR_PREFIX) ? uri.slice(LAR_PREFIX.length) : null;
}

/** Canonical @lares mirror path. */
export function laresMirrorRelPath(uri: string): string | null {
  const rest = larTail(uri);
  if (rest === null) return null;
  const prefix = `@lares/`;
  if (!rest.startsWith(prefix)) return null;

  const [pathPart, frag] = splitHash(rest.slice(prefix.length));
  const base = stripMemeExt(pathPart ?? "");
  return base ? withFrag(base, frag) : null;
}

/** Canonical @lararium engine mirror path. */
export function engineMirrorRelPath(uri: string): string | null {
  const rest = larTail(uri);
  const prefix = `@lararium/`;
  if (rest === null || !rest.startsWith(prefix)) return null;

  const [pathPart, frag] = splitHash(rest.slice(prefix.length));
  const base = stripMemeExt(pathPart ?? "");
  return base ? withFrag(base, frag) : null;
}

/** Wiki-shadow path used when one mirror contains both @lares and @lararium views. */
export function wikiShadowMirrorRelPath(uri: string): string | null {
  let rest = larTail(uri);
  if (rest === null) return null;
  let dirPrefix: string;

  if (rest.startsWith(`@lares/`)) {
    rest = rest.slice(`@lares/`.length);
    dirPrefix = `lares/`;
  } else if (rest.startsWith(`@lararium/`)) {
    rest = rest.slice(`@lararium/`.length);
    dirPrefix = `lararium/`;
  } else if (rest.startsWith("@")) {
    return null;
  } else {
    return null;
  }

  const [pathPart, frag] = splitHash(rest);
  const base = stripMemeExt(pathPart ?? "");
  return base ? (frag ? `${dirPrefix}${base}/${frag}${MEME_WRITE_EXT}` : `${dirPrefix}${base}${MEME_WRITE_EXT}`) : null;
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
