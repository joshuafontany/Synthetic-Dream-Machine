/**
 * bag-paths — URI → mirror-relative-path factories.
 *
 * The named-bag layout (`bags/@NAME`) makes per-scope path computation
 * derivable from the bag scope alone. No oracle tiddler `path-filter` field
 * needed. Factories are pure functions; no I/O, no module state.
 */

import { resolve as resolvePath, join as joinPath, dirname, basename, isAbsolute, sep } from "path";
import { stripMemeExt } from "@lararium/mesh";

export interface BagMirrorConfig {
  /** The bag whose changes this mirror reflects. */
  readonly bagId: string;
  /** Absolute filesystem path; all writes are constrained under this root. */
  readonly mirrorRoot: string;
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
 * The siting function (lar-uri #five-planes) — the ONE URI → disk-path map: every
 * carrier lives at its FULL uri-path inside its holding bag's mirror (directory =
 * residency, interior path = the name, whole). This returns the path up to (but
 * NOT including) the filetype extension — the render seam owns the extension
 * (`.mem` for memetic, TW5's chosen extension for a native filetype), so both
 * filetypes site at the SAME `<uri-path>` and only the extension differs.
 *
 *   lar:///ha.ka.ba/lares/api/pono/meme → ha.ka.ba/lares/api/pono/meme
 *
 * Carrier-whole at rest (disk-projection#granularity): a fragment record
 * (`…#slot`) never owns a disk file — its carrier root does; a fragment URI (and
 * an unstable root) resolves to null (loci law).
 */
export function carrierBaseRelPath(uri: string): string | null {
  if (!uri.startsWith("lar:///")) return null;
  const bare = uri.slice("lar:///".length);
  if (!/^\w+\.\w+\.\w+\//.test(bare)) return null;
  const [pathPart, frag] = splitHash(bare);
  if (frag || !pathPart) return null;                    // a fragment never owns a file
  return stripMemeExt(pathPart);
}

/**
 * Construct a BagMirrorConfig for a named bag. `scope` rides as grant
 * metadata only — the siting function (`carrierBaseRelPath`) carries every
 * stable name whole; the mirrorRoot = the bag's residency dir.
 */
export function namedBagMirror(bagId: string, scope: string, mirrorRoot: string): BagMirrorConfig {
  void scope;
  return { bagId, mirrorRoot };
}

// ── Loci reverse-derivation (the ingest gesture's scan leg) ─────────────────

/**
 * One mirror plane's reverse-derivation — the loci law run backward under the
 * full-path-inside-bag ruling, shared by every disk mirror:
 *   `<root>/<rootDirName>/<holding-dir>/<full-uri-path>.mem` ⇄ `lar:///<full-uri-path>`
 * The first segment under the plane dir names the HOLDING SLOT (a residency
 * bag under bags/, a wiki slug under wikis/) and never enters the name; the
 * interior IS the name, whole. Returns null outside the plane dir, for a `.meta`
 * sidecar (it rides with its content file, never a carrier root of its own), or
 * when the interior carries no w.w.w root — the gesture reports those as
 * skipped, never guesses.
 *
 * Any registered TW5 filetype extension strips the same way `.mem` does: the
 * name is the interior MINUS its trailing filetype extension, so a `.tid`,
 * `.json`, `.md`, or content-type carrier derives its lar: URI exactly as a
 * `.mem` carrier does (filetype-agnostic mirror, one loci law).
 */
function mirrorRootFileToUri(instanceRoot: string, filePath: string, rootDirName: string): string | null {
  const mirrorRoot = resolvePath(instanceRoot, rootDirName);
  const abs = resolvePath(filePath);
  if (!abs.startsWith(mirrorRoot + sep)) return null;
  const rel = abs.slice(mirrorRoot.length + 1).split(sep);
  if (rel.length < 2) return null;                       // needs holding dir + interior
  const interior = rel.slice(1).join("/");
  if (interior.endsWith(".meta")) return null;           // sidecar, not a carrier root
  // Strip the trailing filetype extension from the last path segment only (the
  // w.w.w root's own dots live in the FIRST segment and never match here).
  const namePath = interior.replace(/\.[^/.]+$/, "");
  if (namePath === interior) return null;                // no extension → not a projected carrier file
  if (!/^\w+\.\w+\.\w+\//.test(namePath)) return null;   // loci: stable names carry a w.w.w root
  return `lar:///${namePath}`;
}

/**
 * Derive the carrier-root lar: URI a bags/ file projects — the canon plane:
 *   `bags/<residency-dir>/<full-uri-path>.mem` ⇄ `lar:///<full-uri-path>`
 * The first segment under bags/ names the HOLDING BAG (residency plane).
 */
export function bagsFileToUri(instanceRoot: string, filePath: string): string | null {
  return mirrorRootFileToUri(instanceRoot, filePath, "bags");
}

/**
 * Derive the carrier-root lar: URI a wikis/ file projects — the per-wiki working
 * write-layer's disk surface run backward (the ingest-BACK leg). The working
 * layer (`wikis/@{slug}/working`) projects per-wiki to
 * `wikis/@{slug}/<full-uri-path>.mem`; the first segment under wikis/ names the
 * WIKI SLUG (the write-layer instance), never the carrier name. The derived
 * records home to the working layer (the editing plane), not the named bag —
 * the ingest caller carries that designation in `--to`. Symmetric with the
 * disk-projector's working projection: strip wikis/ + the @{slug} leaf, read
 * the interior whole.
 */
export function wikisFileToUri(instanceRoot: string, filePath: string): string | null {
  return mirrorRootFileToUri(instanceRoot, filePath, "wikis");
}
