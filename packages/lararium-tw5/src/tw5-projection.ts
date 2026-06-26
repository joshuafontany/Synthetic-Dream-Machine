/**
 * tw5-projection — the projection-nalu, render-side twin of the capture-nalu.
 *
 * The BROWSER twin of the node disk projector (island-behaviors.ts `onBoot`): same
 * `makeWikiBehavior({ onBoot })` capability seam, same render-then-emit shape — node emits
 * rendered state TO FS, the browser emits it TO THE MAIN THREAD. role = capability ≠ platform.
 *
 * The island's TW5 engine lives in the Worker (§9), so the cameras live here: render the story
 * river + page stylesheet into `$tw.fakeDocument`, serialize to HTML+CSS, and emit COALESCED
 * `projection:frame` events. The main thread applies each frame to a shadow root. First beat is
 * READ-ONLY: widget handlers stay in the worker on the fake DOM (handlers can't cross postMessage),
 * so the projected HTML is inert — interactivity (the worker-dom event round-trip) is the deferred
 * twin-half. The nalu is COALESCE-to-latest (newest snapshot supersedes; a burst of wiki changes
 * collapses to one post), not the capture-nalu's accumulate-every-record.
 *
 * Isomorphic: uses only `$tw.fakeDocument` (no window.document) — safe in @lararium/tw5.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/tw5-projection
 */

import type { IslandContext } from "./island-context.js";
import { mountCamera } from "./tw5-camera.js";
import { tw5ElementToHtml } from "./fake-dom.js";
import { CoalesceGate } from "@lararium/mesh";

/** The `IslandMsg_Event.listenable` discriminator for a rendered projection frame. */
export const PROJECTION_FRAME = "projection:frame";

/** Coalesce window (ms): a burst of wiki "change" events collapses to one posted frame. Small
 *  (one display frame-ish) — interactive display, not the capture-nalu's 2 s recall budget. */
const COALESCE_MS = 24;

/**
 * Mount the projection on a live wiki island. Returns a teardown (the `onBoot` contract).
 */
export function mountProjection(ctx: IslandContext): () => void {
  // Widen the booted $tw for the loose internal TW5 surface (fakeDocument, Tiddler) the typed
  // engine facade does not expose — the same loose-access the cameras take.
  const tw = ctx.tw5.$tw as unknown as Record<string, any>;
  const fakeDoc = tw.fakeDocument;
  // ($:/SiteTitle "Lararium" + $:/SiteSubtitle "Welcome to the DreamNet" ride the lares plugin
  //  blob as source tiddlers — tiddlers/site-{title,subtitle}.tid — CID-carried, ratchet via
  //  re-genesis, user-overridable (a plugin shadow loaded after $:/core, overridden by ordinary).)

  // Story camera — the default TW5 view frustum, rendered into the fake DOM. mountCamera owns
  // the live `change → widget.refresh()` loop; we re-snapshot on the same change beat.
  const storyContainer = fakeDoc.createElement("div");
  const stopStory = mountCamera(ctx.tw5, {
    rootTiddler: "$:/core/ui/RootTemplate",
    document:    fakeDoc,
    container:   storyContainer,
  });

  // Stylesheet camera — PageStylesheet → a fake <style>; we read its textContent. (The fakeDocument
  // half of mountPanel; the shadow-root half lives main-side.)
  const styleWidget = tw.wiki.makeTranscludeWidget("$:/core/ui/PageStylesheet", {
    document:     fakeDoc,
    parentWidget: tw.rootWidget,
  });
  const styleContainer = fakeDoc.createElement("style");
  styleWidget.render(styleContainer, null);

  // Coalesce-family gate (mesh/projection-nalu): a burst of wiki changes collapses to one frame;
  // the newest snapshot wins, intermediates fade (the decay-envelope). The flush snapshots the
  // live fakeDOM lazily at the crest — `mark()` only says "the source moved".
  const gate = new CoalesceGate({
    windowMs: COALESCE_MS,
    onFlush: (rev) => {
      ctx.post({
        schema_version: 1,
        type:           "event",
        wikiUri:        ctx.wikiUri,
        listenable:     PROJECTION_FRAME,
        payload: {
          html: tw5ElementToHtml(storyContainer),
          css:  styleContainer.textContent ?? "",
          rev,
        },
      });
    },
  });

  const onChange = (changes: Record<string, unknown>): void => {
    styleWidget.refresh(changes, styleContainer, null);
    gate.mark();
  };
  tw.wiki.addEventListener("change", onChange);

  // First frame — the island's content the moment it breathes.
  gate.mark();

  return () => {
    gate.dispose();
    tw.wiki.removeEventListener("change", onChange);
    stopStory();
  };
}
