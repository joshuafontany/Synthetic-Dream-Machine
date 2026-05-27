/*\
title: lar:///ha.ka.ba/@lararium/tw5/modules/reaction-router
type: application/javascript
module-type: startup
\*/
/**
 * reaction-router — TW5 startup module: nalu-driven reaction dispatch.
 *
 * Replaces the inline ReactionEngine.onChangeset() call in lar-wiki-island.ts
 * with nalu-driven wiki.addEventListener("change") dispatch.
 *
 * Pipeline (yin-collapse law):
 *   wiki.addTiddler() × N        ← changeset writes accumulate
 *   wiki.nextTick()              ← TW5 batch coalesces
 *   wiki.addEventListener("change") fires  ← nalu arrives on shore
 *   → update ReactionGraph bindings for changed lar: URIs
 *   → wiki.dispatchEvent("tm-verse-event", {uri, listenable})
 *   → onVerseEvent consumer forwards to main thread (Worker)
 *      or wiki widget tree handles directly (browser)
 *
 * Runs on both platforms so the Worker's TW5 instance and the browser's
 * TW5 instance both carry nalu-driven reaction routing.
 *
 * Meme: lar:///ha.ka.ba/@lararium/tw5/modules/reaction-router
 */

import { parseMemeEdges } from "../meme-ast/index.js";
import {
  extractReactionBindings,
  ReactionGraph,
} from "@lararium/mesh/live-protocol";
import type { ReactionBinding } from "@lararium/mesh/live-protocol";

// ---------------------------------------------------------------------------
// TW5 startup lifecycle
// ---------------------------------------------------------------------------

export const name      = "lararium-reaction-router";
export const platforms = ["browser", "node"];
export const after     = ["startup", "lararium-grammar-cache"];
export const synchronous = true;

// ---------------------------------------------------------------------------
// Module-level state (one per TW5 instance — singleton within boot context)
// ---------------------------------------------------------------------------

let _graph: ReactionGraph | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TwWiki = {
  filterTiddlers(filter: string): string[];
  getTiddler(t: string): { fields: Record<string, unknown> } | undefined;
  getTiddlerText(t: string): string | undefined;
  addEventListener(ev: "change", fn: (changes: Record<string, unknown>) => void): void;
  dispatchEvent(type: string, ...args: unknown[]): void;
};

function getWiki(): TwWiki | undefined {
  return (globalThis as { $tw?: { wiki?: TwWiki } }).$tw?.wiki;
}

/** Extract ReactionBindings from one lar: tiddler's text. */
function bindingsFromUri(wiki: TwWiki, uri: string): ReactionBinding[] {
  const text = wiki.getTiddlerText(uri);
  if (!text) return [];
  try {
    const edges = parseMemeEdges(uri, text);
    return extractReactionBindings(
      edges.map((e) => ({
        fromUri:  e.fromUri,
        toUri:    e.toUri,
        family:   e.family,
        role:     e.role,
        payload:  e.payload,
      })),
    );
  } catch {
    return [];
  }
}

/** Fire tm-verse-event on the wiki for every unique listenable in fromUri's bindings. */
function fireReactionsForUri(wiki: TwWiki, graph: ReactionGraph, uri: string): void {
  const listenables = new Set<string>();
  for (const b of graph.bindings) {
    if (b.fromUri === uri) listenables.add(b.listenable);
  }
  for (const listenable of listenables) {
    wiki.dispatchEvent("tm-verse-event", { uri, listenable });
  }
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

export function startup(): void {
  const wiki = getWiki();
  if (!wiki) return;

  const graph = new ReactionGraph();
  _graph = graph;

  // Boot scan — extract reaction bindings from all lar: tiddlers currently loaded.
  const uris = wiki.filterTiddlers("[prefix[lar:]]");
  for (const uri of uris) {
    const bindings = bindingsFromUri(wiki, uri);
    if (bindings.length > 0) graph.updateUri(uri, bindings);
  }

  // Nalu hook — fires after TW5 coalesces a batch of addTiddler() calls.
  wiki.addEventListener("change", (changedTiddlers) => {
    for (const uri of Object.keys(changedTiddlers)) {
      if (!uri.startsWith("lar:")) continue;

      // Update bindings for this URI.
      if (!wiki.getTiddler(uri)) {
        graph.removeUri(uri);
      } else {
        const bindings = bindingsFromUri(wiki, uri);
        if (bindings.length > 0) graph.updateUri(uri, bindings);
        else graph.removeUri(uri);
      }

      // Fire reactions — dispatches wiki-level tm-verse-event.
      fireReactionsForUri(wiki, graph, uri);
    }
  });
}

// ---------------------------------------------------------------------------
// Graph accessor — for tests and Worker bridge integration
// ---------------------------------------------------------------------------

/** Returns the active ReactionGraph after startup(), or null before boot. */
export function getReactionGraph(): ReactionGraph | null {
  return _graph;
}
