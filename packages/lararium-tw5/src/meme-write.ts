/**
 * meme-write — disk export of memes: the recompose seam.
 *
 * Architecture (carrier-whole at rest):
 *   `exportMemeText` routes through `expandMemeRefs` (deserializer.ts) — the
 *   recompose inverse the doctrine names (disk-projection#granularity). The
 *   membrane module owns BOTH directions: ingest decomposes a carrier into
 *   parent + ahu-child records; export splices every `<<~ kahea ahu #slot >>`
 *   marker back into its child's definition form and reassembles the whole
 *   carrier envelope. One meme, one file — a child change re-flushes its
 *   GROUP (the projector routes to the carrier root), never its own file.
 *
 *   No per-node markdown-meme template renders each record to its own file;
 *   the HTML templates serve the live story river, and the projection-snapshot
 *   mode gets built fresh when a consumer exists. The carrier definition form
 *   recomposes in the membrane (expandMemeRefs, also on $tw.lares), where
 *   the round-trip harness proves parse∘render ≡ records. Wikifying the
 *   text field cannot carry byte-fidelity: `\rules` does not propagate
 *   through `<$transclude>` (memetic-parser.ts, Jermolene #6712), and the
 *   full ruleset mangles markdown under text/plain render.
 *
 * Canonical-form law (handoff #pattern-integrities §2): idempotent render;
 * framing (iam order/alignment, sigil spacing, block margins) normalizes
 * once; operator content bytes survive whole.
 *
 * Schema: lar:///ha.ka.ba/lares/api/lararium/schema/meme-write
 */

import { expandMemeRefs } from "./deserializer.js";
import type { TiddlerFields } from "./deserializer.js";
import type { TW5Engine } from "./tw5-vm.js";

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
