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
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-wiki-worker
 */

import { runBrowserSovereignWorker } from "./browser-sovereign-island-model.js";
import { makeWikiBehavior } from "@lararium/tw5";

runBrowserSovereignWorker(makeWikiBehavior());
