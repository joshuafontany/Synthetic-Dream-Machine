/**
 * lar-admin-island — Node.js admin island entry point.
 *
 * Sovereign admin island. Runs the shared sovereign-island-model lifecycle
 * with AdminBehavior: full WikiRecipe, VerbDispatcher on TW5 wiki change events
 * (the kumu device / Reaction Engine surface), relay protocol for wiki-scope
 * verbs. Write routing happens via the in-wiki bag-paths cascade.
 *
 * Recipe expansion (top wins; assembled by buildIslandRecipe):
 *   lar:///ha.ka.ba/@temp     (volatile, $:/temp/* lands here)
 *   lar:///ha.ka.ba/@draft    (CRDT, Draft of … tiddlers)
 *   lar:///ha.ka.ba/@admin    (CRDT, wiki identity)
 *   lar:///ha.ka.ba/@lares    (CRDT, personality)
 *   lar:///ha.ka.ba/@lararium (CRDT, system / engine core)
 *
 * VerbDispatcher subscribes to TW5 wiki change events — the kumu device law.
 * Wiki-scope verbs delegate to vessel via AdminMsg_DelegateVerb / VerbResult.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/lar-admin-island
 */

import { runSovereignWorker } from "./sovereign-island-model.js";
import { makeAdminBehavior }  from "@lararium/tw5";

runSovereignWorker(makeAdminBehavior());
