/**
 * lar-wiki-worker — Node.js wiki Worker entry point.
 *
 * Sovereign wiki island. Runs the shared sovereign-worker-model lifecycle
 * with WikiBehavior: read-dominant, TW5 session saves land in scratch,
 * no JobDispatcher, no relay protocol.
 *
 * Recipe (auto-assembled by sovereign-worker-model):
 *   bagBindings CRDT bags (recipe order, read-only)
 *   └── scratch MemoryTiddlerStore  (defaultWritable:true)   ← local VM only
 *   └── projection MemoryTiddlerStore (defaultWritable:false) ← $:/state/*
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/lar-wiki-worker
 */

import { runSovereignWorker } from "./sovereign-worker-model.js";
import { WikiBehavior }       from "./worker-behaviors.js";

runSovereignWorker(WikiBehavior);
