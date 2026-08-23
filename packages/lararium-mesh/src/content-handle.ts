/**
 * content-handle — the whole-carrier skinny handle (content-resolution.mem Scenario B).
 *
 * A body large enough to burst the CRDT MUST leave it. A CRDT carries convergence and causal
 * order well; it carries megabytes badly — a 16MB scalar-string field OOMs automerge on
 * sync-apply, and every peer that syncs the doc pays the whole weight. So an oversized RAW
 * shard (image/audio/text/binary — no memetic-wikitext wrapper) rests as a `cid/` CAS blob,
 * and the tiddler that stands in the CRDT becomes a SKINNY HANDLE: it names the body by
 * content-address + integrity, marks itself `_is_skinny`, and carries NO `text`. The read-side
 * `lazyLoad` resolver (TW5 `getTiddlerText` shore) rehydrates it on render — a later leg.
 *
 * Publicity-plane addressing: the public plane (@crossroads) rides a foreign-verifiable
 * `ni://` multihash (RFC-6920) — a stranger fetches AND verifies with no local context. The
 * private plane (@catalog) would ride a ciphertext cid; the plane sets the mode. Only the
 * public leg travels this module today (the moved library lands in @crossroads).
 *
 * Scenario A (a blob-worthy `#source-text` ahu extracted from WITHIN a pono meme) shares the
 * SAME cid/ store + resolver; it differs only in the extraction boundary and is a later leg.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/content-resolution
 */

import { cidUri, CROSSROADS_DOC_URI, CATALOG_DOC_URI } from "./lar-uris.js";
import { niUriSha256FromHex } from "./crypto.js";

/**
 * The whole-carrier skinny-handle threshold. Above it a raw body leaves the CRDT for the
 * cid/ tier; below it the body inlines (backward-compat, unchanged). Set well UNDER the
 * automerge scalar-string OOM wall (~16MB, the #51/Stage-2 birth) and well ABOVE any normal
 * carrier — a book goes skinny, a meme stays whole. Canon names the ~16KiB Iroh cutoff as the
 * north; held generous (1 MiB) until the read-side lazyLoad resolver lands, so only genuine
 * blobs go skinny while everything renderable stays inline.
 */
export const SKINNY_CARRIER_THRESHOLD = 1024 * 1024; // 1 MiB

/** Is a carrier body (its byte length) oversized for the CRDT? Names the hard inline
 *  wall — a body past it MUST leave the CRDT (a handle) or the ingest faults, never
 *  materializing as an automerge scalar-string. The opt-in-CAD backstop below sits far
 *  under this; this wall stays the last line against the OOM. */
export function isOversizedBody(byteLength: number): boolean {
  return byteLength > SKINNY_CARRIER_THRESHOLD;
}

/**
 * The opt-in-CAD BACKSTOP size floor (64 KiB). CAS-ing a body goes opt-in (the operator
 * flags `_lar_cas`); this floor only feeds the forgot-to-flag safety net below. Flag-primary:
 * the flag decides first, the backstop only catches an un-flagged shard.
 */
export const CAS_BACKSTOP_SIZE = 64 * 1024; // 64 KiB

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".tif", ".tiff", ".avif"]);
const AUDIO_EXT = new Set([".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".opus"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v"]);

/**
 * Classify a file extension to the media-type FAMILY the opt-in-CAD backstop reads. The
 * send side holds no `$tw`, so this stands a small dependency-free classifier: the known
 * binary media families map to `image/` · `audio/` · `video/`, and everything else reads
 * by byte-nature — a body that failed the utf8 round-trip rides `application/octet-stream`,
 * a utf8-clean body rides `text/plain`. TW5's structured text dialects (`.mem`/`.tid`/`.json`/
 * `.multids`) stay utf8-clean → `text/` → INLINE, so a meme or a pack still decomposes in the
 * CRDT (a bundle is inline by nature). The receive side re-reads `$tw.config` for the handle's
 * own `type`; both agree on the external families. A family-representative type suffices — the
 * backstop reads the family, never the exact subtype.
 */
export function mediaTypeFromExt(ext: string, binary = false): string {
  const e = ext.toLowerCase();
  if (IMAGE_EXT.has(e)) return "image/" + (e === ".jpg" ? "jpeg" : e === ".tif" ? "tiff" : e.slice(1));
  if (AUDIO_EXT.has(e)) return "audio/" + e.slice(1);
  if (VIDEO_EXT.has(e)) return "video/" + e.slice(1);
  return binary ? "application/octet-stream" : "text/plain";
}

