/**
 * mirror-paths — peer-neutral lar:/// URI → mirror-relative path projection law.
 *
 * TW5 filters, promotion ceremonies, Node disk projection, and future vessels all
 * need the same answer for "where would this canonical artifact surface in a
 * compatibility mirror?"  Mesh owns that seam; runtimes only ask.
 */

import { LARARIUM_DOC_URI, LARES_DOC_URI, LAR_PREFIX } from "./lar-uris.js";

export type MirrorPathStrategy = "lares" | "engine" | "wiki-shadow";

function splitHash(value: string): [string, string | null] {
  const index = value.indexOf("#");
  return index >= 0 ? [value.slice(0, index), value.slice(index + 1)] : [value, null];
}

function stripMd(value: string): string {
  return value.endsWith(".md") ? value.slice(0, -3) : value;
}

function withFrag(base: string, frag: string | null): string {
  return frag ? `${base}/${frag}.md` : `${base}.md`;
}

function larTail(uri: string): string | null {
  return uri.startsWith(LAR_PREFIX) ? uri.slice(LAR_PREFIX.length) : null;
}

/** Canonical @lares mirror path. Legacy unscoped ha.ka.ba paths resolve as @lares. */
export function laresMirrorRelPath(uri: string): string | null {
  let rest = larTail(uri);
  if (rest === null) return null;
  if (rest.startsWith("@lararium/")) return null;
  if (rest.startsWith("@lares/")) rest = rest.slice("@lares/".length);
  else if (rest.startsWith("@")) return null;

  const [pathPart, frag] = splitHash(rest);
  const base = stripMd(pathPart ?? "");
  return base ? withFrag(base, frag) : null;
}

/** Canonical @lararium engine mirror path. */
export function engineMirrorRelPath(uri: string): string | null {
  const rest = larTail(uri);
  if (rest === null || !rest.startsWith("@lararium/")) return null;

  const [pathPart, frag] = splitHash(rest.slice("@lararium/".length));
  const base = stripMd(pathPart ?? "");
  return base ? withFrag(base, frag) : null;
}

/** Wiki-shadow path used when one mirror contains both @lares and @lararium views. */
export function wikiShadowMirrorRelPath(uri: string): string | null {
  let rest = larTail(uri);
  if (rest === null) return null;
  let dirPrefix: string;

  if (rest.startsWith("@lares/")) {
    rest = rest.slice("@lares/".length);
    dirPrefix = "lares/";
  } else if (rest.startsWith("@lararium/")) {
    rest = rest.slice("@lararium/".length);
    dirPrefix = "lararium/";
  } else if (rest.startsWith("@")) {
    return null;
  } else {
    dirPrefix = "lares/";
  }

  const [pathPart, frag] = splitHash(rest);
  const base = stripMd(pathPart ?? "");
  return base ? (frag ? `${dirPrefix}${base}/${frag}.md` : `${dirPrefix}${base}.md`) : null;
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
