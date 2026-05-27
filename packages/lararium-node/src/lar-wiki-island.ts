/**
 * lar-wiki-island — Node.js primary wiki island entry point.
 *
 * Sovereign wiki island. Runs the sovereign-island-model lifecycle with
 * makeWikiPrimaryBehavior: disk projection (from manifest.diskMirrors) +
 * inline wiki:place-job dispatch (promote, sync-wiki).
 *
 * Recipe (auto-assembled by sovereign-island-model):
 *   bagBindings CRDT bags (recipe order)
 *   └── scratch MemoryTiddlerStore  (defaultWritable:true)   ← local VM only
 *   └── projection MemoryTiddlerStore (defaultWritable:false) ← $:/state/*
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/lar-wiki-island
 */

import { runSovereignWorker }      from "./sovereign-island-model.js";
import { makeWikiPrimaryBehavior } from "./island-behaviors.js";

runSovereignWorker((manifest) => makeWikiPrimaryBehavior(manifest));