/**
 * The un-flagged CAS backstop (content-resolution.mem, opt-in CAD). A body rides a persistent
 * handle WITHOUT the operator's `_lar_cas` flag only when it lands in an inherently-external
 * media family (image/audio/video/octet-stream — a binary shard never inlines pono), OR it runs
 * oversized-and-not-text. All text families (a meme, a pack, markdown) stay inline by preference.
 */
export function casBackstopFires(byteLength: number, mediaType: string): boolean {
  if (
    mediaType.startsWith("image/") ||
    mediaType.startsWith("audio/") ||
    mediaType.startsWith("video/") ||
    mediaType === "application/octet-stream"
  ) {
    return true;
  }
  return byteLength > CAS_BACKSTOP_SIZE && !mediaType.startsWith("text/");
}

/**
 * Build a whole-carrier skinny handle tiddler. The bytes rest in the cid/ tier (staged
 * send-side, keyed by `cid` = hex sha256); this record NEVER carries the body. Fields:
 *   - `_is_skinny`     marks the lazyLoad boundary for the read-side resolver.
 *   - `_canonical_uri` the lar: content-address the media-src / resolver path reads.
 *   - `_integrity`     the RFC-6920 ni:// multihash — foreign-verifiable, algorithm-agile.
 *   - `textCid`        the CAS key the daemon `resolveByCid` reads (hex sha256).
 *   - `size`           the body's byte length (metadata; the body is elsewhere).
 *   - `type`           TW5's NATIVE content-type field (from the ext via `$tw.config.contentTypeInfo`)
 *                      — the handle self-describes its media dialect, so a rehydrated body renders
 *                      native (no `_lar_type` shadow field; `type` IS the TW5 slot).
 *   - `_source_ext`    the on-disk extension, so the read path recovers the projection filename.
 */
/**
 * The publicity tier of a @cad body — the PLANE sets the addressing mode (content-resolution.mem
 * #cad-storage, "the publicity plane decides the addressing mode"):
 *   · "public"  — a plaintext `ni://` multihash body; a stranger fetches AND verifies foreign-legible.
 *   · "private" — a ciphertext `cid = BLAKE3(ciphertext)` body; capability-gated, member-carry only.
 */
export type BodyPublicity = "public" | "private";

/**
 * The bag a @cad body-INDEX (the logical-name → cid indirection map) MUST ride, by publicity —
 * ''map-tier = body-tier''. A public-body index rides `@crossroads` (the public floor a stranger mounts);
 * a private-body index rides `@catalog` (the sealed / member lane). The tiers NEVER cross: a private map
 * sited on the public floor would leak the private bodies' EXISTENCE + SIZE + re-key CADENCE to any
 * stranger who reads @crossroads, breaching the read-lane denial the carry-split keeps absolute.
 */
export function bodyIndexBagUri(publicity: BodyPublicity): string {
  return publicity === "public" ? CROSSROADS_DOC_URI : CATALOG_DOC_URI;
}

/**
 * The fail-closed guard the @cad index SITER passes before it writes a body-index: the holding bag matches
 * the body's publicity. It THROWS a named error on any mismatch — a public index off @crossroads, a private
 * index off @catalog (the load-bearing denial: a private map NEVER rides the public floor), or an unknown
 * bag. `indexHoldingBagUri` names the residency bag the siter chose (`bags/crossroads` / `bags/catalog`),
 * not the full nested index doc URI. The guard enforces canon (content-resolution.mem #cad-storage), never
 * the OPEN indirection-map placement fork (③): it fixes the TIER, never which doc inside the tier holds it.
 */
export function assertBodyIndexTier(indexHoldingBagUri: string, publicity: BodyPublicity): void {
  const expected = bodyIndexBagUri(publicity);
  if (indexHoldingBagUri !== expected) {
    throw new Error(
      `[content-handle] a @cad ${publicity}-body index MUST ride ${expected}, not ${indexHoldingBagUri} — ` +
        `map-tier=body-tier (a private index on the public @crossroads floor leaks existence+size+re-key cadence to a stranger)`,
    );
  }
}

export function skinnyHandleTiddler(
  title: string,
  cid: string,
  size: number,
  ext?: string,
  mediaType?: string,
): Record<string, unknown> {
  return {
    title,
    _is_skinny:     "yes",
    _canonical_uri: cidUri(cid),
    _integrity:     niUriSha256FromHex(cid),
    textCid:        cid,
    size:           String(size),
    ...(mediaType ? { type: mediaType } : {}),
    ...(ext ? { _source_ext: ext } : {}),
  };
}
