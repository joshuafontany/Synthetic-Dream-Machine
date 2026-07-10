/**
 * bag-paths — URI → mirror-relative-path factories.
 *
 * The named-bag layout (`bags/@NAME`) makes per-scope path computation
 * derivable from the bag scope alone. No oracle tiddler `path-filter` field
 * needed. Factories are pure functions; no I/O, no module state.
 */

import { resolve as resolvePath, join as joinPath, dirname, basename, isAbsolute, sep } from "path";
import { MEME_WRITE_EXT, stripMemeExt, hasMemeExt } from "@lararium/mesh";

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

function splitHash(s: string): [string, string | null] {
  const i = s.indexOf("#");
  return i >= 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, null];
}

/**
 * Carrier-whole at rest (disk-projection#granularity): a fragment record
 * (`…#slot`) never owns a disk file — its carrier root does. A fragment URI
 * resolves to null here; the projector routes a child change to its group
 * root before any path lookup. A fragment must never map to `base/frag.md` —
 * only its carrier root owns a file.
 */
function toRelMd(pathPart: string, frag: string | null): string | null {
  if (frag) return null;
  return `${stripMemeExt(pathPart)}${MEME_WRITE_EXT}`;
}

/**
 * The siting function (lar-uri #five-planes): every file
 * on disk lives at its FULL uri-path inside its holding bag's mirror —
 * directory = residency, interior path = the name, whole. Any bag projects
 * any stable name losslessly; reverse derivation = strip root, read name.
 *
 *   lar:///ha.ka.ba/@lares/api/pono/meme
 *     → ha.ka.ba/@lares/api/pono/meme.md   (relative to the bag mirror root)
 *
 * Fragments (#children) live inside their parent carrier file → null.
 * Unstable roots carry no siting → null (loci law).
 */
export function fullPathBagPath(): MirrorPathFn {
  return (uri) => {
    if (!uri.startsWith("lar:///")) return null;
    const bare = uri.slice("lar:///".length);
    if (!/^\w+\.\w+\.\w+\//.test(bare)) return null;
    const [pathPart, frag] = splitHash(bare);
    return pathPart ? toRelMd(pathPart, frag) : null;
  };
}

/**
 * Construct a BagMirrorConfig for a named bag. `scope` rides as grant
 * metadata only — the siting function carries every stable name whole
 * (full-path-inside-bag ruling); the mirrorRoot = the bag's residency dir.
 */
export function namedBagMirror(bagId: string, scope: string, mirrorRoot: string): BagMirrorConfig {
  void scope;
  return { bagId, mirrorRoot, toRelPath: fullPathBagPath() };
}

// ── Loci reverse-derivation (the ingest gesture's scan leg) ─────────────────

/**
 * One mirror plane's reverse-derivation — the loci law run backward under the
 * full-path-inside-bag ruling, shared by every disk mirror:
 *   `<root>/<rootDirName>/<holding-dir>/<full-uri-path>.md` ⇄ `lar:///<full-uri-path>`
 * The first segment under the plane dir names the HOLDING SLOT (a residency
 * bag under bags/, a wiki slug under wikis/) and never enters the name; the
 * interior IS the name, whole. Returns null outside the plane dir, for non-.md
 * files, or when the interior carries no w.w.w root — the gesture reports
 * those as skipped, never guesses.
 */
function mirrorRootFileToUri(instanceRoot: string, filePath: string, rootDirName: string): string | null {
  const mirrorRoot = resolvePath(instanceRoot, rootDirName);
  const abs = resolvePath(filePath);
  if (!abs.startsWith(mirrorRoot + sep)) return null;
  const rel = abs.slice(mirrorRoot.length + 1).split(sep);
  if (rel.length < 2) return null;                       // needs holding dir + interior
  const interior = rel.slice(1).join("/");
  if (!hasMemeExt(interior)) return null;                // read either .mem or the legacy .md
  const namePath = stripMemeExt(interior);
  if (!/^\w+\.\w+\.\w+\//.test(namePath)) return null;  // loci: stable names carry a w.w.w root
  return `lar:///${namePath}`;
}

/**
 * Derive the carrier-root lar: URI a bags/ file projects — the canon plane:
 *   `bags/<residency-dir>/<full-uri-path>.md` ⇄ `lar:///<full-uri-path>`
 * The first segment under bags/ names the HOLDING BAG (residency plane).
 */
export function bagsFileToUri(instanceRoot: string, filePath: string): string | null {
  return mirrorRootFileToUri(instanceRoot, filePath, "bags");
}

/**
 * Derive the carrier-root lar: URI a wikis/ file projects — the per-wiki working
 * write-layer's disk surface run backward (the ingest-BACK leg). The working
 * layer (`wikis/@{slug}/working`) projects per-wiki to
 * `wikis/@{slug}/<full-uri-path>.md`; the first segment under wikis/ names the
 * WIKI SLUG (the write-layer instance), never the carrier name. The derived
 * records home to the working layer (the editing plane), not the named bag —
 * the ingest caller carries that designation in `--to`. Symmetric with the
 * disk-projector's working projection: strip wikis/ + the @{slug} leaf, read
 * the interior whole.
 */
export function wikisFileToUri(instanceRoot: string, filePath: string): string | null {
  return mirrorRootFileToUri(instanceRoot, filePath, "wikis");
}
