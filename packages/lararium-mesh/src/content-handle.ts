/**
 * content-handle — the whole-carrier skinny handle (content-resolution.mem Scenario B).
 *
 * A body large enough to burst the CRDT MUST leave it. A CRDT carries convergence and causal
 * order well; it carries megabytes badly — a 16MB scalar-string field OOMs automerge on
 * sync-apply, and every peer that syncs the doc pays the whole weight. So an oversized RAW
 * shard (image/audio/text/binary — no memetic-wikitext wrapper) rests as a `cid/` CAS blob,
 * and the tiddler that stands in the CRDT becomes a SKINNY HANDLE: it names the body by
 * content-address + integrity, marks itself `_is_skinny`, and carries NO `text`. The read-side
 * `lazyLoad` resolver (TW5 `getTiddlerText` seam) rehydrates it on render — a later leg.
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

import { cidUri } from "./lar-uris.js";
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

/** Is a carrier body (its byte length) oversized for the CRDT? */
export function isOversizedBody(byteLength: number): boolean {
  return byteLength > SKINNY_CARRIER_THRESHOLD;
}

/**
 * Build a whole-carrier skinny handle tiddler. The bytes rest in the cid/ tier (staged
 * send-side, keyed by `cid` = hex sha256); this record NEVER carries the body. Fields:
 *   - `_is_skinny`     marks the lazyLoad boundary for the read-side resolver.
 *   - `_canonical_uri` the lar: content-address the media-src / resolver path reads.
 *   - `_integrity`     the RFC-6920 ni:// multihash — foreign-verifiable, algorithm-agile.
 *   - `textCid`        the CAS key the daemon `resolveByCid` reads (hex sha256).
 *   - `size`           the body's byte length (metadata; the body is elsewhere).
 *   - `_source_ext`    the on-disk extension, so the read path recovers the content-type.
 */
export function skinnyHandleTiddler(
  title: string,
  cid: string,
  size: number,
  ext?: string,
): Record<string, unknown> {
  return {
    title,
    _is_skinny:     "yes",
    _canonical_uri: cidUri(cid),
    _integrity:     niUriSha256FromHex(cid),
    textCid:        cid,
    size:           String(size),
    ...(ext ? { _source_ext: ext } : {}),
  };
}
