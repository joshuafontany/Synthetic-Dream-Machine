/**
 * node-wiki-island — Node.js primary wiki island entry point.
 *
 * Sovereign wiki island. Runs the sovereign-island-model lifecycle with
 * makeWikiPrimaryBehavior: disk projection (from manifest.diskMirrors) +
 * inline wiki:place-verb dispatch (sync-wiki, residency ACTION verbs).
 *
 * Recipe expansion (top wins; assembled by buildIslandRecipe) — per-wiki live
 * layers above, canon + libraries + floor below:
 *   wikis/@{slug}/temp     (volatile per-island)
 *   wikis/@{slug}/draft    (CRDT, drafts)
 *   wikis/@{slug}/personal (CRDT, cross-device view state)
 *   wikis/@{slug}/working  (CRDT, operator's saved edits route here)
 *   bags/@{slug}           (CRDT, the wiki's canon; read-only, promotion target)
 *   libraryBags            (CRDT, optional content libraries: @lararium + @lares)
 *   @oracle                (CRDT, engine core + plugins — the universal floor)
 *
 * Write routing happens via the in-wiki bag-paths cascade.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/node-wiki-island
 */

import { runSovereignWorker }      from "./sovereign-island-model.js";
import { makeWikiPrimaryBehavior } from "./island-behaviors.js";

runSovereignWorker((manifest) => makeWikiPrimaryBehavior(manifest));
