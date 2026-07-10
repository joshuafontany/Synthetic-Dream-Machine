/**
 * browser-wiki-worker — browser Web Worker entry point for wiki authorities.
 *
 * Composition only: the browser sovereign kernel + the shared, isomorphic
 * makeWikiBehavior (@lararium/tw5) — the SAME behavior the node wiki island runs
 * (ACTION verb registry + wiki:place-verb dispatch). The browser supplies no
 * onBoot capability; disk projection is a node-held capability (fs), absent here
 * by composition, not by a fork. The former browser-only stub (onSignal → false)
 * is gone — the browser now inherits the full dispatch path.
 *
 * DOM types do not appear in this file (BA-1). `self` is the sole platform surface.
 *
 * (Filename kept as browser-wiki-worker for the app's external spawn URL; the
 * browser-wiki-island suffix-rename awaits app-side coordination.)
 *
 * Meme: lar:///ha.ka.ba/lararium/browser/browser-wiki-worker
 */

import { runBrowserSovereignWorker } from "./browser-sovereign-island-model.js";
import { makeWikiBehavior, mountProjection, mountCoherenceProjection, hasWikiSensorium } from "@lararium/tw5";

// onBoot = TWO projection-nalus over the one island (both the browser twin of a node projector):
//   1. mountProjection    — renders the story river into $tw.fakeDocument, emits `projection:frame`.
//   2. mountCoherenceProjection — reads the wiki's OWN consistency radius, emits `coherence:frame`.
// Both coalesce on the same wikistore change beat; the teardown tears them down LIFO.
// caps = the wiki-sensorium perceiver cap — the wiki island answers the daemon's supervision reads
// (sensorium:cohere/recall signals in, SENSORIUM_FRAME events back) over its OWN composite.
runBrowserSovereignWorker(makeWikiBehavior({
  onBoot: (ctx) => {
    const stopRender = mountProjection(ctx);
    const stopCoherence = mountCoherenceProjection(ctx);
    return () => { stopCoherence(); stopRender(); };
  },
  caps: [hasWikiSensorium()],
}));
