/**
 * node-daemon-island — Node.js admin island entry point.
 *
 * Sovereign admin island AND the operator's authn/z home (isomorphic-vessel
 * Stage 1). Composition only: the node sovereign kernel + the shared
 * keyhive-wired admin behavior (makeOperatorDaemonBehavior, @lararium/keyhive).
 * The keyhive wiring is identical on browser — it lives once in keyhive; this
 * file picks only the platform kernel.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/node-daemon-island
 */

import { runSovereignWorker } from "./sovereign-island-model.js";
import { makeOperatorDaemonBehavior } from "@lararium/keyhive/operator-daemon-behavior";

runSovereignWorker(makeOperatorDaemonBehavior);
