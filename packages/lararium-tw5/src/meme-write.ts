/**
 * meme-write — disk export of memes: the recompose shore.
 *
 * Architecture (carrier-whole at rest):
 *   `exportMemeText` routes through `expandMemeRefs` (deserializer.ts) — the
 *   recompose inverse the doctrine names (disk-projection#granularity). The
 *   shore module owns BOTH directions: ingest decomposes a carrier into
 *   parent + ahu-child records; export splices every `<<~ kahea ahu #slot >>`
 *   marker back into its child's definition form and reassembles the whole
 *   carrier envelope. One meme, one file — a child change re-flushes its
 *   GROUP (the projector routes to the carrier root), never its own file.
 *
 *   No per-node markdown-meme template renders each record to its own file;
 *   the HTML templates serve the live story river, and the projection-snapshot
 *   mode gets built fresh when a consumer exists. The carrier definition form
 *   recomposes in the shore (expandMemeRefs, also on $tw.lares), where
 *   the round-trip harness proves parse∘render ≡ records. Wikifying the
 *   text field cannot carry byte-fidelity: `\rules` does not propagate
 *   through `<$transclude>` (memetic-parser.ts, Jermolene #6712), and the
 *   full ruleset mangles markdown under text/plain render.
 *
 * Canonical-form law (handoff #pattern-integrities §2): idempotent render;
 * framing (meta order/alignment, sigil spacing, block margins) normalizes
 * once; operator content bytes survive whole.
 *
 * Schema: lar:///ha.ka.ba/lares/api/lararium/schema/meme-write
 */

import { expandMemeRefs } from "./deserializer.js";
import type { TiddlerFields } from "./deserializer.js";
import type { TW5Engine } from "./tw5-vm.js";
import { makeTw5FileInfo } from "./tw5-file-info.js";
import type { TW5Instance } from "./types/tiddlywiki.js";

import { CARRIER_TYPE as MEMETIC_TYPE, isCarrierType } from "@lararium/mesh/carrier-type";

/**
 * Return the canonical memetic-wikitext for a meme URI — the whole carrier,
 * children recomposed inline at full depth.
 *
 * @param tw5     - Live TW5Engine VM instance
 * @param memeUri - lar:/// URI of the meme parent tiddler
 * @returns       - Canonical memetic-wikitext; falls back to the raw text
 *                  field (then empty string) when recompose cannot run
 */
export function exportMemeText(tw5: TW5Engine, memeUri: string): string {
  const wiki = tw5.$tw.wiki;
  const reader = (title: string): TiddlerFields | undefined =>
    (wiki.getTiddler?.(title) as { fields?: TiddlerFields } | undefined)?.fields;
  try {
    const carrier = expandMemeRefs(reader, memeUri);
    if (carrier !== null) return carrier;
  } catch { /* fall through to raw text */ }
  return wiki.getTiddlerText?.(memeUri, "") ?? "";
}

/** One projected carrier file: the chosen extension, the main bytes, and (for a
 *  content+`.meta` filetype) the sidecar bytes. The projector sites the file at
 *  `<uri-path><ext>` and writes `metaBody` at `<uri-path><ext>.meta`. */
export interface CarrierFile {
  readonly ext:       string;
  readonly body:      string;
  readonly metaBody?: string;
  /** "base64" when the body is base64 text the projector must decode to raw
   *  bytes (a binary filetype — image/PDF); "utf8"/absent for a text carrier. */
  readonly encoding?: string;
}

/**
 * Render a carrier root back to ITS OWN filetype — the projection reciprocal of
 * the ingest shore. A memetic-wikitext carrier recomposes through
 * `expandMemeRefs` and sites as `.mem` (children spliced whole); ANY other TW5
 * filetype rides TW5's own native file-info cascade (`makeTw5FileInfo`), so a
 * `.tid`/`.json`/`.md`/content-type record projects back as its native file
 * (plus a `.meta` sidecar where the type needs one). One authority — the VM's
 * registry — decides the type, the extension, and the exact bytes for both
 * directions; the Node projector only sites + writes them.
 *
 * Returns null when the root tiddler is absent (nothing to project).
 */
export function exportCarrierFile(tw5: TW5Engine, memeUri: string): CarrierFile | null {
  const wiki = tw5.$tw.wiki;
  const tiddler = wiki.getTiddler?.(memeUri) as { fields?: TiddlerFields } | undefined;
  const fields = tiddler?.fields;
  if (!fields) return null;

  // Skinny-handle rule (T3, disk-projection#granularity + content-resolution.mem): a carrier
  // whose body left the CRDT for the `cid/` CAS tier projects as its HANDLE ALONE. The bytes
  // stay content-addressed; disk keeps only the small pointer (`_canonical_uri`/`_integrity`/
  // `textCid` + metadata). The `text` field is STRIPPED before serialization — so even after the
  // read-side lazyLoad resolver rehydrates the body INTO the VM tiddler (for render), the disk
  // projection never writes the whole body and never re-opens the #51 overflow on re-ingest. The
  // handle rides TW5's own native file-info (a `.tid` for the typeless handle). This wins over the
  // memetic recompose below — a skinny carrier is a pointer, never a body to recompose.
  const isSkinny = fields["_is_skinny"] === "yes" || typeof fields["textCid"] === "string";
  if (isSkinny) {
    const { text: _body, ...handleFields } = fields as Record<string, unknown>;
    const info = makeTw5FileInfo(tw5.$tw as unknown as TW5Instance, memeUri, handleFields);
    return {
      ext:  info.ext,
      body: info.body,
      ...(info.hasMetaFile && info.metaBody !== undefined ? { metaBody: info.metaBody } : {}),
    };
  }

  const type = typeof fields["type"] === "string" ? (fields["type"] as string) : "";
  // Memetic carriers keep the shore recompose + the `.mem` extension: their
  // ahu children live as separate records and MUST splice back whole (a native
  // file-info pass would emit only the parent's rewritten text). Absent/blank
  // type on a memetic-decomposed carrier still routes here (the recompose
  // returns null for a non-memetic record and we fall through).
  // ROUTING READS WIDE; MINTING WRITES NARROW. This asks "is this a carrier", never "does it spell the
  // type the way I would" — a record stored under the earlier spelling still recomposes to `.mem`.
  if (isCarrierType(type)) {
    return { ext: ".mem", body: exportMemeText(tw5, memeUri) };
  }
  const info = makeTw5FileInfo(tw5.$tw as unknown as TW5Instance, memeUri, fields as Record<string, unknown>);
  return {
    ext:  info.ext,
    body: info.body,
    ...(info.hasMetaFile && info.metaBody !== undefined ? { metaBody: info.metaBody } : {}),
    ...(info.encoding === "base64" ? { encoding: "base64" } : {}),
  };
}
