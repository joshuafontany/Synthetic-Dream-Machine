/**
 * browser-wiki-worker — browser Web Worker entry point for wiki authorities.
 *
 * Sovereign wiki island. Runs the shared browser-sovereign-island-model
 * lifecycle with BrowserWikiBehavior: read-dominant, no VerbDispatcher,
 * no relay protocol. Write routing flows through the in-wiki bag-paths
 * cascade (operator-configurable).
 *
 * Recipe expansion follows the canonical WikiRecipe shape — see
 * browser-sovereign-island-model.ts for the slot table.
 *
 * DOM types do not appear in this file (BA-1). `self` is the sole platform surface.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-wiki-worker
 */

import { runBrowserSovereignWorker } from "./browser-sovereign-island-model.js";
import type { IslandBehavior } from "@lararium/tw5";

const BrowserWikiBehavior: IslandBehavior = {
  onEa:       () => {},
  onSignal:   () => false,
  onDemote:   () => {},
};

runBrowserSovereignWorker(BrowserWikiBehavior);
