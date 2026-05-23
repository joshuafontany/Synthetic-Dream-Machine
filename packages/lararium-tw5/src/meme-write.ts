/**
 * meme-write — disk export of memes via TW5 templates + cascades.
 *
 * Architecture (rewrite, no legacy code):
 *   `exportMemeText` invokes `wiki.renderTiddler` on the tiddler URI with
 *   `lar-export-scope = "markdown-meme"`. The `meme-markdown-meme` template
 *   assembles the full meme envelope (prologue, SOH, preamble+IAM, header-text,
 *   STX, text, postamble, ETX) from the tiddler's fields using `<$text>` widgets
 *   — no wikification, no child expansion.
 *
 *   Per-node law: every tiddler — parent or child — renders independently
 *   through the same template. A parent's `text` field already contains literal
 *   `<<~ kahea ahu #slot >>` markers written by the deserializer at ingest time.
 *   Those markers project verbatim; the child tiddler's own flush writes the
 *   child's file when the child changes.
 *
 *   Round-trip idempotency target: ingest → tiddler tree → per-node projection
 *   → disk tree → ingest → equivalent tiddler tree (semantic equivalence,
 *   stable section spacing).
 *
 * Schema: lar:///ha.ka.ba/@lares/v0.1/api/lararium/schema/meme-write
 */

import type { TW5Engine } from "./tw5-vm.js";

// ---------------------------------------------------------------------------
// exportMemeText — disk export via TW5 templates + cascades
// ---------------------------------------------------------------------------

/**
 * Return the canonical memetic-wikitext for a meme URI.
 *
 * Routes through TW5's renderTiddler pipeline — the same path the wiki
 * shell and HTML export use — with the `lar-export-scope` variable set
 * to "markdown-meme". The wikifier walks the parent's parse tree;
 * ~ahu (wikitext widget) resolves the ahu cascade and transcludes slot
 * children through the disk-export template. Non-sigil text renders as-is.
 *
 * @param tw5     - Live TW5Engine VM instance
 * @param memeUri - lar:/// URI of the meme parent tiddler
 * @returns       - Canonical memetic-wikitext, or empty string if absent
 */
const MEME_MARKDOWN_TEMPLATE = "lar:///ha.ka.ba/@lararium/templates/meme/markdown-meme";

export function exportMemeText(tw5: TW5Engine, memeUri: string): string {
  const wiki = tw5.$tw.wiki;
  if (!wiki?.renderTiddler) return "";
  try {
    // Render through the meme-level template, which carries `\rules only
    // transcludeinline lar-sigil lar-doctype-comment`.
    // The pragma curates the wikitext rule set so backticks, dashes, html
    // entities, html comments, and macrocall stay literal — only sigil and
    // transclusion rules fire. ~ahu (wikitext widget) transcludes slot children
    // through the cascade-resolved slot template; everything else passes verbatim.
    return wiki.renderTiddler("text/plain", MEME_MARKDOWN_TEMPLATE, {
      variables: {
        currentTiddler:    memeUri,
        "lar-export-scope": "markdown-meme",
      },
    }) ?? "";
  } catch {
    return wiki.getTiddlerText?.(memeUri, "") ?? "";
  }
}
