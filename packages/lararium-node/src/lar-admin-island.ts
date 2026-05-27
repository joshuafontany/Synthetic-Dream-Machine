/**
 * lar-admin-island — Node.js admin Worker entry point.
 *
 * Sovereign admin island. Runs the shared sovereign-island-model lifecycle
 * with AdminBehavior: full recipe, JobDispatcher on TW5 wiki change events
 * (the kumu device / Reaction Engine surface), relay protocol for wiki-scope
 * verbs, TW5 saves write back to the admin CRDT bag.
 *
 * Recipe (auto-assembled by sovereign-island-model):
 *   @lararium CRDT (read-only)
 *   @lares    CRDT (read-only)
 *   @admin    CRDT (writable)    ← IslandAdaptor write target
 *   └── scratch MemoryTiddlerStore  (defaultWritable:true)   ← job staging
 *   └── projection MemoryTiddlerStore (defaultWritable:false) ← $:/state/*
 *
 * JobDispatcher subscribes to TW5 wiki change events — the kumu device law.
 * Wiki-scope verbs delegate to main thread via AdminMsg_DelegateJob / JobResult.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/lar-admin-island
 */

import { runSovereignWorker } from "./sovereign-island-model.js";
import { makeAdminBehavior }  from "./island-behaviors.js";

runSovereignWorker(makeAdminBehavior());
