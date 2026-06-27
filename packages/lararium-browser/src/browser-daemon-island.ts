/**
 * browser-admin-island — browser Web Worker entry point for the admin island.
 *
 * Sovereign admin island AND the operator's authn/z home (isomorphic-vessel
 * Stage 1). Composition only: the browser sovereign kernel + the shared
 * keyhive-wired admin behavior (makeOperatorAdminBehavior, @lararium/keyhive) —
 * byte-identical wiring to the node admin entry, which is why it lives once in
 * keyhive. This file picks only the platform kernel.
 *
 * Island Sovereignty Law §9: TW5 boots here, inside a sovereign Worker.
 * DOM types do not appear in this file (BA-1). `self` is the sole platform surface.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-admin-island
 */

import { runBrowserSovereignWorker } from "./browser-sovereign-island-model.js";
import { makeOperatorAdminBehavior } from "@lararium/keyhive/operator-admin-behavior";

runBrowserSovereignWorker(makeOperatorAdminBehavior);
