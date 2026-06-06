/**
 * lar-admin-island — Node.js admin island entry point.
 *
 * Sovereign admin island AND the operator's authn/z home (isomorphic-vessel
 * Stage 1). Composition only: the node sovereign kernel + the shared
 * keyhive-wired admin behavior (makeOperatorAdminBehavior, @lararium/keyhive).
 * The keyhive wiring is identical on browser — it lives once in keyhive; this
 * file picks only the platform kernel.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/lar-admin-island
 */

import { runSovereignWorker } from "./sovereign-island-model.js";
import { makeOperatorAdminBehavior } from "@lararium/keyhive/operator-admin-behavior";

runSovereignWorker(makeOperatorAdminBehavior);
