/**
 * pack-provenance — the aside map that records which PACK file a tiddler came
 * from, so a bundle round-trips without smearing metadata on the members.
 *
 * A "pack" names a multi-tiddler file (a `.json` array · `.multids` ·
 * `text/vnd.tiddlywiki-multiple`): ONE file that yields MANY tiddlers. TW5 loses
 * these on save-back (its manual round-trip friction); our superset keeps the
 * membership ASIDE, TW5's own way — a single system tiddler `$:/config/
 * OriginalTiddlerPaths`, a JSON map { memberTitle: packFilePath }, exactly the
 * shape TW5's boot writes (boot.js:2369). The ingested tiddlers stay BYTE-CLEAN
 * (no injected fields), which keeps an upstream PR diff clean.
 *
 * This module holds ONLY the pure map operations (parse · query · record ·
 * forget). Where the map LIVES (a writable CRDT bag for a dropped bundle, or a
 * local blob layer for an imported wiki) and WHO writes it rides in the callers.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/pack-provenance
 */

/** The TW5-native provenance tiddler — a JSON map of member title → pack file path. */
export const ORIGINAL_TIDDLER_PATHS = "$:/config/OriginalTiddlerPaths";

/** member title → the relative path of the pack file it belongs to. */
export type PackProvenance = Readonly<Record<string, string>>;

/** Parse the provenance map from a tiddler's text; a missing or malformed body
 *  reads as an empty map (a forgotten observation degrades to "no packs", never
 *  corruption). */
export function parseProvenance(text: string | undefined | null): PackProvenance {
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [title, path] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof path === "string" && path) out[title] = path;
    }
    return out;
  } catch { return {}; }
}

/** Serialize the map to canonical JSON — keys sorted, so the tiddler's bytes stay
 *  stable across re-writes (no CRDT churn from key reordering). */
export function serializeProvenance(p: PackProvenance): string {
  const sorted: Record<string, string> = {};
  for (const title of Object.keys(p).sort()) sorted[title] = p[title]!;
  return JSON.stringify(sorted, null, 2);
}

/** The pack file a member belongs to, or undefined when the member rides free
 *  (a single-tiddler file, never bundled). */
export function packOfMember(p: PackProvenance, title: string): string | undefined {
  return p[title];
}

/** Every member title that belongs to a pack file — the "collect the residency"
 *  read the REPACK verb runs before it re-renders the bundle. */
export function membersOfPack(p: PackProvenance, packPath: string): string[] {
  return Object.keys(p).filter((title) => p[title] === packPath).sort();
}

/** Every distinct pack file the map knows. */
export function packPaths(p: PackProvenance): string[] {
  return [...new Set(Object.values(p))].sort();
}

/**
 * Record a pack's membership — the given titles now belong to `packPath`. A
 * re-ingest of the SAME pack replaces its whole membership (a member dropped from
 * the file on disk leaves the map), so the map tracks the pack's CURRENT shape,
 * never a stale union. Members of OTHER packs stay untouched.
 */
export function recordPack(p: PackProvenance, packPath: string, members: readonly string[]): PackProvenance {
  const out: Record<string, string> = {};
  // keep every member of a DIFFERENT pack
  for (const [title, path] of Object.entries(p)) if (path !== packPath) out[title] = path;
  // (re-)stamp this pack's current members
  for (const title of members) out[title] = packPath;
  return out;
}

/** Forget a whole pack (its file vanished from disk) — every member of `packPath`
 *  leaves the map; other packs stay. */
export function forgetPack(p: PackProvenance, packPath: string): PackProvenance {
  const out: Record<string, string> = {};
  for (const [title, path] of Object.entries(p)) if (path !== packPath) out[title] = path;
  return out;
}

