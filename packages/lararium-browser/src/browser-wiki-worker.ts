/**
 * browser-wiki-worker — browser Web Worker entry point for wiki authorities.
 *
 * Sovereign wiki island. Runs the shared browser-sovereign-island-model
 * lifecycle with BrowserWikiBehavior: read-dominant, TW5 session saves
 * land in scratch, no JobDispatcher, no relay protocol.
 *
 * Recipe (auto-assembled by browser-sovereign-island-model):
 *   bagBindings CRDT bags (recipe order, read-only)
 *   └── scratch MemoryTiddlerStore  (defaultWritable:true)   ← local VM only
 *   └── projection MemoryTiddlerStore (defaultWritable:false) ← $:/state/*
 *
 * DOM types do not appear in this file (BA-1). `self` is the sole platform surface.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-wiki-worker
 */

import { runBrowserSovereignWorker } from "./browser-sovereign-island-model.js";
import { BAG_IDS }                   from "@lararium/mesh";
import type { IslandBehavior } from "@lararium/tw5";

const BrowserWikiBehavior: IslandBehavior = {
  writeBagId: BAG_IDS.scratch,
  onEa:       () => {},
  onSignal:   () => false,
  onDemote:   () => {},
};

runBrowserSovereignWorker(BrowserWikiBehavior);
