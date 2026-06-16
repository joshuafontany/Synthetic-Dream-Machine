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
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/base-doc
 */

import type { DocHandle }        from "@automerge/automerge-repo";
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

/**
 * resolveOracleDoc — the catalog-oracle resolution protocol, in one place.
 *
 * A catalog oracle tiddler holds the `automerge:` URL of a satellite doc (wiki,
 * draft, …) in its `text` field. Every vessel runs the same three-step protocol
 * for each satellite:
 *   1. read the oracle URL — null when the satellite has never been minted,
 *   2. hand the URL (or null) to the vessel's `resolve` strategy, which opens
 *      the existing doc or mints a blank one,
 *   3. write the oracle tiddler back into the catalog on first mint only.
 *
 * Divergence stays in the two arguments, never the protocol: `resolve` carries
 * the platform's repo strategy (node races whenReady; browser uses
 * allowableStates), and `provenance` carries the authority stamp. The
 * read → resolve → write-back-on-mint shape lives here once; both vessel
 * factories compose it for their wiki and draft satellites.
 */
export async function resolveOracleDoc(
  catalogHandle: DocHandle<LarDoc>,
  oracleKey:     string,
  resolve:       (oracleUrl: string | null) => Promise<DocHandle<LarDoc>> | DocHandle<LarDoc>,
  provenance:    string,
): Promise<DocHandle<LarDoc>> {
  const oracleUrl = tiddlerText(catalogHandle.doc()?.tiddlers?.[oracleKey]) ?? null;
  const handle    = await resolve(oracleUrl);
  if (!oracleUrl) {
    catalogHandle.change((doc) => {
      doc.tiddlers[oracleKey] = mutableLarRecord(oracleKey, { text: handle.url }, provenance);
    });
  }
  return handle;
}

// ── Blob helpers (any bag may carry blobs) ────────────────────────────────

/** TW5 boot kernel key — primary entry in `LarDoc.blobs`. */
export const ENGINE_CORE_ID = "tiddlywikicore";

/**
 * Stable lar: URI for a blob descriptor tiddler.
 * Each blob MUST have a descriptor tiddler at this URI carrying sha256/version/mimeType.
 * Blobs live in the runtime SYSTEM ISLAND (@oracle), beside the core engine bytes.
 * e.g. blobDescriptorUri("tiddlywikicore") → "lar:///ha.ka.ba/@oracle/blobs/tiddlywikicore"
 */
export function blobDescriptorUri(blobId: string): string {
  const safe = blobId.replace(/^\$:\//, "").replace(/[^a-zA-Z0-9/_.-]/g, "_");
  return `lar:///ha.ka.ba/@oracle/blobs/${safe}`;
}