// ── Per-member content-hash (the presence-diff GROWS a content-diff) ─────────
//
// A SIBLING aside map — `$:/config/OriginalTiddlerHashes`, memberTitle → the
// member's content-hash — rides ALONGSIDE the path map, never fused into it: the
// path map stays TW5's own byte-clean `OriginalTiddlerPaths` (boot.js legibility +
// an upstream-PR-clean diff), while the hash map carries what the path map cannot —
// which member's CONTENT moved. Presence-tracking (adds/drops) alone lets a member
// land last-write-wins whenever the pack file re-lands; the content-hash lets each
// member reconcile through the single-carrier Confluence gate at member grain
// (echo · canonical-equivalent · conflict), so a concurrent wiki-edit + disk-change
// names WHICH member conflicts and the rest flow clean.
//
// The hash reads `carrierHash`-family (the member's canonical carrier render,
// algorithm-tagged `sha256:hex`) — the map stores it opaquely, and the gate compares
// it through `digestsEqual`, so a value stored bare in a pre-agile era still matches a
// freshly-tagged one, never a parallel digest scheme.

/** The sibling aside tiddler — a JSON map of member title → content-hash. */
export const ORIGINAL_TIDDLER_HASHES = "$:/config/OriginalTiddlerHashes";

/** member title → the content-hash of the member as last reconciled (carrierHash-family,
 *  algorithm-tagged; a value stored bare pre-agile still compares via `digestsEqual`). */
export type PackHashes = Readonly<Record<string, string>>;

/** Parse the hash map from a tiddler's text; a missing or malformed body reads as
 *  an empty map (a forgotten observation degrades to "no hashes recorded", which
 *  the gate reads as "never synced" → a fresh member ingests, never corrupts). */
export function parseHashes(text: string | undefined | null): PackHashes {
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [title, h] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof h === "string" && h) out[title] = h;
    }
    return out;
  } catch { return {}; }
}

/** Serialize the hash map to canonical JSON — keys sorted, so the tiddler's bytes
 *  stay stable across re-writes (no CRDT churn from key reordering). */
export function serializeHashes(p: PackHashes): string {
  const sorted: Record<string, string> = {};
  for (const title of Object.keys(p).sort()) sorted[title] = p[title]!;
  return JSON.stringify(sorted, null, 2);
}

/** The content-hash last recorded for a member, or undefined when the member rides
 *  unseen (never synced) — the gate reads undefined as a null merge base. */
export function hashOfMember(p: PackHashes, title: string): string | undefined {
  return p[title];
}

/**
 * Re-stamp a pack's per-member content-hashes. `paths` (the SIBLING path map)
 * names which members belong to `packPath`, so members that LEFT this pack drop
 * their hash while members of OTHER packs keep theirs. `hashes` carries the
 * reconciled hash for each CURRENT member — an ingested member advances to its
 * fresh disk hash; a noop keeps its unchanged hash; a CONFLICTED member carries
 * its OLD synced hash forward unchanged (the caller passes it), so the conflict
 * re-surfaces on the next scan rather than the disk side silently winning.
 */
export function recordPackHashes(
  prevHashes: PackHashes,
  paths: PackProvenance,
  packPath: string,
  hashes: Readonly<Record<string, string>>,
): PackHashes {
  const out: Record<string, string> = {};
  // keep the hash for every member that belongs to a DIFFERENT pack
  for (const [title, h] of Object.entries(prevHashes)) {
    if (paths[title] !== undefined && paths[title] !== packPath) out[title] = h;
  }
  // (re-)stamp this pack's current members
  for (const [title, h] of Object.entries(hashes)) out[title] = h;
  return out;
}

/** Forget a whole pack's member hashes (its file vanished) — every member of
 *  `packPath` (per the sibling path map) leaves the hash map; other packs stay. */
export function forgetPackHashes(prevHashes: PackHashes, paths: PackProvenance, packPath: string): PackHashes {
  const out: Record<string, string> = {};
  for (const [title, h] of Object.entries(prevHashes)) {
    if (paths[title] !== undefined && paths[title] !== packPath) out[title] = h;
  }
  return out;
}
