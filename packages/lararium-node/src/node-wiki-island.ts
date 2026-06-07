/**
 * node-wiki-island — Node.js primary wiki island entry point.
 *
 * Sovereign wiki island. Runs the sovereign-island-model lifecycle with
 * makeWikiPrimaryBehavior: disk projection (from manifest.diskMirrors) +
 * inline wiki:place-verb dispatch (sync-wiki, residency ACTION verbs).
 *
 * Recipe expansion (top wins; assembled by buildIslandRecipe):
 *   lar:///ha.ka.ba/@temp        (volatile per-island)
 *   lar:///ha.ka.ba/@draft       (CRDT, drafts)
 *   lar:///ha.ka.ba/@<wikiSlug>  (CRDT, operator's edits land here by default)
 *   canon bags                   (CRDT, optional content libraries)
 *   lar:///ha.ka.ba/@lares       (CRDT, personality)
 *   lar:///ha.ka.ba/@lararium    (CRDT, system / engine core)
 *
 * Write routing happens via the in-wiki bag-paths cascade.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/node-wiki-island
 */

import { runSovereignWorker }      from "./sovereign-island-model.js";
import { makeWikiPrimaryBehavior } from "./island-behaviors.js";

runSovereignWorker((manifest) => makeWikiPrimaryBehavior(manifest));
