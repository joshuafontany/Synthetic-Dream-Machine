/**
 * base-doc — LarDoc: the one root type for ALL Lararium Automerge documents.
 *
 * Invariant: every Automerge doc in the Lararium system satisfies `LarDoc`:
 *
 *   { schemaVersion, tiddlers, blobs? }
 *
 * Every out-of-tiddlers field carries a corresponding descriptor tiddler so the
 * TW5 wiki surface can introspect it without TS interop. Binary blobs live in
 * `blobs`; their metadata tiddlers live in `tiddlers` at blobDescriptorUri(id).
 *
 * All named doc shapes (LarariumDoc, MemeStoreDoc, IdentitiesDoc, CirclesDoc,
 * SessionsDoc) collapse to LarDoc.
 *
 * Keyhive / Ink & Switch / Zelenka:
 *   Access-control policy ("public" | "private" | "keyhive:{groupUri}") lives
 *   inside the tiddler fields — queryable from TW5 filters, not a runtime flag.
 *   Principal verifyingKey, group BeeKEM hints, session capability tokens are
 *   all tiddler fields so they arrive via CRDT sync alongside the content.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/v0.1/base-doc
 */

import type { LarTiddlerRecord } from "./tiddler-store.js";

export function mutableLarRecord(
  title: string,
  fields: Record<string, string>,
  authority: string,
): LarTiddlerRecord {
  return {
    tiddler: { title, ...fields },
    meta: { authority },
  };
}

// ---------------------------------------------------------------------------
// LarDoc — base contract every Lararium Automerge document extends.
// ---------------------------------------------------------------------------

/**
 * LarBlobEntry — binary artefact stored in a LarDoc.
 *
 * Automerge stores the blob as an immutable Uint8Array — O(1) sync cost after
 * the initial transfer. Any bag may carry blobs: engine bundles, images,
 * attachments. Each blob MUST have a descriptor tiddler at blobDescriptorUri(id).
 */
export interface LarBlobEntry {
  readonly id:       string;
  readonly version:  string;
  readonly sha256:   string;
  readonly mimeType: string;
  readonly blob:     Uint8Array;
  readonly author?:  string;
  readonly license?: string;
  readonly source?:  string;
}

/**
 * LarDoc — the one root type every Lararium Automerge document satisfies.
 *
 * `tiddlers` — mutable inside Automerge `handle.change()` callbacks; readonly elsewhere.
 * `blobs` — optional binary store; any bag may carry image/attachment blobs.
 *
 * @deprecated systemTitles — removed. Intent superseded by `wiki.isShadowTiddler()`
 * at VM boot time; a pre-baked list risks silent drift on TW5 upgrades and the only
 * consumer was a log line in genesis-artifact.ts.
 */
export interface LarDoc {
  readonly schemaVersion: string;
  readonly tiddlers:      Record<string, LarTiddlerRecord>;
  readonly blobs?:        Record<string, LarBlobEntry>;
}

/** Read the `text` field from a LarTiddlerRecord. Returns null when absent. */
export function tiddlerText(record: { tiddler: { text?: unknown } } | null | undefined): string | null {
  const t = record?.tiddler.text;
  return typeof t === "string" ? t : null;
}

/** Safe empty state for repo.create<LarDoc>(). */
export function emptyLarDoc(): LarDoc {
  return { schemaVersion: "0.1", tiddlers: {} };
}

// ── Blob helpers (any bag may carry blobs) ────────────────────────────────

/** TW5 boot kernel key — primary entry in `LarDoc.blobs`. */
export const ENGINE_CORE_ID = "tiddlywikicore";

/**
 * Stable lar: URI for a blob descriptor tiddler.
 * Each blob MUST have a descriptor tiddler at this URI carrying sha256/version/mimeType.
 * e.g. blobDescriptorUri("tiddlywikicore") → "lar:///ha.ka.ba/@lararium/blobs/tiddlywikicore"
 */
export function blobDescriptorUri(blobId: string): string {
  const safe = blobId.replace(/^\$:\//, "").replace(/[^a-zA-Z0-9/_.-]/g, "_");
  return `lar:///ha.ka.ba/@lararium/blobs/${safe}`;
}
