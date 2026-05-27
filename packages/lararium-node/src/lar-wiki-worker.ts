/**
 * lar-wiki-worker — Node.js primary wiki Worker entry point.
 *
 * Sovereign wiki island. Runs the sovereign-worker-model lifecycle with
 * makeWikiPrimaryBehavior: disk projection (from manifest.diskMirrors) +
 * inline wiki:place-job dispatch (promote, sync-wiki).
 *
 * Recipe (auto-assembled by sovereign-worker-model):
 *   bagBindings CRDT bags (recipe order)
 *   └── scratch MemoryTiddlerStore  (defaultWritable:true)   ← local VM only
 *   └── projection MemoryTiddlerStore (defaultWritable:false) ← $:/state/*
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/lar-wiki-worker
 */

import { runSovereignWorker }      from "./sovereign-worker-model.js";
import { makeWikiPrimaryBehavior } from "./worker-behaviors.js";

runSovereignWorker((manifest) => makeWikiPrimaryBehavior(manifest));
