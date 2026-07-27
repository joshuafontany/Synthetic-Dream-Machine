/**
 * agile-digest — the algorithm-tagged content-digest grammar (`algorithm:hex`,
 * multihash-style), the migration shore that lets a stored bare-hex `sha256`
 * digest COEXIST with a future tagged scheme — no flag-day, no mass re-key.
 *
 * The stack already content-addresses (crypto.ts `carrierHash`, `cidV1Sha256`,
 * `sourceCidOf`'s `sha256-<hex>`, the CAS `cid`); what it lacks is AGILITY — the
 * digests emit BARE hex with no algorithm tag, so an old `sha256` value can never
 * sit beside a new scheme. This module supplies the one narrow grammar every
 * carrier digest can adopt incrementally:
 *
 *   - `parseDigest`   — a bare 64-char hex reads as implicit `sha256` (back-compat
 *                       with every stored value); `algo:hex` OR the legacy
 *                       `algo-hex` (SRI/`sourceCidOf` form) reads TAGGED.
 *   - `digestsEqual`  — normalizes BOTH sides to `(algo, hex)` and compares, so a
 *                       stored bare `ab…` equals a freshly-computed `sha256:ab…`.
 *                       THIS is the dual-read shore: readers route their
 *                       `stored === computed` checks through it and stay correct
 *                       across the tag boundary.
 *   - `formatDigest`  — emits the canonical tagged form `algo:hex`.
 *
 * The Confluence ingest gate needs ZERO change — it compares opaque strings and
 * never computes; a caller that wants tag-agnostic comparison passes
 * `digestsEqual` as its comparator, or keeps the raw `===` while both sides stay
 * bare. Convergence is LAZY: read-accepts-both lands first (pure widening); a
 * carrier's stored value rewrites tagged only the next time it is touched.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/agile-digest
 */

/** A parsed content-digest: a non-empty lowercase algorithm tag + its lowercase hex. */
export interface ParsedDigest {
  readonly algo: string;
  readonly hex: string;
}

/** The implicit algorithm a bare (untagged) hex digest carries — every stored
 *  value in the pre-agile era is a full-hex SHA-256, so a bare 64-char hex reads
 *  as `sha256` with no data loss. */
export const IMPLICIT_ALGO = "sha256" as const;

/** A bare 32-byte (SHA-256) digest: exactly 64 lowercase/uppercase hex chars, no tag. */
const BARE_SHA256_HEX = /^[0-9a-fA-F]{64}$/;
/** Any bare hex digest (even length ≥ 2) — a future algorithm may carry a different width. */
const BARE_HEX = /^(?:[0-9a-fA-F]{2})+$/;
/** A valid algorithm tag: lowercase alnum + dashes (blake3, sha512, sha2-256…). */
const ALGO_TAG = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Parse a digest string into `(algo, hex)`.
 *
 *   "ab…64…"          → { algo: "sha256", hex: "ab…" }   (bare → implicit sha256)
 *   "sha256:ab…"      → { algo: "sha256", hex: "ab…" }   (canonical tagged, `:`)
 *   "sha256-ab…"      → { algo: "sha256", hex: "ab…" }   (legacy SRI / sourceCidOf, `-`)
 *   "blake3:cd…"      → { algo: "blake3", hex: "cd…" }   (a future scheme rides free)
 *
 * The hex normalizes to lowercase; the algo lowercases too. Throws a NAMED error
 * on a malformed digest — a caller passes an already-shaped value (a stored tree
 * entry or a fresh hash), never arbitrary text.
 *
 * The separator split is FIRST-delimiter only, and only when the head reads as a
 * known algorithm tag — so a bare hex (which contains neither `:` nor, mid-value,
 * a `-`) never mis-splits, and a value like `sha256-ab…` splits at the `-` while a
 * hypothetical hex-with-dashes never would (hex holds no `-`).
 */
export function parseDigest(digest: string): ParsedDigest {
  if (typeof digest !== "string" || digest.length === 0) {
    throw new TypeError(`parseDigest: empty or non-string digest`);
  }

  // Tagged form: split on the FIRST `:` or `-`, but only accept the split when the
  // head is a legal algo tag AND the tail is bare hex. A bare hex digest holds
  // neither delimiter, so it falls through to the bare branch untouched.
  const sepIndex = firstSeparator(digest);
  if (sepIndex > 0) {
    const algo = digest.slice(0, sepIndex).toLowerCase();
    const hex = digest.slice(sepIndex + 1).toLowerCase();
    if (ALGO_TAG.test(algo) && BARE_HEX.test(hex)) {
      return { algo, hex };
    }
    // A head that is not a clean algo tag, or a non-hex tail, is malformed — never
    // silently treated as a bare digest (that would fuse a corrupt value in).
    throw new TypeError(`parseDigest: malformed tagged digest "${digest}"`);
  }

  // Bare form: a full-hex value with no tag → implicit sha256.
  const bare = digest.toLowerCase();
  if (BARE_SHA256_HEX.test(bare)) {
    return { algo: IMPLICIT_ALGO, hex: bare };
  }
  throw new TypeError(`parseDigest: not a bare sha256 hex nor a tagged digest "${digest}"`);
}

/** The index of the first `:` or `-` separator, or -1 when the value carries neither. */
function firstSeparator(s: string): number {
  const colon = s.indexOf(":");
  const dash = s.indexOf("-");
  if (colon < 0) return dash;
  if (dash < 0) return colon;
  return Math.min(colon, dash);
}

/** Emit the canonical tagged form `algo:hex`. Lowercases both; validates the
 *  algo tag and the hex so a producer never writes a malformed value. */
export function formatDigest(algo: string, hex: string): string {
  const a = algo.toLowerCase();
  const h = hex.toLowerCase();
  if (!ALGO_TAG.test(a)) throw new TypeError(`formatDigest: bad algorithm tag "${algo}"`);
  if (!BARE_HEX.test(h)) throw new TypeError(`formatDigest: bad hex "${hex}"`);
  return `${a}:${h}`;
}

/** Re-tag a possibly-bare digest into canonical `algo:hex` form (idempotent for an
 *  already-tagged value). The one-line producer helper: `tag(carrierHash(...))`. */
export function tagDigest(digest: string): string {
  const { algo, hex } = parseDigest(digest);
  return formatDigest(algo, hex);
}

/**
 * THE DUAL-READ SHORE. Two digests name the SAME content iff they carry the same
 * algorithm and the same hex — regardless of whether either side rode bare
 * (implicit sha256) or tagged. A stored bare `ab…` therefore equals a computed
 * `sha256:ab…`, which is exactly what lets readers widen to accept-both BEFORE any
 * producer starts emitting tags (the no-flag-day law).
 *
 * A malformed digest on either side reads as NOT-equal (never throws) — a
 * comparator on a hot path surfaces a mismatch, it does not crash ingest; the
 * caller that wants the strict parse calls `parseDigest` directly.
 */
export function digestsEqual(a: string, b: string): boolean {
  let pa: ParsedDigest;
  let pb: ParsedDigest;
  try { pa = parseDigest(a); } catch { return false; }
  try { pb = parseDigest(b); } catch { return false; }
  return pa.algo === pb.algo && pa.hex === pb.hex;
}
