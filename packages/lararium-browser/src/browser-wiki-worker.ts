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
 * Meme: lar:///ha.ka.ba/@lararium/browser/browser-wiki-worker
 */

import { runBrowserSovereignWorker } from "./browser-sovereign-island-model.js";
import { makeWikiBehavior, mountProjection } from "@lararium/tw5";

// onBoot = the projection-nalu, the browser twin of node's disk projector: the island renders
// its story river into $tw.fakeDocument and emits `projection:frame` events to the main thread.
runBrowserSovereignWorker(makeWikiBehavior({ onBoot: (ctx) => mountProjection(ctx) }));
