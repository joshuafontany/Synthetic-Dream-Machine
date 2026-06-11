/**
 * bag-paths — URI → mirror-relative-path factories.
 *
 * The named-bag layout (`bags/@NAME/v0.1`) makes per-scope path computation
 * derivable from the bag scope alone. No oracle tiddler `path-filter` field
 * needed. Factories are pure functions; no I/O, no module state.
 */

import { resolve as resolvePath, join as joinPath, dirname, basename, isAbsolute } from "path";

export type MirrorPathFn = (uri: string) => string | null;

export interface BagMirrorConfig {
  /** The bag whose changes this mirror reflects. */
  readonly bagId: string;
  /** Absolute filesystem path; all writes are constrained under this root. */
  readonly mirrorRoot: string;
  /** URI → relative path under mirrorRoot. */
  readonly toRelPath: MirrorPathFn;
  /**
   * Widened grant (capability, rides the manifest's diskMirrors): the mirror
   * MAY place files DIRECTLY in the root-bags-dir — the nearest ancestor of
   * mirrorRoot named `bags`, the dir holding every @{bagname} subdir — one
   * level up. It MUST NEVER escape the bags dir or write inside another
   * bag's subdir; `confineMirrorWrite` enforces this structurally
   * (dirname(candidate) === bagsDir exactly). Default: own subdir only.
   */
  readonly allowBagsRootFiles?: boolean;
}

// ── Write confinement — the sovereign-island disk ward ─────────────────────
//
// Cascade tiddlers (config/disk-paths overlays) compose through the RECIPE —
// a library bag can overlay them — so every relative path reaching the
// projector counts as UNTRUSTED input. Policy lives in the cascade; this gate
// (the mechanism) holds at the write choke-point regardless of what the
// cascade emitted.

export type ConfineResult =
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly reason: string };

/** Nearest ancestor of `root` whose basename reads `bags`, or null. */
function findBagsDir(root: string): string | null {
  let dir = root;
  for (;;) {
    if (basename(dir) === "bags") return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Confine a mirror write. Allowed:
 *   - any path resolving UNDER mirrorRoot (the bag's own subdir), or
 *   - with `allowBagsRootFiles`: a file DIRECTLY in the root-bags-dir
 *     (never inside another bag's subdir, never above bags, never deeper).
 * Everything else refuses with a reason the projector surfaces loudly.
 */
export function confineMirrorWrite(
  mirrorRoot: string,
  relPath: string,
  allowBagsRootFiles = false,
): ConfineResult {
  if (isAbsolute(relPath)) return { ok: false, reason: `absolute path refused: ${relPath}` };
  const root      = resolvePath(mirrorRoot);
  const candidate = resolvePath(joinPath(root, relPath));
  if (candidate === root) return { ok: false, reason: "write to mirror root itself refused" };
  if (candidate.startsWith(root + "/")) return { ok: true, path: candidate };
  if (allowBagsRootFiles) {
    const bagsDir = findBagsDir(root);
    if (!bagsDir) return { ok: false, reason: `mirror root carries no bags ancestor; widened grant inert (${root})` };
    if (dirname(candidate) === bagsDir) return { ok: true, path: candidate };
    return { ok: false, reason: `widened grant covers files DIRECTLY in ${bagsDir} only — refused: ${candidate}` };
  }
  return { ok: false, reason: `escapes mirror root ${root}: ${candidate}` };
}

const HA_KA_BA_PREFIX = "lar:///ha.ka.ba/";
const BAG_VERSION = "v0.1";

function splitHash(s: string): [string, string | null] {
  const i = s.indexOf("#");
  return i >= 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, null];
}

function toRelMd(pathPart: string, frag: string | null): string {
  const base = pathPart.endsWith(".md") ? pathPart.slice(0, -3) : pathPart;
  return frag ? `${base}/${frag}.md` : `${base}.md`;
}

function canonicalNamedBagRelPath(scope: string, uri: string): string | null {
  if (!uri.startsWith(HA_KA_BA_PREFIX)) return null;

  const bare = uri.slice(HA_KA_BA_PREFIX.length);
  if (!bare) return null;

  if (scope === "@lares") {
    const prefix = `${scope}/${BAG_VERSION}/`;
    if (!bare.startsWith(prefix)) return null;
    const rest = bare.slice(prefix.length);

    const [pathPart, frag] = splitHash(rest);
    return pathPart ? toRelMd(pathPart, frag) : null;
  }

  if (scope === "@lararium") {
    const prefix = `${scope}/${BAG_VERSION}/`;
    if (!bare.startsWith(prefix)) return null;
    const [pathPart, frag] = splitHash(bare.slice(prefix.length));
    return pathPart ? toRelMd(pathPart, frag) : null;
  }

  return null;
}

/**
 * Factory for single-scope named bags (e.g. "@lares", "@lararium").
 *
 * Maps `lar:///ha.ka.ba/@SCOPE/v0.1/X` → `X.md` relative to the bag mirror root.
 * Returns null for any URI outside the scope.
 */
export function namedBagPath(scope: string): MirrorPathFn {
  const prefix = `${HA_KA_BA_PREFIX}${scope}/${BAG_VERSION}/`;
  return (uri) => {
    const canonical = canonicalNamedBagRelPath(scope, uri);
    if (canonical) return canonical;
    if (!uri.startsWith(prefix)) return null;
    const rest = uri.slice(prefix.length);
    if (!rest) return null;
    const [pathPart, frag] = splitHash(rest);
    return toRelMd(pathPart, frag);
  };
}

/**
 * Factory for wiki shadow bags (corpus view inside a wiki).
 *
 * Maps:
 *   `lar:///ha.ka.ba/@lares/v0.1/X`      → `lares/v0.1/X.md`
 *   `lar:///ha.ka.ba/@lararium/v0.1/X`   → `lararium/v0.1/X.md`
 *
 * Returns null for URIs outside `lar:///ha.ka.ba/`.
 */
export function wikiBagPath(): MirrorPathFn {
  const LARES_SCOPE    = `@lares/${BAG_VERSION}/`;
  const LARARIUM_SCOPE = `@lararium/${BAG_VERSION}/`;
  return (uri) => {
    if (!uri.startsWith(HA_KA_BA_PREFIX)) return null;
    let rest = uri.slice(HA_KA_BA_PREFIX.length);
    let dirPrefix: string;

    if (rest.startsWith(LARES_SCOPE)) {
      rest = rest.slice(LARES_SCOPE.length);
      dirPrefix = `lares/${BAG_VERSION}/`;
    } else if (rest.startsWith(LARARIUM_SCOPE)) {
      rest = rest.slice(LARARIUM_SCOPE.length);
      dirPrefix = `lararium/${BAG_VERSION}/`;
    } else if (rest.startsWith("@")) {
      return null;
    } else {
      return null;
    }

    if (!rest) return null;
    const [pathPart, frag] = splitHash(rest);
    const rel = toRelMd(pathPart, frag);
    return `${dirPrefix}${rel}`;
  };
}

/**
 * Construct a BagMirrorConfig for a named-scope bag.
 *
 * Used by islands to reconstruct mirror configs from the serializable
 * `diskMirrors` manifest field (which carries `{ bagId, mirrorRoot, scope }`).
 */
export function namedBagMirror(bagId: string, scope: string, mirrorRoot: string): BagMirrorConfig {
  return { bagId, mirrorRoot, toRelPath: namedBagPath(scope) };
}
