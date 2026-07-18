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
