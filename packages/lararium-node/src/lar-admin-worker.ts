/**
 * lar-admin-worker — Node.js admin Worker entry point.
 *
 * Sovereign admin island. Runs the shared sovereign-worker-model lifecycle
 * with AdminBehavior: full recipe, JobDispatcher on TW5 wiki change events
 * (the kumu device / Reaction Engine surface), relay protocol for wiki-scope
 * verbs, TW5 saves write back to the admin CRDT bag.
 *
 * Recipe (auto-assembled by sovereign-worker-model):
 *   @lararium CRDT (read-only)
 *   @lares    CRDT (read-only)
 *   @admin    CRDT (writable)    ← IslandAdaptor write target
 *   └── scratch MemoryTiddlerStore  (defaultWritable:true)   ← job staging
 *   └── projection MemoryTiddlerStore (defaultWritable:false) ← $:/state/*
 *
 * JobDispatcher subscribes to TW5 wiki change events — the kumu device law.
 * Wiki-scope verbs relay to main thread via AdminMsg_RelayJob / JobResult.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/lar-admin-worker
 */

import { runSovereignWorker } from "./sovereign-worker-model.js";
import { makeAdminBehavior }  from "./worker-behaviors.js";

runSovereignWorker(makeAdminBehavior());
