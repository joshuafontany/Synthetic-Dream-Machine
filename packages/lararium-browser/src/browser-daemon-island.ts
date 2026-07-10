/**
 * browser-daemon-island — browser Web Worker entry point for the daemon island.
 *
 * Sovereign daemon island AND the operator's authn/z home (isomorphic-vessel
 * Stage 1). Composition only: the browser sovereign kernel + the shared
 * keyhive-wired daemon behavior (makeOperatorDaemonBehavior, @lararium/keyhive) —
 * byte-identical wiring to the node daemon entry, which is why it lives once in
 * keyhive. This file picks only the platform kernel.
 *
 * Island Sovereignty Law §9: TW5 boots here, inside a sovereign Worker.
 * DOM types do not appear in this file (BA-1). `self` is the sole platform surface.
 *
 * Meme: lar:///ha.ka.ba/lararium/browser/browser-daemon-island
 */

import { runBrowserSovereignWorker } from "./browser-sovereign-island-model.js";
import { makeOperatorDaemonBehavior } from "@lararium/keyhive/operator-daemon-behavior";

runBrowserSovereignWorker(makeOperatorDaemonBehavior);
