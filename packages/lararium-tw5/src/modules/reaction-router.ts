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
 *   → onVerseEvent consumer forwards to vessel (Worker)
 *      or wiki widget tree handles directly (browser)
 *
 * Runs on both platforms so the island's TW5 instance and the browser's
 * TW5 instance both carry nalu-driven reaction routing.
 *
 * Meme: lar:///ha.ka.ba/@lararium/tw5/modules/reaction-router
 */

import type { TW5Wiki } from "../types/tiddlywiki.js";
import { parseMemeEdges } from "../meme-ast/index.js";
import {
  extractReactionBindings,
  ReactionGraph,
} from "@lararium/mesh/reaction-graph";
import type { ReactionBinding } from "@lararium/mesh/reaction-graph";

// ---------------------------------------------------------------------------
// TW5 startup lifecycle
// ---------------------------------------------------------------------------

export const name      = "lararium-reaction-router";
export const after     = ["startup"];
export const synchronous = true;

// ---------------------------------------------------------------------------
// Module-level state (one per TW5 instance — singleton within boot context)
// ---------------------------------------------------------------------------

let _graph: ReactionGraph | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// TW5's evalGlobal injects $tw as a direct function parameter into module code.
// In the Node VM sandbox (vm.runInContext), globalThis is the empty VM context —
// $tw must be accessed as the injected variable, not via globalThis.$tw.
declare const $tw: { wiki?: TW5Wiki } | undefined;

/** Extract ReactionBindings from one lar: tiddler's text (papalohe wires). */
function bindingsFromUri(wiki: TW5Wiki, uri: string): ReactionBinding[] {
  const text = wiki.getTiddlerText(uri);
  if (!text) return [];
  try {
    return extractReactionBindings(
      parseMemeEdges(uri, text).map((e) => ({
        fromUri: e.fromUri,
        toUri:   e.toUri,
        family:  e.family,
        role:    e.role,
        payload: e.payload,
      })),
    );
  } catch {
    return [];
  }
}

/**
 * Fire tm-verse-event for every unique listenable on uri.
 *
 * Collects listenables from two sources:
 *   1. ReactionGraph bindings (papalohe wires) where fromUri === uri
 *   2. Tiddler `verb` field — fires verb dispatch when the tiddler carries
 *      a direct `verb` field (the verb-as-tiddler-field architecture).
 *      `listenable` field names the Verse event; defaults to verb name if absent.
 *
 * Verb-carrying events: { uri, listenable, verb, fromUri }.
 * Listenable-only events (no verb): { uri, listenable } — observation only.
 */
function fireReactionsForUri(wiki: TW5Wiki, graph: ReactionGraph, uri: string): void {
  // listenable → verb? (undefined = observation-only)
  const listenables = new Map<string, string | undefined>();

  for (const b of graph.bindings) {
    if (b.fromUri === uri) listenables.set(b.listenable, undefined);
  }

  // Verb dispatch: read verb + listenable directly from tiddler fields.
  const tiddler = wiki.getTiddler(uri);
  if (tiddler) {
    const verb = typeof tiddler.fields["verb"] === "string" && tiddler.fields["verb"]
      ? (tiddler.fields["verb"] as string) : undefined;
    if (verb) {
      const listenable = typeof tiddler.fields["listenable"] === "string" && tiddler.fields["listenable"]
        ? (tiddler.fields["listenable"] as string) : verb;
      listenables.set(listenable, verb);
    }
  }

  for (const [listenable, verb] of listenables) {
    wiki.dispatchEvent("tm-verse-event", {
      uri,
      listenable,
      ...(verb !== undefined && { verb, fromUri: uri }),
    });
  }
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

export function startup(): void {
  const wiki = $tw?.wiki;
  if (!wiki) return;

  const graph = new ReactionGraph();
  _graph = graph;

  // Boot scan — extract papalohe bindings from all lar: tiddlers currently loaded.
  const uris = wiki.filterTiddlers("[prefix[lar:]]");
  for (const uri of uris) {
    const bindings = bindingsFromUri(wiki, uri);
    if (bindings.length > 0) graph.updateUri(uri, bindings);
  }

  // Nalu hook — fires after TW5 coalesces a batch of addTiddler() calls.
  wiki.addEventListener("change", (changedTiddlers) => {
    for (const uri of Object.keys(changedTiddlers)) {
      if (!uri.startsWith("lar:")) continue;

      if (!wiki.getTiddler(uri)) {
        graph.removeUri(uri);
      } else {
        const bindings = bindingsFromUri(wiki, uri);
        if (bindings.length > 0) graph.updateUri(uri, bindings);
        else graph.removeUri(uri);
      }

      fireReactionsForUri(wiki, graph, uri);
    }
  });
}

// ---------------------------------------------------------------------------
// Graph accessor — for tests and island bridge integration
// ---------------------------------------------------------------------------

/** Returns the active ReactionGraph after startup(), or null before boot. */
export function getReactionGraph(): ReactionGraph | null {
  return _graph;
}
